import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_Sheet} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import {usePrism} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import RightSheetObjectRow from './SheetObjectRow'
import RightRow from './Row'
import {collectAggregateKeyframesInPrism} from './collectAggregateKeyframes'
import AggregatedKeyframeTrack from './AggregatedKeyframeTrack/AggregatedKeyframeTrack'
import SubSequenceRow from './SubSequenceRow'

const SheetRow: React.FC<{
  leaf: SequenceEditorTree_Sheet
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  return usePrism(() => {
    const aggregatedKeyframes = collectAggregateKeyframesInPrism(leaf)

    const node = (
      <AggregatedKeyframeTrack
        layoutP={layoutP}
        aggregatedKeyframes={aggregatedKeyframes}
        viewModel={leaf}
      />
    )

    return (
      <RightRow leaf={leaf} node={node} isCollapsed={leaf.isCollapsed}>
        {leaf.children.map((childLeaf) =>
          childLeaf.type === 'sheetObject' ? (
            <RightSheetObjectRow
              layoutP={layoutP}
              key={'sheetObject-' + childLeaf.sheetObject.address.objectKey}
              leaf={childLeaf}
            />
          ) : childLeaf.type === 'subSequence' ? (
            <SubSequenceRow
              layoutP={layoutP}
              leaf={childLeaf}
              key={childLeaf.sheetItemKey}
            />
          ) : null,
        )}
      </RightRow>
    )
  }, [leaf, layoutP])
}

export default SheetRow
