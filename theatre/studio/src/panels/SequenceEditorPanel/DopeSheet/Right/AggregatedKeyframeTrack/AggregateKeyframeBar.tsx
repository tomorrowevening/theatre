import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val, pointerToPrism} from '@tomorrowevening/theatre-dataverse'
import React, {useMemo} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {
  SequenceEditorTree_PropWithChildren,
  SequenceEditorTree_Sheet,
  SequenceEditorTree_SheetObject,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {AggregatedKeyframes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'
import useRefAndState from '@tomorrowevening/theatre-studio/utils/useRefAndState'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import {useCssCursorLock} from '@tomorrowevening/theatre-studio/uiComponents/PointerEventsHandler'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {useLockFrameStampPositionRef} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/FrameStampPositionProvider'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import useContextMenu from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import type {IContextMenuItem} from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import {pointerEventsAutoInNormalMode} from '@tomorrowevening/theatre-studio/css'
import randomColor from '@tomorrowevening/theatre-studio/utils/randomColor'
import {pasteKeyframesAtCurrent, copyKeyframes} from './utils'

const BarContainer = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
`

const Bar = styled.div<{$color: string}>`
  position: absolute;
  height: 20px;
  background: ${(props) => props.$color};
  cursor: ew-resize;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 2px;
  z-index: 2;
  ${pointerEventsAutoInNormalMode}

  &:hover {
    opacity: 0.8;
  }
`

const Handle = styled.div<{$position: 'left' | 'right'}>`
  position: absolute;
  height: 20px;
  width: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: block;
  z-index: 3;
  ${pointerEventsAutoInNormalMode}

  &:before {
    position: absolute;
    display: block;
    content: ' ';
    background: inherit;
    border-radius: ${(props) =>
      props.$position === 'left' ? '2px 0 0 2px' : '0 2px 2px 0'};
    width: 7px;
    height: 20px;
  }

  &:after {
    position: absolute;
    display: block;
    content: ' ';
    width: 15px;
    height: 28px;
    top: 50%;
    transform: translateY(-50%);
    ${(props) =>
      props.$position === 'left'
        ? 'left: -8px; cursor: w-resize;'
        : 'right: -8px; cursor: e-resize;'}
  }

  &:hover:before {
    opacity: 0.8;
  }
`

const LeftHandle = styled(Handle)`
  left: calc(-1 * 7px);
`

const RightHandle = styled(Handle)`
  right: 0px;
`

const ColorPickerOverlay = styled.div`
  position: absolute;
  background: #333;
  border-radius: 4px;
  padding: 4px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

const ColorInputField = styled.input`
  background: #222;
  width: 50px;
  height: 30px;
  border: 1px solid #666;
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  &::-webkit-color-swatch {
    border: 1px solid #999;
    border-radius: 2px;
  }
`

const HexColorInput = styled.input`
  background: #222;
  border: 1px solid #666;
  color: #fff;
  width: 70px;
  height: 28px;
  padding: 4px;
  border-radius: 2px;
  font-family: monospace;
  font-size: 12px;

  &:focus {
    outline: none;
    border-color: #40aaa4;
  }
`

// Helper to detect which handle is being dragged
function getHandleBeingDragged(
  target: HTMLElement | null,
): 'left' | 'right' | null {
  if (!target) return null
  const handle = target.closest('[data-handle]')
  if (!handle) return null
  return (handle.getAttribute('data-handle') as 'left' | 'right') || null
}

type IAggregateKeyframeBarProps = {
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet
  aggregatedKeyframes: AggregatedKeyframes
  layoutP: Pointer<SequenceEditorPanelLayout>
}

/**
 * Generate a storage key for the custom color of an aggregate keyframe
 */
function getColorStorageKey(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet,
): string {
  if (viewModel.type === 'sheet') {
    return `theatre-agg-keyframe-color-sheet-${viewModel.sheet.address.sheetId}`
  } else if (viewModel.type === 'sheetObject') {
    return `theatre-agg-keyframe-color-object-${viewModel.sheetObject.address.objectKey}`
  } else {
    const pathStr = viewModel.pathToProp.join('.')
    return `theatre-agg-keyframe-color-prop-${viewModel.sheetObject.address.objectKey}-${pathStr}`
  }
}

/**
 * Get the color for an aggregate keyframe, using custom color if stored
 */
function getAggregateKeyframeColor(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet,
): string {
  const storageKey = getColorStorageKey(viewModel)
  const storedColor = localStorage.getItem(storageKey)
  if (storedColor) return storedColor
  const color = randomColor()
  localStorage.setItem(storageKey, color)
  return color
}

/**
 * Set a custom color for an aggregate keyframe
 */
function setAggregateKeyframeColor(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet,
  color: string,
): void {
  const storageKey = getColorStorageKey(viewModel)
  localStorage.setItem(storageKey, color)
}

/**
 * Reset custom color for an aggregate keyframe
 */
function resetAggregateKeyframeColor(
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet,
): void {
  const storageKey = getColorStorageKey(viewModel)
  localStorage.removeItem(storageKey)
}

function AggregateKeyframeBar_memo(props: IAggregateKeyframeBarProps) {
  const {layoutP, aggregatedKeyframes, viewModel} = props
  const [containerRef, containerNode] = useRefAndState<HTMLDivElement | null>(
    null,
  )
  const colorInputRef = React.useRef<HTMLInputElement>(null)
  const [color, setColor] = React.useState(() =>
    getAggregateKeyframeColor(viewModel),
  )
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [colorPickerPos, setColorPickerPos] = React.useState({top: 0, left: 0})

  // Get first and last keyframe positions
  const keyframeRange = useMemo(() => {
    const positions = Array.from(aggregatedKeyframes.byPosition.keys())
    if (positions.length === 0) return null
    return {
      first: Math.min(...positions),
      last: Math.max(...positions),
    }
  }, [aggregatedKeyframes])

  const [contextMenu] = useContextMenu(containerNode, {
    displayName: 'Aggregate Keyframe',
    menuItems: (): IContextMenuItem[] => {
      const selectionKeyframes =
        pointerToPrism(
          getStudio()!.atomP.ahistoric.clipboard.keyframesWithRelativePaths,
        ).getValue() ?? []

      return [
        {
          label: 'Copy Keyframes',
          callback: () => {
            copyKeyframes(viewModel, aggregatedKeyframes)
          },
        },
        {
          label: 'Paste Keyframes',
          enabled: selectionKeyframes.length > 0,
          callback: () => {
            pasteKeyframesAtCurrent(viewModel, layoutP, selectionKeyframes)
          },
        },
        {
          label: 'Custom Color',
          callback: () => {
            setShowColorPicker(true)
            if (containerNode) {
              const rect = containerNode.getBoundingClientRect()
              setColorPickerPos({
                top: Math.max(10, rect.top),
                left: Math.max(10, rect.left),
              })
            }
          },
        },
        {
          label: 'Delete',
          callback: () => {
            getStudio().transaction(({stateEditors}) => {
              for (const track of aggregatedKeyframes.tracks) {
                const keyframeIdsToDelete = track.data.keyframes
                  .filter(
                    (kf) =>
                      kf.position >= keyframeRange!.first &&
                      kf.position <= keyframeRange!.last,
                  )
                  .map((kf) => kf.id)

                if (keyframeIdsToDelete.length > 0) {
                  stateEditors.coreByProject.historic.sheetsById.sequence.deleteKeyframes(
                    {
                      ...track.sheetObject.address,
                      keyframeIds: keyframeIdsToDelete,
                      trackId: track.id,
                    },
                  )
                }
              }
            })
          },
        },
      ]
    },
  })

  const frameStampLock = useLockFrameStampPositionRef()

  const useDragOpts = useMemo(() => {
    return {
      debugName: 'AggregateKeyframeBar/useDrag',
      onDragStart: (event: MouseEvent) => {
        if (!keyframeRange) return false

        const target = event.target as HTMLElement
        const draggedHandle = getHandleBeingDragged(target)
        const isDraggingHandle = draggedHandle !== null

        frameStampLock(true, keyframeRange.first)

        const address =
          viewModel.type === 'sheet'
            ? viewModel.sheet.address
            : viewModel.sheetObject.address

        const toUnitSpace = val(layoutP.scaledSpace.toUnitSpace)
        let tempTransaction: CommitOrDiscard | undefined

        return {
          onDrag(dx: number, dy: number, dragEvent: MouseEvent) {
            const deltaPos = toUnitSpace(dx)
            const newPos = Math.max(0, keyframeRange.first + deltaPos)

            if (isDraggingHandle) {
              // Handle drag: scale keyframes
              const draggedFromLeft = draggedHandle === 'left'
              // When dragging left: left edge moves, right is fixed
              // When dragging right: right edge moves, left is fixed
              const anchorStart = draggedFromLeft
                ? keyframeRange.first
                : keyframeRange.first
              const anchorEnd = draggedFromLeft
                ? keyframeRange.last
                : keyframeRange.last
              const movingEdge = draggedFromLeft
                ? keyframeRange.first
                : keyframeRange.last
              const newMovingEdge = Math.max(0, movingEdge + deltaPos)

              if (draggedFromLeft && newMovingEdge >= anchorEnd) return // prevent crossing
              if (!draggedFromLeft && newMovingEdge <= anchorStart) return // prevent crossing

              const oldRange = anchorEnd - anchorStart
              const newRange = Math.abs(
                newMovingEdge - (draggedFromLeft ? anchorEnd : anchorStart),
              )

              if (oldRange === 0 || newRange === 0) return

              tempTransaction?.discard()
              tempTransaction = getStudio().tempTransaction(
                ({stateEditors}) => {
                  // Get all keyframes from all tracks in this aggregate
                  for (const track of aggregatedKeyframes.tracks) {
                    const keyframesToUpdate = []

                    for (const kf of track.data.keyframes) {
                      if (
                        kf.position >= Math.min(anchorStart, anchorEnd) &&
                        kf.position <= Math.max(anchorStart, anchorEnd)
                      ) {
                        // Calculate relative position (0 to 1) from the anchor
                        const relativePos =
                          (kf.position - anchorStart) / oldRange
                        // Calculate new position based on new range
                        const newKeyframePos = draggedFromLeft
                          ? newMovingEdge + relativePos * newRange
                          : anchorStart + relativePos * newRange
                        keyframesToUpdate.push({
                          ...kf,
                          position: newKeyframePos,
                        })
                      }
                    }

                    if (keyframesToUpdate.length > 0) {
                      stateEditors.coreByProject.historic.sheetsById.sequence.replaceKeyframes(
                        {
                          ...track.sheetObject.address,
                          trackId: track.id,
                          keyframes: keyframesToUpdate,
                          snappingFunction: val(layoutP.sheet).getSequence()
                            .closestGridPosition,
                        },
                      )
                    }
                  }
                },
              )
            } else {
              // Middle drag: move all keyframes together
              tempTransaction?.discard()
              tempTransaction = getStudio().tempTransaction(
                ({stateEditors}) => {
                  for (const track of aggregatedKeyframes.tracks) {
                    const keyframesToUpdate = []

                    for (const kf of track.data.keyframes) {
                      if (
                        kf.position >= keyframeRange.first &&
                        kf.position <= keyframeRange.last
                      ) {
                        keyframesToUpdate.push({
                          ...kf,
                          position: Math.max(0, kf.position + deltaPos),
                        })
                      }
                    }

                    if (keyframesToUpdate.length > 0) {
                      stateEditors.coreByProject.historic.sheetsById.sequence.replaceKeyframes(
                        {
                          ...track.sheetObject.address,
                          trackId: track.id,
                          keyframes: keyframesToUpdate,
                          snappingFunction: val(layoutP.sheet).getSequence()
                            .closestGridPosition,
                        },
                      )
                    }
                  }
                },
              )
            }

            frameStampLock(true, newPos)
          },
          onDragEnd(dragHappened: boolean) {
            frameStampLock(false, -1)
            if (dragHappened) {
              tempTransaction?.commit()
            } else {
              tempTransaction?.discard()
            }
          },
        }
      },
    }
  }, [keyframeRange, aggregatedKeyframes, layoutP, viewModel, frameStampLock])

  const [isDragging] = useDrag(containerNode, useDragOpts)

  useCssCursorLock(isDragging, 'draggingPositionInSequenceEditor', 'ew-resize')

  if (!keyframeRange) {
    return <BarContainer ref={containerRef} />
  }

  const leftPadding = val(layoutP.scaledSpace.leftPadding)

  const barLeftPx = `calc(${leftPadding}px + calc(var(--unitSpaceToScaledSpaceMultiplier) * ${keyframeRange.first}px))`
  const barWidthPx = `calc(var(--unitSpaceToScaledSpaceMultiplier) * ${
    keyframeRange.last - keyframeRange.first
  }px)`

  return (
    <BarContainer ref={containerRef}>
      <Bar $color={color} style={{left: barLeftPx, width: barWidthPx}}>
        <LeftHandle $position="left" data-handle="left" />
        <RightHandle
          $position="right"
          style={{left: `calc(100% - 7px)`}}
          data-handle="right"
        />
      </Bar>
      {showColorPicker && (
        <ColorPickerOverlay
          style={{
            position: 'fixed',
            top: `${colorPickerPos.top}px`,
            left: `${colorPickerPos.left}px`,
          }}
        >
          <ColorInputField
            ref={colorInputRef}
            type="color"
            value={color}
            onChange={(e) => {
              const newColor = e.currentTarget.value
              setColor(newColor)
              setAggregateKeyframeColor(viewModel, newColor)
            }}
            autoFocus
          />
          <HexColorInput
            type="text"
            placeholder="#000000"
            value={color}
            onChange={(e) => {
              let hexValue = e.currentTarget.value
              if (!hexValue.startsWith('#')) {
                hexValue = '#' + hexValue
              }
              if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
                setColor(hexValue)
                setAggregateKeyframeColor(viewModel, hexValue)
              }
            }}
          />
          <button
            onClick={() => setShowColorPicker(false)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              border: '1px solid #666',
              borderRadius: '2px',
              background: '#222',
              color: '#FFF',
              height: '28px',
            }}
          >
            Done
          </button>
        </ColorPickerOverlay>
      )}
      {contextMenu}
    </BarContainer>
  )
}

const AggregateKeyframeBar = React.memo(AggregateKeyframeBar_memo)
export default AggregateKeyframeBar
