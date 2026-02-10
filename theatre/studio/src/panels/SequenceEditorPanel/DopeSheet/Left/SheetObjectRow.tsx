import type {SequenceEditorTree_SheetObject} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React from 'react'
import AnyCompositeRow from './AnyCompositeRow'
import {decideRowByPropType} from './PropWithChildrenRow'
import {setCollapsedSheetItem} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/setCollapsedSheetObjectOrCompoundProp'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {useEditingToolsForCompoundProp} from '@tomorrowevening/theatre-studio/propEditors/useEditingToolsForCompoundProp'

const LeftSheetObjectRow: React.FC<{
  leaf: SequenceEditorTree_SheetObject
}> = ({leaf}) => {
  const obj = leaf.sheetObject
  const tools = useEditingToolsForCompoundProp(
    obj.propsP,
    obj,
    obj.template.staticConfig,
  )

  return (
    <AnyCompositeRow
      leaf={leaf}
      label={leaf.sheetObject.address.objectKey}
      isCollapsed={leaf.isCollapsed}
      contextMenuItems={tools.contextMenuItems}
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
      {leaf.children.map((leaf) => decideRowByPropType(leaf))}
    </AnyCompositeRow>
  )
}

export default LeftSheetObjectRow
