import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {useVal} from '@tomorrowevening/theatre-react'
import type {IRange} from '@tomorrowevening/theatre-shared/utils/types'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import mapValues from 'lodash-es/mapValues'
import {position} from 'polished'
import React, {useCallback, useMemo, useState} from 'react'
import styled from 'styled-components'
import {zIndexes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/SequenceEditorPanel'
import {includeLockFrameStampAttrs} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/FrameStampPositionProvider'
import {pointerEventsAutoInNormalMode} from '@tomorrowevening/theatre-studio/css'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'

const Container = styled.div`
  --threadHeight: 20px;
  --bg-inactive: #32353b;
  --bg-active: #5b5c5d;
  position: absolute;
  height: 0;
  width: 100%;
  left: 12px;
  /* bottom: 8px; */
  z-index: ${() => zIndexes.horizontalScrollbar};
  ${pointerEventsAutoInNormalMode}
`

const TimeThread = styled.div`
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--threadHeight);
`

const RangeBar = styled.div`
  position: absolute;
  height: 20px;
  background: var(--bg-inactive);
  cursor: ew-resize;
  z-index: 2;

  &:hover,
  &:active {
    background: var(--bg-active);
  }

  &:after {
    ${position('absolute', '-4px')};
    display: block;
    content: ' ';
  }
`

const RangeHandle = styled.div`
  position: absolute;
  height: 20px;
  width: 7px;
  left: 0;
  z-index: 2;
  top: 0;
  bottom: 0;
  display: block;

  &:hover:before {
    background: var(--bg-active);
  }

  &:before {
    ${position('absolute', '0')};
    display: block;
    content: ' ';
    background: var(--bg-inactive);
    border-radius: 0 2px 2px 0;
  }

  &:after {
    ${position('absolute', '-4px')};
    display: block;
    content: ' ';
  }
`

const RangeStartHandle = styled(RangeHandle)`
  left: calc(-1 * 7px);
  cursor: w-resize;
  &:before {
    transform: scaleX(-1);
  }
`
const RangeEndHandle = styled(RangeHandle)`
  cursor: e-resize;
  left: 0px;
`

const Tooltip = styled.div<{active: boolean}>`
  display: ${(props) => (props.active ? 'block' : 'none')};
  position: absolute;
  top: -20px;
  left: 4px;
  padding: 0 4px;
  transform: translateX(-50%);
  background: #131d1f;
  border-radius: 4px;
  color: #fff;
  font-size: 10px;
  line-height: 18px;
  text-align: center;

  ${RangeStartHandle}:hover &,
  ${RangeEndHandle}:hover &,
  ${RangeBar}:hover ~ ${RangeStartHandle} &,
  ${RangeBar}:hover ~ ${RangeEndHandle} & {
    display: block;
  }
`

const TooltipInput = styled.input`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 10px;
  line-height: 18px;
  text-align: center;
  width: 40px;
  outline: none;

  &:focus {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`

/**
 * The little scrollbar on the bottom of the Right side
 */
const HorizontalScrollbar: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const unitPosToHumanReadablePos = useCallback((n: number) => n.toFixed(2), [])

  // const dd = usePrism(() => val(layoutP.sheet).getSequence().positionFormatter.formatForPlayhead, [layoutP])

  const relevantValuesD = useMemo(
    () =>
      prism(() => {
        const rightWidth = val(layoutP.rightDims.width) - 25
        const clippedSpaceRange = val(layoutP.clippedSpace.range)
        const sequenceLength = val(layoutP.sheet).getSequence().length

        const assumedLengthOfSequence = Math.max(
          clippedSpaceRange.end,
          sequenceLength,
        )

        const rangeStartX =
          (clippedSpaceRange.start / assumedLengthOfSequence) * rightWidth

        const rangeEndX =
          (clippedSpaceRange.end / assumedLengthOfSequence) * rightWidth

        return {
          rightWidth,
          clippedSpaceRange,
          sequenceLength,
          assumedLengthOfSequence,
          rangeStartX,
          rangeEndX,
          bottom: val(layoutP.horizontalScrollbarDims.bottom),
        }
      }),
    [layoutP],
  )
  const {rangeStartX, rangeEndX, clippedSpaceRange, bottom} =
    useVal(relevantValuesD)

  const [beingDragged, setBeingDragged] = useState<
    'nothing' | 'both' | 'start' | 'end'
  >('nothing')

  const [editingStart, setEditingStart] = useState(false)
  const [editingEnd, setEditingEnd] = useState(false)
  const [startInputValue, setStartInputValue] = useState('')
  const [endInputValue, setEndInputValue] = useState('')

  const inputHandlers = useMemo(() => {
    const updateRange = (newStart: number, newEnd: number) => {
      // Clamp values to reasonable bounds, but allow extending beyond sequence length
      const clampedStart = Math.max(0, Math.min(newStart, newEnd - 0.01))
      const clampedEnd = Math.max(newStart + 0.01, newEnd) // Remove upper bound limit

      val(layoutP.clippedSpace.setRange)({
        start: clampedStart,
        end: clampedEnd,
      })
    }

    return {
      onStartInputClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingStart(true)
        setStartInputValue(unitPosToHumanReadablePos(clippedSpaceRange.start))
      },

      onEndInputClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingEnd(true)
        setEndInputValue(unitPosToHumanReadablePos(clippedSpaceRange.end))
      },

      onStartInputChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setStartInputValue(e.target.value)
      },

      onEndInputChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setEndInputValue(e.target.value)
      },

      onStartInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          const newValue = parseFloat(startInputValue)
          if (!isNaN(newValue)) {
            updateRange(newValue, clippedSpaceRange.end)
          }
          setEditingStart(false)
        } else if (e.key === 'Escape') {
          setEditingStart(false)
        }
      },

      onEndInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          const newValue = parseFloat(endInputValue)
          if (!isNaN(newValue)) {
            updateRange(clippedSpaceRange.start, newValue)
          }
          setEditingEnd(false)
        } else if (e.key === 'Escape') {
          setEditingEnd(false)
        }
      },

      onStartInputBlur: () => {
        const newValue = parseFloat(startInputValue)
        if (!isNaN(newValue)) {
          updateRange(newValue, clippedSpaceRange.end)
        }
        setEditingStart(false)
      },

      onEndInputBlur: () => {
        const newValue = parseFloat(endInputValue)
        if (!isNaN(newValue)) {
          updateRange(clippedSpaceRange.start, newValue)
        }
        setEditingEnd(false)
      },
    }
  }, [
    layoutP,
    relevantValuesD,
    clippedSpaceRange,
    startInputValue,
    endInputValue,
    unitPosToHumanReadablePos,
  ])

  const handles = useMemo(() => {
    let valuesBeforeDrag = val(relevantValuesD)
    let noteValuesBeforeDrag = () => {
      valuesBeforeDrag = val(relevantValuesD)
    }

    const deltaXToDeltaPos = (dx: number): number => {
      const asAFractionOfRightWidth = dx / valuesBeforeDrag.rightWidth
      return asAFractionOfRightWidth * valuesBeforeDrag.assumedLengthOfSequence
    }

    const self = {
      onRangeDragStart() {
        noteValuesBeforeDrag()
        return {
          onDrag(dx: number) {
            setBeingDragged('both')
            const deltaPosInUnitSpace = deltaXToDeltaPos(dx)

            const newRange: IRange = mapValues(
              valuesBeforeDrag.clippedSpaceRange,
              (p) => p + deltaPosInUnitSpace,
            )

            val(layoutP.clippedSpace.setRange)(newRange)
          },
          onDragEnd() {
            setBeingDragged('nothing')
          },
        }
      },

      onRangeStartDragStart() {
        noteValuesBeforeDrag()
        return {
          onDrag(dx: number) {
            setBeingDragged('start')

            const deltaPosInUnitSpace = deltaXToDeltaPos(dx)

            const newRange: IRange = {
              start:
                valuesBeforeDrag.clippedSpaceRange.start + deltaPosInUnitSpace,
              end: valuesBeforeDrag.clippedSpaceRange.end,
            }

            if (newRange.start > newRange.end - 1) {
              newRange.start = newRange.end - 1
            }

            if (newRange.start <= 0) {
              newRange.start = 0
            }

            val(layoutP.clippedSpace.setRange)(newRange)
          },
          onDragEnd() {
            setBeingDragged('nothing')
          },
        }
      },

      onRangeEndDragStart() {
        noteValuesBeforeDrag()
        return {
          onDrag(dx: number) {
            setBeingDragged('end')

            const deltaPosInUnitSpace = deltaXToDeltaPos(dx)

            const newRange: IRange = {
              start: valuesBeforeDrag.clippedSpaceRange.start,
              end: valuesBeforeDrag.clippedSpaceRange.end + deltaPosInUnitSpace,
            }

            if (newRange.end < newRange.start + 1) {
              newRange.end = newRange.start + 1
            }

            if (newRange.end >= valuesBeforeDrag.assumedLengthOfSequence) {
              newRange.end = valuesBeforeDrag.assumedLengthOfSequence
            }

            val(layoutP.clippedSpace.setRange)(newRange)
          },
          onDragEnd() {
            setBeingDragged('nothing')
          },
        }
      },
    }

    return self
  }, [layoutP, relevantValuesD])

  const [rangeDragNode, setRangeDragNode] = useState<HTMLDivElement | null>(
    null,
  )
  useDrag(rangeDragNode, {
    debugName: 'HorizontalScrollbar/onRangeDrag',
    onDragStart: handles.onRangeDragStart,
    lockCSSCursorTo: 'ew-resize',
  })

  const [rangeStartDragNode, setRangeStartDragNode] =
    useState<HTMLDivElement | null>(null)
  useDrag(rangeStartDragNode, {
    debugName: 'HorizontalScrollbar/onRangeStartDrag',
    onDragStart: handles.onRangeStartDragStart,
    lockCSSCursorTo: 'w-resize',
  })

  const [rangeEndDragNode, setRangeEndDragNode] =
    useState<HTMLDivElement | null>(null)
  useDrag(rangeEndDragNode, {
    debugName: 'HorizontalScrollbar/onRangeEndDrag',
    onDragStart: handles.onRangeEndDragStart,
    lockCSSCursorTo: 'e-resize',
  })

  return (
    <Container
      style={{bottom: bottom + 23 + 'px'}}
      {...includeLockFrameStampAttrs('hide')}
    >
      <TimeThread>
        <RangeBar
          ref={setRangeDragNode}
          style={{
            width: `${rangeEndX - rangeStartX}px`,
            transform: `translate3d(${rangeStartX}px, 0, 0)`,
          }}
        />
        <RangeStartHandle
          ref={setRangeStartDragNode}
          style={{transform: `translate3d(${rangeStartX}px, 0, 0)`}}
        >
          <Tooltip
            active={
              beingDragged === 'both' ||
              beingDragged === 'start' ||
              editingStart
            }
          >
            {editingStart ? (
              <TooltipInput
                value={startInputValue}
                onChange={inputHandlers.onStartInputChange}
                onKeyDown={inputHandlers.onStartInputKeyDown}
                onBlur={inputHandlers.onStartInputBlur}
                autoFocus
              />
            ) : (
              <span onClick={inputHandlers.onStartInputClick}>
                {unitPosToHumanReadablePos(clippedSpaceRange.start)}
              </span>
            )}
          </Tooltip>
        </RangeStartHandle>
        <RangeEndHandle
          ref={setRangeEndDragNode}
          style={{transform: `translate3d(${rangeEndX}px, 0, 0)`}}
        >
          <Tooltip
            active={
              beingDragged === 'both' || beingDragged === 'end' || editingEnd
            }
          >
            {editingEnd ? (
              <TooltipInput
                value={endInputValue}
                onChange={inputHandlers.onEndInputChange}
                onKeyDown={inputHandlers.onEndInputKeyDown}
                onBlur={inputHandlers.onEndInputBlur}
                autoFocus
              />
            ) : (
              <span onClick={inputHandlers.onEndInputClick}>
                {unitPosToHumanReadablePos(clippedSpaceRange.end)}
              </span>
            )}
          </Tooltip>
        </RangeEndHandle>
      </TimeThread>
    </Container>
  )
}

export default HorizontalScrollbar
