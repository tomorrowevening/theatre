import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {
  SequenceEditorTree_PrimitiveProp,
  SequenceEditorTree_PropWithChildren,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import {usePrism} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import PrimitivePropRow from './PrimitivePropRow'
import RightRow from './Row'
import AggregatedKeyframeTrack from './AggregatedKeyframeTrack/AggregatedKeyframeTrack'
import {collectAggregateKeyframesInPrism} from './collectAggregateKeyframes'
import {
  ProvideLogger,
  useLogger,
} from '@tomorrowevening/theatre-studio/uiComponents/useLogger'

export const decideRowByPropType = (
  leaf: SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp,
  layoutP: Pointer<SequenceEditorPanelLayout>,
  renderChildren: boolean = true,
): React.ReactElement =>
  leaf.type === 'propWithChildren' ? (
    <RightPropWithChildrenRow
      layoutP={layoutP}
      viewModel={leaf}
      key={'prop' + leaf.pathToProp[leaf.pathToProp.length - 1]}
      renderChildren={renderChildren}
    />
  ) : (
    <PrimitivePropRow
      layoutP={layoutP}
      leaf={leaf}
      key={'prop' + leaf.pathToProp[leaf.pathToProp.length - 1]}
    />
  )

const RightPropWithChildrenRow: React.VFC<{
  viewModel: SequenceEditorTree_PropWithChildren
  layoutP: Pointer<SequenceEditorPanelLayout>
  renderChildren?: boolean
}> = ({viewModel, layoutP, renderChildren = true}) => {
  const logger = useLogger(
    'RightPropWithChildrenRow',
    viewModel.pathToProp.join(),
  )
  return usePrism(() => {
    const aggregatedKeyframes = collectAggregateKeyframesInPrism(viewModel)

    const node = (
      <AggregatedKeyframeTrack
        layoutP={layoutP}
        aggregatedKeyframes={aggregatedKeyframes}
        viewModel={viewModel}
      />
    )

    return (
      <ProvideLogger logger={logger}>
        <RightRow
          leaf={viewModel}
          node={node}
          isCollapsed={viewModel.isCollapsed}
        >
          {renderChildren &&
            viewModel.children.map((propLeaf) =>
              decideRowByPropType(propLeaf, layoutP),
            )}
        </RightRow>
      </ProvideLogger>
    )
  }, [viewModel, layoutP])
}

export default RightPropWithChildrenRow
