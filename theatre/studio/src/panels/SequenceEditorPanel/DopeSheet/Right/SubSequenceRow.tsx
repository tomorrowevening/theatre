import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_SubSequence} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import RightRow from './Row'
import SubSequenceTrack from './SubSequenceTrack/SubSequenceTrack'

const SubSequenceRow: React.FC<{
  leaf: SequenceEditorTree_SubSequence
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  return (
    <RightRow
      leaf={leaf}
      node={<SubSequenceTrack layoutP={layoutP} leaf={leaf} />}
    >
      {null}
    </RightRow>
  )
}

export default SubSequenceRow
