import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {getOutlineSelection} from '@tomorrowevening/theatre-studio/selectors'
import {usePrism} from '@tomorrowevening/theatre-react'
import React, {useCallback} from 'react'
import BaseItem from '@tomorrowevening/theatre-studio/panels/OutlinePanel/BaseItem'
import type Sheet from '@tomorrowevening/theatre-core/sheets/Sheet'

export const SheetInstanceItem: React.FC<{
  depth: number
  sheet: Sheet
}> = ({sheet, depth}) => {
  const setSelectedSheet = useCallback(() => {
    getStudio()!.transaction(({stateEditors}) => {
      stateEditors.studio.historic.panels.outline.selection.set([sheet])
    })
  }, [sheet])

  return usePrism(() => {
    const selection = getOutlineSelection()

    return (
      <BaseItem
        depth={depth}
        select={setSelectedSheet}
        selectionStatus={
          selection.some((s) => s === sheet)
            ? 'selected'
            : selection.some(
                (s) => s.type === 'Theatre_SheetObject' && s.sheet === sheet,
              )
            ? 'descendant-is-selected'
            : 'not-selected'
        }
        label={`${sheet.address.sheetId}: ${sheet.address.sheetInstanceId}`}
      />
    )
  }, [depth])
}
