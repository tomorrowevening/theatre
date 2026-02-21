import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import RightRow from './Row'
import AudioTrack from './AudioTrack/AudioTrack'

const AudioRow: React.FC<{
  leaf: SequenceEditorTree_AttachedAudio
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  return (
    <RightRow leaf={leaf} node={<AudioTrack layoutP={layoutP} leaf={leaf} />}>
      {null}
    </RightRow>
  )
}

export default AudioRow
