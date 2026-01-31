import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import {useVal} from '@tomorrowevening/theatre-react'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {
  lockedCursorCssVarName,
  useCssCursorLock,
} from '@tomorrowevening/theatre-studio/uiComponents/PointerEventsHandler'
import useContextMenu from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import useRefAndState from '@tomorrowevening/theatre-studio/utils/useRefAndState'
import React, {useMemo, useRef} from 'react'
import styled from 'styled-components'
import {useLockFrameStampPosition} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/FrameStampPositionProvider'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEventId} from '@tomorrowevening/theatre-shared/utils/ids'
import type {SheetAddress} from '@tomorrowevening/theatre-shared/utils/addresses'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import type {UseDragOpts} from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import type {StudioHistoricStateSequenceEditorEvent} from '@tomorrowevening/theatre-studio/store/types/historic'
import {zIndexes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/SequenceEditorPanel'
import DopeSnap from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/RightOverlay/DopeSnap'
import {absoluteDims} from '@tomorrowevening/theatre-studio/utils/absoluteDims'
import {DopeSnapHitZoneUI} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/RightOverlay/DopeSnapHitZoneUI'
import {
  snapToAll,
  snapToNone,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/KeyframeSnapTarget'
import usePopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/BasicPopover'
import EventEditorPopover from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/RightOverlay/Events/EventEditorPopover'

const EVENT_SIZE_W_PX = 12
const EVENT_SIZE_H_PX = 12
const EVENT_HOVER_SIZE_W_PX = EVENT_SIZE_W_PX * 2
const EVENT_HOVER_SIZE_H_PX = EVENT_SIZE_H_PX * 2

const EventDotContainer = styled.div`
  position: absolute;
  // below the sequence ruler "top bar"
  top: 30px;
  z-index: ${() => zIndexes.marker};
`

const EventVisualDotSVGContainer = styled.div`
  position: absolute;
  ${absoluteDims(EVENT_SIZE_W_PX, EVENT_SIZE_H_PX)}
  pointer-events: none;
`

// Circle SVG for events (different from markers which are arrow-like)
const EventVisualDot = React.memo(() => (
  <EventVisualDotSVGContainer
    children={
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="6"
          cy="6"
          r="5"
          fill="#2b86ee"
          stroke="#FFFFFF"
          strokeWidth="1"
        />
      </svg>
    }
  />
))

const HitZone = styled.div`
  z-index: 1;
  cursor: ew-resize;

  ${DopeSnapHitZoneUI.CSS}

  // :not dragging event to ensure that events don't snap to other events
  // this works because only one event track (so this technique is not used by keyframes...)
  #pointer-root.draggingPositionInSequenceEditor:not(.draggingEvent) & {
    ${DopeSnapHitZoneUI.CSS_WHEN_SOMETHING_DRAGGING}
  }

  // "All instances of this component <Event/> inside #pointer-root when it has the .draggingPositionInSequenceEditor class"
  // ref: https://styled-components.com/docs/basics#pseudoelements-pseudoselectors-and-nesting
  #pointer-root.draggingPositionInSequenceEditor:not(.draggingEvent) &,
  #pointer-root.draggingPositionInSequenceEditor
    &.${DopeSnapHitZoneUI.BEING_DRAGGED_CLASS} {
    pointer-events: auto;
    cursor: var(${lockedCursorCssVarName});
  }

  &:hover
    + ${EventVisualDotSVGContainer},
    // notice , "or" in CSS
    &.${DopeSnapHitZoneUI.BEING_DRAGGED_CLASS}
    + ${EventVisualDotSVGContainer} {
    ${absoluteDims(EVENT_HOVER_SIZE_W_PX, EVENT_HOVER_SIZE_H_PX)}
  }
`

type IEventDotProps = {
  layoutP: Pointer<SequenceEditorPanelLayout>
  eventId: SequenceEventId
}

const EventDot: React.VFC<IEventDotProps> = ({layoutP, eventId}) => {
  const sheetAddress = useVal(layoutP.sheet.address)
  const event = useVal(
    getStudio().atomP.historic.projects.stateByProjectId[sheetAddress.projectId]
      .stateBySheetId[sheetAddress.sheetId].sequenceEditor.eventSet.byId[
      eventId
    ],
  )
  if (!event) {
    // 1/10 maybe this is normal if React tries to re-render this with
    // out of date data. (e.g. Suspense / Transition stuff?)
    return null
  }

  // check event in viewable bounds
  const clippedSpaceWidth = useVal(layoutP.clippedSpace.width)
  const clippedSpaceFromUnitSpace = useVal(layoutP.clippedSpace.fromUnitSpace)
  const clippedSpaceEventX = clippedSpaceFromUnitSpace(event.position)

  const outsideClipDims =
    clippedSpaceEventX <= 0 || clippedSpaceEventX > clippedSpaceWidth

  // If outside the clip space, we want to hide the event dot. We
  // hide the dot by translating it far away and scaling it to 0.
  // This method of hiding does not cause reflow/repaint.
  const translateX = outsideClipDims ? -10000 : clippedSpaceEventX
  const scale = outsideClipDims ? 0 : 1

  return (
    <EventDotContainer
      style={{
        transform: `translateX(${translateX}px) scale(${scale})`,
      }}
    >
      <EventDotVisible event={event} layoutP={layoutP} />
    </EventDotContainer>
  )
}

export default EventDot

type IEventDotVisibleProps = {
  layoutP: Pointer<SequenceEditorPanelLayout>
  event: StudioHistoricStateSequenceEditorEvent
}

const EventDotVisible: React.VFC<IEventDotVisibleProps> = ({
  layoutP,
  event,
}) => {
  const sheetAddress = useVal(layoutP.sheet.address)

  const [eventRef, eventNode] = useRefAndState<HTMLDivElement | null>(null)

  const [contextMenu] = useEventContextMenu(eventNode, {
    sheetAddress,
    eventId: event.id,
  })

  const [isDragging] = useDragEvent(eventNode, {
    layoutP,
    event,
  })

  const {
    node: popoverNode,
    toggle: togglePopover,
    close: closePopover,
  } = usePopover({debugName: 'EventPopover'}, () => {
    return (
      <BasicPopover>
        <EventEditorPopover
          event={event}
          layoutP={layoutP}
          onRequestClose={closePopover}
        />
      </BasicPopover>
    )
  })

  return (
    <>
      {contextMenu}
      {popoverNode}
      <HitZone
        title={event.name ? `Event: ${event.name}` : 'Event'}
        ref={eventRef}
        onClick={(e) => {
          togglePopover(e, eventRef.current!)
        }}
        {...DopeSnapHitZoneUI.reactProps({
          isDragging,
          position: event.position,
        })}
      />
      <EventVisualDot />
    </>
  )
}

function useEventContextMenu(
  node: HTMLElement | null,
  options: {
    sheetAddress: SheetAddress
    eventId: SequenceEventId
  },
) {
  return useContextMenu(node, {
    menuItems() {
      return [
        {
          label: 'Remove event',
          callback: () => {
            getStudio().transaction(({stateEditors}) => {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.removeEvent(
                {
                  sheetAddress: options.sheetAddress,
                  eventId: options.eventId,
                },
              )
            })
          },
        },
      ]
    },
  })
}

function useDragEvent(
  node: HTMLDivElement | null,
  props: {
    layoutP: Pointer<SequenceEditorPanelLayout>
    event: StudioHistoricStateSequenceEditorEvent
  },
): [isDragging: boolean] {
  const propsRef = useRef(props)
  propsRef.current = props

  const useDragOpts = useMemo<UseDragOpts>(() => {
    return {
      debugName: `EventDot/useDragEvent (${props.event.id})`,
      onDragStart(_event) {
        const eventAtStartOfDrag = propsRef.current.event
        const toUnitSpace = val(props.layoutP.scaledSpace.toUnitSpace)
        let tempTransaction: CommitOrDiscard | undefined

        snapToAll()

        return {
          onDrag(dx, _dy, event) {
            const original = eventAtStartOfDrag
            const newPosition = Math.max(
              // check if our event hoversover a [data-pos] element
              DopeSnap.checkIfMouseEventSnapToPos(event, {
                ignore: node,
              }) ??
                // if we don't find snapping target, check the distance dragged + original position
                original.position + toUnitSpace(dx),
              // sanitize to minimum of zero
              0,
            )

            tempTransaction?.discard()
            tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceEvents(
                {
                  sheetAddress: val(props.layoutP.sheet.address),
                  events: [{...original, position: newPosition}],
                  snappingFunction: val(props.layoutP.sheet).getSequence()
                    .closestGridPosition,
                },
              )
            })
          },
          onDragEnd(dragHappened) {
            if (dragHappened) tempTransaction?.commit()
            else tempTransaction?.discard()

            snapToNone()
          },
        }
      },
    }
  }, [])

  const [isDragging] = useDrag(node, useDragOpts)

  useLockFrameStampPosition(isDragging, props.event.position)
  useCssCursorLock(
    isDragging,
    'draggingPositionInSequenceEditor draggingEvent',
    'ew-resize',
  )

  return [isDragging]
}
