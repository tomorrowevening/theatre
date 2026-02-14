import type {SequenceEditorTree_Sheet} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import {usePrism} from '@tomorrowevening/theatre-react'
import React from 'react'
import LeftSheetObjectRow from './SheetObjectRow'
import AnyCompositeRow from './AnyCompositeRow'
import SubSequenceRow from './SubSequenceRow'
import {setCollapsedSheetItem} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/setCollapsedSheetObjectOrCompoundProp'
import uniqueKeyForAnyObject from '@tomorrowevening/theatre-shared/utils/uniqueKeyForAnyObject'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'

const SheetRow: React.VFC<{
  leaf: SequenceEditorTree_Sheet
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  return usePrism(() => {
    return (
      <AnyCompositeRow
        leaf={leaf}
        label={leaf.sheet.address.sheetId}
        isCollapsed={leaf.isCollapsed}
        toggleCollapsed={() => {
          setCollapsedSheetItem(!leaf.isCollapsed, {
            sheetAddress: leaf.sheet.address,
            sheetItemKey: leaf.sheetItemKey,
          })
        }}
      >
        {leaf.children.map((childLeaf) =>
          childLeaf.type === 'sheetObject' ? (
            <LeftSheetObjectRow
              key={
                'sheetObject-' +
                // we don't use the object's address as the key because if a user calls `sheet.detachObject(key)` and later
                // calls `sheet.object(key)` with the same key, we want to re-render this row.
                uniqueKeyForAnyObject(childLeaf.sheetObject)
              }
              leaf={childLeaf}
              layoutP={layoutP}
            />
          ) : childLeaf.type === 'subSequence' ? (
            <SubSequenceRow key={childLeaf.sheetItemKey} leaf={childLeaf} />
          ) : null,
        )}
      </AnyCompositeRow>
    )
  }, [leaf, layoutP])
}

export default SheetRow
