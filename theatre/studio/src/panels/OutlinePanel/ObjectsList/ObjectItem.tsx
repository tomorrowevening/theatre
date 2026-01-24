import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import React from 'react'
import BaseItem from '@tomorrowevening/theatre-studio/panels/OutlinePanel/BaseItem'
import {usePrism} from '@tomorrowevening/theatre-react'
import {getOutlineSelection} from '@tomorrowevening/theatre-studio/selectors'

export const ObjectItem: React.VFC<{
  sheetObject: SheetObject
  depth: number
  overrideLabel?: string
}> = ({sheetObject, depth, overrideLabel}) => {
  const select = () => {
    getStudio()!.transaction(({stateEditors}) => {
      stateEditors.studio.historic.panels.outline.selection.set([sheetObject])
    })
  }

  const selection = usePrism(() => getOutlineSelection(), [])

  return (
    <BaseItem
      select={select}
      label={overrideLabel ?? sheetObject.address.objectKey}
      depth={depth}
      selectionStatus={
        selection.includes(sheetObject) ? 'selected' : 'not-selected'
      }
    />
  )
}
