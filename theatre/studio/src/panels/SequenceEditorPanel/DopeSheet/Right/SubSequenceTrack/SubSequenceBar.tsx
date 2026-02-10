import type {SequenceEditorTree_SubSequence} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import type {SequenceSubSequenceId} from '@tomorrowevening/theatre-shared/utils/ids'
import React, {useMemo, useState} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {useLockFrameStampPositionRef} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/FrameStampPositionProvider'
import {useCssCursorLock} from '@tomorrowevening/theatre-studio/uiComponents/PointerEventsHandler'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import useContextMenu from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import type {IContextMenuItem} from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import usePopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/BasicPopover'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import useRefAndState from '@tomorrowevening/theatre-studio/utils/useRefAndState'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import {pointerEventsAutoInNormalMode} from '@tomorrowevening/theatre-studio/css'
import DopeSnap from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/RightOverlay/DopeSnap'
import {lockedCursorCssVarName} from '@tomorrowevening/theatre-studio/uiComponents/PointerEventsHandler'
import SnapCursor from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/RightOverlay/SnapCursor.svg'
import randomColor from '@tomorrowevening/theatre-studio/utils/randomColor'

// Helper functions for color storage
function getColorStorageKey(leaf: SequenceEditorTree_SubSequence): string {
  return `theatre-subsequence-color-${leaf.sheet.address.projectId}-${leaf.sheet.address.sheetId}-${leaf.subSequence.id}`
}

function getSubSequenceColor(leaf: SequenceEditorTree_SubSequence): string {
  const storageKey = getColorStorageKey(leaf)
  const storedColor = localStorage.getItem(storageKey)
  if (storedColor) return storedColor

  const generatedColor = randomColor()
  localStorage.setItem(storageKey, generatedColor)
  return generatedColor
}

function setSubSequenceColor(
  leaf: SequenceEditorTree_SubSequence,
  color: string,
): void {
  const storageKey = getColorStorageKey(leaf)
  localStorage.setItem(storageKey, color)
}

function resetSubSequenceColor(leaf: SequenceEditorTree_SubSequence): void {
  const storageKey = getColorStorageKey(leaf)
  localStorage.removeItem(storageKey)
}

const BarContainer = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
  min-width: 20px;
`

const Bar = styled.div.attrs((props: {$color: string}) => ({
  style: {
    background: props.$color,
  },
}))<{$color: string}>`
  position: absolute;
  height: 20px;
  line-height: 20px;
  cursor: ew-resize;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 2px;
  text-align: center;
  width: 100%;
  z-index: 2;
  ${pointerEventsAutoInNormalMode}

  &:hover {
    opacity: 0.8;
  }

  span {
    color: white;
    font-weight: bold;
    text-shadow: 0 1px rgba(0, 0, 0, 0.67);
  }
`

const Handle = styled.div<{$position: 'left' | 'right'}>`
  background: #555;
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
    background: rgba(170, 64, 64, 0.6);
  }

  // Snap cursor when dragging playhead
  #pointer-root.draggingPositionInSequenceEditor & {
    pointer-events: auto;
    cursor: var(${lockedCursorCssVarName});

    // Show snap cursor (⸢⸤⸣⸥) on hover
    &:hover:after {
      background: url(${SnapCursor}) no-repeat center center;
      background-size: 34px 34px;
    }
  }
`

const LeftHandle = styled(Handle).attrs((props: {$color: string}) => ({
  style: {
    background: props.$color,
  },
}))<{$color: string}>`
  border-right: 1px solid rgba(0, 0, 0, 0.25);
  left: -7px;
`

const RightHandle = styled(Handle).attrs((props: {$color: string}) => ({
  style: {
    background: props.$color,
  },
}))<{$color: string}>`
  border-left: 1px solid rgba(0, 0, 0, 0.25);
  right: -7px;
`

const Label = styled.div`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  user-select: none;
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

