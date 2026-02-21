import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import AudioBar from './AudioBar'

const AudioTrackContainer = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`

const AudioTrack: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  leaf: SequenceEditorTree_AttachedAudio
}> = ({layoutP, leaf}) => {
  return (
    <AudioTrackContainer>
      <AudioBar layoutP={layoutP} leaf={leaf} />
    </AudioTrackContainer>
  )
}

export default AudioTrack
