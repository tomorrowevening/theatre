import type {SequenceEditorTree_SheetObject} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React from 'react'
import AnyCompositeRow from './AnyCompositeRow'
import {decideRowByPropType} from './PropWithChildrenRow'
import {setCollapsedSheetItem} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/setCollapsedSheetObjectOrCompoundProp'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {useEditingToolsForCompoundProp} from '@tomorrowevening/theatre-studio/propEditors/useEditingToolsForCompoundProp'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {usePrism} from '@tomorrowevening/theatre-react'
import {pointerToPrism} from '@tomorrowevening/theatre-dataverse'
import {collectAggregateKeyframesInPrism} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'
import {
  copyKeyframes,
  pasteKeyframesAtCurrent,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/AggregatedKeyframeTrack/utils'

const LeftSheetObjectRow: React.FC<{
  leaf: SequenceEditorTree_SheetObject
  renderChildren?: boolean
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, renderChildren = true, layoutP}) => {
  const obj = leaf.sheetObject
  const tools = useEditingToolsForCompoundProp(
    obj.propsP,
    obj,
    obj.template.staticConfig,
  )

  const copyPasteItems = usePrism(() => {
    const aggregatedKeyframes = collectAggregateKeyframesInPrism(leaf)
    const hasKeyframes = aggregatedKeyframes.byPosition.size > 0
    const selectionKeyframes =
      pointerToPrism(
        getStudio()!.atomP.ahistoric.clipboard.keyframesWithRelativePaths,
      ).getValue() ?? []

    return [
      {
        label: 'Copy Keyframes',
        enabled: hasKeyframes,
        callback: () => copyKeyframes(leaf, aggregatedKeyframes),
      },
      {
        label: 'Paste Keyframes',
        enabled: selectionKeyframes.length > 0,
        callback: () =>
          pasteKeyframesAtCurrent(leaf, layoutP, selectionKeyframes),
      },
    ]
  }, [leaf, layoutP])

  return (
    <AnyCompositeRow
      leaf={leaf}
      label={leaf.sheetObject.address.objectKey}
      isCollapsed={leaf.isCollapsed}
      contextMenuItems={[...tools.contextMenuItems, ...copyPasteItems]}
      toggleSelect={() => {
        // set selection to this sheet object on click
        getStudio().transaction(({stateEditors}) => {
          stateEditors.studio.historic.panels.outline.selection.set([
            leaf.sheetObject,
          ])
        })
      }}
      toggleCollapsed={() =>
        setCollapsedSheetItem(!leaf.isCollapsed, {
          sheetAddress: leaf.sheetObject.address,
          sheetItemKey: leaf.sheetItemKey,
        })
      }
    >
      {renderChildren && leaf.children.map((leaf) => decideRowByPropType(leaf))}
    </AnyCompositeRow>
  )
}

export default LeftSheetObjectRow
