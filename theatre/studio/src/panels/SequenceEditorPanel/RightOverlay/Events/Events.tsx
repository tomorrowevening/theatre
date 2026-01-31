import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {useVal} from '@tomorrowevening/theatre-react'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import React from 'react'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import EventDot from './EventDot'

const Events: React.VFC<{layoutP: Pointer<SequenceEditorPanelLayout>}> = ({
  layoutP,
}) => {
  const sheetAddress = useVal(layoutP.sheet.address)
  const eventSetP =
    getStudio().atomP.historic.projects.stateByProjectId[sheetAddress.projectId]
      .stateBySheetId[sheetAddress.sheetId].sequenceEditor.eventSet
  const eventAllIds = useVal(eventSetP.allIds)

  return (
    <>
      {eventAllIds &&
        Object.keys(eventAllIds).map((eventId) => (
          <EventDot key={eventId} layoutP={layoutP} eventId={eventId} />
        ))}
    </>
  )
}

export default Events
