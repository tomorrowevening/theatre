import OutlinePanel from '@tomorrowevening/theatre-studio/panels/OutlinePanel/OutlinePanel'
import React from 'react'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {useVal} from '@tomorrowevening/theatre-react'
import ExtensionPaneWrapper from '@tomorrowevening/theatre-studio/panels/BasePanel/ExtensionPaneWrapper'
import SequenceEditorPanel from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/SequenceEditorPanel'
// import DetailPanel from '@tomorrowevening/theatre-studio/panels/DetailPanel/DetailPanel'

const PanelsRoot: React.VFC = () => {
  const panes = useVal(getStudio().paneManager.allPanesD)
  const paneEls = Object.entries(panes).map(([instanceId, paneInstance]) => {
    return (
      <ExtensionPaneWrapper
        key={`pane-${instanceId}`}
        paneInstance={paneInstance!}
      />
    )
  })

  return (
    <>
      {paneEls}
      <OutlinePanel />
      <SequenceEditorPanel />
      {/* <DetailPanel /> */}
    </>
  )
}

export default PanelsRoot