const SubSequenceBar: React.FC<{
  leaf: SequenceEditorTree_SubSequence
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  const [containerRef, containerNode] = useRefAndState<HTMLDivElement | null>(
    null,
  )
  const [barRef, barNode] = useRefAndState<HTMLDivElement | null>(null)
  const [leftHandleRef, leftHandleNode] = useRefAndState<HTMLDivElement | null>(
    null,
  )
  const [rightHandleRef, rightHandleNode] =
    useRefAndState<HTMLDivElement | null>(null)
  const colorInputRef = React.useRef<HTMLInputElement>(null)
  const [color, setColor] = useState(() => getSubSequenceColor(leaf))
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerPos, setColorPickerPos] = useState({top: 0, left: 0})

  const editLabelPopover = usePopover(
    {debugName: 'SubSequenceBar/editLabel'},
    () => {
      const currentLabel = leaf.subSequence.label
      let newLabel = currentLabel

      return (
        <BasicPopover>
          <div style={{padding: '8px'}}>
            <div style={{marginBottom: '8px', fontWeight: 'bold'}}>
              Edit Sub-sequence Label
            </div>
            <input
              type="text"
              defaultValue={currentLabel}
              onChange={(e) => {
                newLabel = e.target.value
              }}
              style={{
                width: '200px',
                padding: '4px',
                marginBottom: '8px',
              }}
              autoFocus
            />
            <div
              style={{display: 'flex', justifyContent: 'flex-end', gap: '4px'}}
            >
              <button
                onClick={() => {
                  getStudio()!.transaction(({stateEditors}) => {
                    stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                      {
                        projectId: leaf.sheet.address.projectId,
                        sheetId: leaf.sheet.address.sheetId,
                      },
                    )
                    stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                      {
                        sheetAddress: leaf.sheet.address,
                        subSequenceId: leaf.subSequence
                          .id as SequenceSubSequenceId,
                        updates: {label: newLabel},
                      },
                    )
                  })
                  editLabelPopover.close('user action')
                }}
                style={{
                  padding: '4px 12px',
                  background: '#40AAA4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </BasicPopover>
      )
    },
  )

  const editDurationPopover = usePopover(
    {debugName: 'SubSequenceBar/editDuration'},
    () => {
      const currentDuration = leaf.subSequence.duration
      let newDuration = currentDuration

      return (
        <BasicPopover>
          <div style={{padding: '8px'}}>
            <div style={{marginBottom: '8px', fontWeight: 'bold'}}>
              Edit Sub-sequence Duration
            </div>
            <input
              type="number"
              defaultValue={currentDuration}
              step={0.1}
              min={0.1}
              onChange={(e) => {
                newDuration = parseFloat(e.target.value)
              }}
              style={{
                width: '200px',
                padding: '4px',
                marginBottom: '8px',
              }}
              autoFocus
            />
            <div
              style={{display: 'flex', justifyContent: 'flex-end', gap: '4px'}}
            >
              <button
                onClick={() => {
                  if (newDuration > 0) {
                    getStudio()!.transaction(({stateEditors}) => {
                      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                        {
                          projectId: leaf.sheet.address.projectId,
                          sheetId: leaf.sheet.address.sheetId,
                        },
                      )
                      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                        {
                          sheetAddress: leaf.sheet.address,
                          subSequenceId: leaf.subSequence
                            .id as SequenceSubSequenceId,
                          updates: {duration: newDuration},
                        },
                      )
                    })
                  }
                  editDurationPopover.close('user action')
                }}
                style={{
                  padding: '4px 12px',
                  background: '#40AAA4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </BasicPopover>
      )
    },
  )

  const editTimeScalePopover = usePopover(
    {debugName: 'SubSequenceBar/editTimeScale'},
    () => {
      const currentTimeScale = leaf.subSequence.timeScale
      let newTimeScale = currentTimeScale

      return (
        <BasicPopover>
          <div style={{padding: '8px'}}>
            <div style={{marginBottom: '8px', fontWeight: 'bold'}}>
              Edit Sub-sequence Time Scale
            </div>
            <input
              type="number"
              defaultValue={currentTimeScale}
              step={0.1}
              min={0.1}
              onChange={(e) => {
                newTimeScale = parseFloat(e.target.value)
              }}
              style={{
                width: '200px',
                padding: '4px',
                marginBottom: '8px',
              }}
              autoFocus
            />
            <div
              style={{display: 'flex', justifyContent: 'flex-end', gap: '4px'}}
            >
              <button
                onClick={() => {
                  if (newTimeScale > 0) {
                    getStudio()!.transaction(({stateEditors}) => {
                      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                        {
                          projectId: leaf.sheet.address.projectId,
                          sheetId: leaf.sheet.address.sheetId,
                        },
                      )
                      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                        {
                          sheetAddress: leaf.sheet.address,
                          subSequenceId: leaf.subSequence
                            .id as SequenceSubSequenceId,
                          updates: {timeScale: newTimeScale},
                        },
                      )
                    })
                  }
                  editTimeScalePopover.close('user action')
                }}
                style={{
                  padding: '4px 12px',
                  background: '#40AAA4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </BasicPopover>
      )
    },
  )

  const editStartPopover = usePopover(
    {debugName: 'SubSequenceBar/editStart'},
    () => {
      const currentPosition = leaf.subSequence.position
      let newPosition = currentPosition

      return (
        <BasicPopover>
          <div style={{padding: '8px'}}>
            <div style={{marginBottom: '8px', fontWeight: 'bold'}}>
              Edit Sub-sequence Start Position
            </div>
            <input
              type="number"
              defaultValue={currentPosition}
              step={0.1}
              min={0}
              onChange={(e) => {
                newPosition = parseFloat(e.target.value)
              }}
              style={{
                width: '200px',
                padding: '4px',
                marginBottom: '8px',
              }}
              autoFocus
            />
            <div
              style={{display: 'flex', justifyContent: 'flex-end', gap: '4px'}}
            >
              <button
                onClick={() => {
                  if (newPosition >= 0) {
                    getStudio()!.transaction(({stateEditors}) => {
                      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                        {
                          projectId: leaf.sheet.address.projectId,
                          sheetId: leaf.sheet.address.sheetId,
                        },
                      )
                      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                        {
                          sheetAddress: leaf.sheet.address,
                          subSequenceId: leaf.subSequence
                            .id as SequenceSubSequenceId,
                          updates: {position: newPosition},
                        },
                      )
                    })
                  }
                  editStartPopover.close('user action')
                }}
                style={{
                  padding: '4px 12px',
                  background: '#40AAA4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Ok
              </button>
            </div>
          </div>
        </BasicPopover>
      )
    },
  )

  const [contextMenu] = useContextMenu(containerNode, {
    menuItems: () => {
      return [
        {
          label: 'Edit Label',
          callback: () => {
            if (containerNode) {
              const rect = containerNode.getBoundingClientRect()
              editLabelPopover.open(
                {clientX: rect.left, clientY: rect.top},
                containerNode,
              )
            }
          },
        },
        {
          label: 'Edit Start',
          callback: () => {
            if (containerNode) {
              const rect = containerNode.getBoundingClientRect()
              editStartPopover.open(
                {clientX: rect.left, clientY: rect.top},
                containerNode,
              )
            }
          },
        },
        {
          label: 'Edit Duration',
          callback: () => {
            if (containerNode) {
              const rect = containerNode.getBoundingClientRect()
              editDurationPopover.open(
                {clientX: rect.left, clientY: rect.top},
                containerNode,
              )
            }
          },
        },
        {
          label: 'Edit Time Scale',
          callback: () => {
            if (containerNode) {
              const rect = containerNode.getBoundingClientRect()
              editTimeScalePopover.open(
                {clientX: rect.left, clientY: rect.top},
                containerNode,
              )
            }
          },
        },
        {
          label: 'Delete Sub-sequence',
          callback: () => {
            getStudio()!.transaction(({stateEditors}) => {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                {
                  projectId: leaf.sheet.address.projectId,
                  sheetId: leaf.sheet.address.sheetId,
                },
              )
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.removeSubSequence(
                {
                  sheetAddress: leaf.sheet.address,
                  subSequenceId: leaf.subSequence.id as SequenceSubSequenceId,
                },
              )
            })
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
      ] as IContextMenuItem[]
    },
  })

  const frameStampLock = useLockFrameStampPositionRef()

  const getHandleBeingDragged = (
    event: MouseEvent,
  ): 'left' | 'right' | 'bar' | null => {
    // Check if the click was on a handle by traversing the event path
    const path = event.composedPath()

    for (const element of path) {
      if (element === leftHandleNode) return 'left'
      if (element === rightHandleNode) return 'right'
      if (element === barNode) return 'bar'
      if (element === containerNode) break
    }

    return null
  }

  const dragOpts = useMemo((): Parameters<typeof useDrag>[1] => {
    let tempTransaction: CommitOrDiscard | null = null
    let dragType: 'left' | 'right' | 'bar' | null = null
    let initialPosition = 0
    let initialDuration = 0
    let initialTimeScale = 1

    // Helper to get effective duration (with fallback to referenced sequence length)
    const getEffectiveDuration = () => {
      let dur = leaf.subSequence.duration
      if (!dur || dur === 0) {
        try {
          const studio = getStudio()!
          const projects = val(studio.projectsP)
          const project = projects[leaf.sheet.address.projectId]
          dur =
            val(
              project.pointers.historic.sheetsById[
                leaf.subSequence.sheetId as any
              ].sequence.length,
            ) ?? val(layoutP.sheet).getSequence().length
        } catch (e) {
          dur = val(layoutP.sheet).getSequence().length
        }
      }
      return dur ?? 1
    }

    return {
      debugName: 'SubSequenceBar/drag',
      lockCSSCursorTo: 'ew-resize',
      onDragStart(event) {
        dragType = getHandleBeingDragged(event)
        if (!dragType) return false

        initialPosition = leaf.subSequence.position
        initialDuration = getEffectiveDuration()
        initialTimeScale = leaf.subSequence.timeScale

        frameStampLock(true, leaf.subSequence.position)

        return {
          onDrag(dx) {
            // Discard previous transaction if it exists
            if (tempTransaction) {
              tempTransaction.discard()
            }

            // Create a new transaction with the current delta
            tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
              const clippedSpaceRange = val(layoutP.clippedSpace.range)
              const clippedSpaceWidth = val(layoutP.clippedSpace.width)
              const unitSpaceToSceneSpace =
                (clippedSpaceRange.end - clippedSpaceRange.start) /
                clippedSpaceWidth
              const delta = dx * unitSpaceToSceneSpace
              const sequence = val(layoutP.sheet).getSequence()
              const snapToFrame = sequence.closestGridPosition

              if (dragType === 'bar') {
                // Dragging the center: adjust position and snap to frames
                const rawPosition = initialPosition + delta
                const newPosition = Math.max(0, snapToFrame(rawPosition))
                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                  {
                    projectId: leaf.sheet.address.projectId,
                    sheetId: leaf.sheet.address.sheetId,
                  },
                )
                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                  {
                    sheetAddress: leaf.sheet.address,
                    subSequenceId: leaf.subSequence.id as SequenceSubSequenceId,
                    updates: {position: newPosition},
                  },
                )
              } else if (dragType === 'left') {
                // Dragging the left handle: adjust start position and time scale
                // Keep the visual end (right handle) fixed
                const initialVisualEnd =
                  initialPosition + initialDuration / initialTimeScale
                const rawPosition = initialPosition + delta
                const newPosition = Math.max(0, snapToFrame(rawPosition))

                // Calculate new time scale to keep visual end fixed
                // visualEnd = position + (duration / timeScale)
                // timeScale = duration / (visualEnd - position)
                const visualWidth = initialVisualEnd - newPosition
                const newTimeScale = Math.max(
                  0.01,
                  initialDuration / visualWidth,
                )

                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                  {
                    projectId: leaf.sheet.address.projectId,
                    sheetId: leaf.sheet.address.sheetId,
                  },
                )
                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                  {
                    sheetAddress: leaf.sheet.address,
                    subSequenceId: leaf.subSequence.id as SequenceSubSequenceId,
                    updates: {position: newPosition, timeScale: newTimeScale},
                  },
                )
              } else if (dragType === 'right') {
                // Dragging the right handle: adjust time scale based on new visual end position
                // Current visual end = position + (duration / timeScale)
                // New visual end after drag
                const initialVisualEnd =
                  initialPosition + initialDuration / initialTimeScale
                const rawVisualEnd = initialVisualEnd + delta
                const newVisualEnd = Math.max(
                  initialPosition + 0.01,
                  snapToFrame(rawVisualEnd),
                )

                // Calculate new time scale: timeScale = duration / visualWidth
                const visualWidth = newVisualEnd - initialPosition
                const newTimeScale = Math.max(
                  0.01,
                  initialDuration / visualWidth,
                )

                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                  {
                    projectId: leaf.sheet.address.projectId,
                    sheetId: leaf.sheet.address.sheetId,
                  },
                )
                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                  {
                    sheetAddress: leaf.sheet.address,
                    subSequenceId: leaf.subSequence.id as SequenceSubSequenceId,
                    updates: {timeScale: newTimeScale},
                  },
                )
              }
            })
          },
          onDragEnd(dragHappened) {
            frameStampLock(false, 0)

            if (dragHappened && tempTransaction) {
              tempTransaction.commit()
            } else if (tempTransaction) {
              tempTransaction.discard()
            }
            tempTransaction = null
          },
        }
      },
    }
  }, [
    leaf,
    layoutP,
    frameStampLock,
    leftHandleNode,
    rightHandleNode,
    barNode,
    containerNode,
  ])

  const [isDraggingD] = useDrag(containerNode, dragOpts)
  useCssCursorLock(isDraggingD, 'draggingPositionInSequenceEditor', 'ew-resize')

  const leftPadding = val(layoutP.scaledSpace.leftPadding)
  const position = leaf.subSequence.position
  const timeScale = leaf.subSequence.timeScale

  // Get the duration, falling back to the referenced sequence's length if not set
  let duration = leaf.subSequence.duration
  if (!duration || duration === 0) {
    try {
      const studio = getStudio()!
      const projects = val(studio.projectsP)
      const project = projects[leaf.sheet.address.projectId]
      duration =
        val(
          project.pointers.historic.sheetsById[leaf.subSequence.sheetId as any]
            .sequence.length,
        ) ?? val(layoutP.sheet).getSequence().length
    } catch (e) {
      // Fallback to current sequence length if we can't get the referenced sequence
      duration = val(layoutP.sheet).getSequence().length
    }
  }

  // Ensure duration is never undefined
  if (!duration) duration = 1

  const left = `calc(${leftPadding}px + calc(var(--unitSpaceToScaledSpaceMultiplier) * ${position}px))`
  const width = `calc(var(--unitSpaceToScaledSpaceMultiplier) * ${
    duration / timeScale
  }px)`

  const startPosition = position
  const endPosition = position + duration / timeScale

  return (
    <BarContainer
      ref={containerRef}
      style={{
        left,
        width,
      }}
    >
      {editLabelPopover.node}
      {editStartPopover.node}
      {editDurationPopover.node}
      {editTimeScalePopover.node}
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
              setSubSequenceColor(leaf, newColor)
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
                setSubSequenceColor(leaf, hexValue)
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
      <Bar ref={barRef} $color={color}>
        <span>{leaf.subSequence.timeScale.toFixed(2)}x</span>
      </Bar>
      <LeftHandle
        ref={leftHandleRef}
        $position="left"
        data-handle="left"
        title={
          isFinite(startPosition)
            ? `Sub-sequence start: ${startPosition.toFixed(2)}`
            : 'Sub-sequence start'
        }
        {...(isFinite(startPosition)
          ? DopeSnap.includePositionSnapAttrs(startPosition)
          : {})}
        $color={color}
      />
      <RightHandle
        ref={rightHandleRef}
        $position="right"
        data-handle="right"
        title={
          isFinite(endPosition)
            ? `Sub-sequence end: ${endPosition.toFixed(2)}`
            : 'Sub-sequence end'
        }
        {...(isFinite(endPosition)
          ? DopeSnap.includePositionSnapAttrs(endPosition)
          : {})}
        $color={color}
      />
    </BarContainer>
  )
}

export default SubSequenceBar
