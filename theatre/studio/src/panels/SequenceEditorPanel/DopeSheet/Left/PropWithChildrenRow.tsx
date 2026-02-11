import type {
  SequenceEditorTree_PrimitiveProp,
  SequenceEditorTree_PropWithChildren,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React from 'react'
import AnyCompositeRow from './AnyCompositeRow'
import PrimitivePropRow from './PrimitivePropRow'
import {setCollapsedSheetItem} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/setCollapsedSheetObjectOrCompoundProp'
import {useEditingToolsForCompoundProp} from '@tomorrowevening/theatre-studio/propEditors/useEditingToolsForCompoundProp'
import pointerDeep from '@tomorrowevening/theatre-shared/utils/pointerDeep'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import type {$IntentionalAny} from '@tomorrowevening/theatre-shared/utils/types'

export const decideRowByPropType = (
  leaf: SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp,
): React.ReactElement => {
  const key = 'prop' + leaf.pathToProp[leaf.pathToProp.length - 1]
  return leaf.shouldRender ? (
    leaf.type === 'propWithChildren' ? (
      <PropWithChildrenRow leaf={leaf} key={key} />
    ) : (
      <PrimitivePropRow leaf={leaf} key={key} />
    )
  ) : (
    <React.Fragment key={key} />
  )
}

const PropWithChildrenRow: React.VFC<{
  leaf: SequenceEditorTree_PropWithChildren
}> = ({leaf}) => {
  const pointerToProp = pointerDeep(
    leaf.sheetObject.propsP,
    leaf.pathToProp,
  ) as Pointer<$IntentionalAny>

  const tools = useEditingToolsForCompoundProp(
    pointerToProp,
    leaf.sheetObject,
    leaf.propConf,
  )

  return (
    <AnyCompositeRow
      leaf={leaf}
      label={leaf.propConf.label ?? leaf.pathToProp[leaf.pathToProp.length - 1]}
      isCollapsed={leaf.isCollapsed}
      contextMenuItems={tools.contextMenuItems}
      toggleCollapsed={() =>
        setCollapsedSheetItem(!leaf.isCollapsed, {
          sheetAddress: leaf.sheetObject.address,
          sheetItemKey: leaf.sheetItemKey,
        })
      }
    >
      {leaf.children.map((propLeaf) => decideRowByPropType(propLeaf))}
    </AnyCompositeRow>
  )
}

export default PropWithChildrenRow
