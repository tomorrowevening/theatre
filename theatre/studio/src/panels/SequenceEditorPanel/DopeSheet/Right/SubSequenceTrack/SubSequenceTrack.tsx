import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_SubSequence} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import SubSequenceBar from './SubSequenceBar'

const SubSequenceTrackContainer = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`

const SubSequenceTrack: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  leaf: SequenceEditorTree_SubSequence
}> = ({layoutP, leaf}) => {
  return (
    <SubSequenceTrackContainer>
      <SubSequenceBar layoutP={layoutP} leaf={leaf} />
    </SubSequenceTrackContainer>
  )
}

export default SubSequenceTrack
