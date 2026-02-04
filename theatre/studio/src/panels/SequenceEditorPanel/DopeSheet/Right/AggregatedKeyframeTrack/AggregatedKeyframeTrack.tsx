import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {
  SequenceEditorTree_PropWithChildren,
  SequenceEditorTree_Sheet,
  SequenceEditorTree_SheetObject,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React from 'react'
import styled from 'styled-components'
import useRefAndState from '@tomorrowevening/theatre-studio/utils/useRefAndState'
import type {AggregatedKeyframes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import type {Keyframe} from '@tomorrowevening/theatre-core/projects/store/types/SheetState_Historic'
import AggregateKeyframeBar from './AggregateKeyframeBar'

const AggregatedKeyframeTrackContainer = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`

type IAggregatedKeyframeTracksProps = {
  viewModel:
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
    | SequenceEditorTree_Sheet
  aggregatedKeyframes: AggregatedKeyframes
  layoutP: Pointer<SequenceEditorPanelLayout>
}

function AggregatedKeyframeTrack_memo(props: IAggregatedKeyframeTracksProps) {
  const {layoutP, aggregatedKeyframes, viewModel} = props
  const [containerRef, containerNode] = useRefAndState<HTMLDivElement | null>(
    null,
  )

  return (
    <AggregatedKeyframeTrackContainer ref={containerRef}>
      <AggregateKeyframeBar
        viewModel={viewModel}
        aggregatedKeyframes={aggregatedKeyframes}
        layoutP={layoutP}
      />
    </AggregatedKeyframeTrackContainer>
  )
}

const AggregatedKeyframeTrack = React.memo(AggregatedKeyframeTrack_memo)
export default AggregatedKeyframeTrack

export enum AggregateKeyframePositionIsSelected {
  AllSelected,
  AtLeastOneUnselected,
  NoneSelected,
}
