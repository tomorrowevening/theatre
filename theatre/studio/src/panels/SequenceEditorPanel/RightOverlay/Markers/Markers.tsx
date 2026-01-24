import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {useVal} from '@tomorrowevening/theatre-react'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import React from 'react'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import MarkerDot from './MarkerDot'

const Markers: React.VFC<{layoutP: Pointer<SequenceEditorPanelLayout>}> = ({
  layoutP,
}) => {
  const sheetAddress = useVal(layoutP.sheet.address)
  const markerSetP =
    getStudio().atomP.historic.projects.stateByProjectId[sheetAddress.projectId]
      .stateBySheetId[sheetAddress.sheetId].sequenceEditor.markerSet
  const markerAllIds = useVal(markerSetP.allIds)

  return (
    <>
      {markerAllIds &&
        Object.keys(markerAllIds).map((markerId) => (
          <MarkerDot key={markerId} layoutP={layoutP} markerId={markerId} />
        ))}
    </>
  )
}

export default Markers
