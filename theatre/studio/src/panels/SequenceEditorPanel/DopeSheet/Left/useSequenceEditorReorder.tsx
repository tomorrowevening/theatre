import type {SequenceEditorTree_AllRowTypes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {StudioSheetItemKey} from '@tomorrowevening/theatre-shared/utils/ids'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import {useCallback, useMemo, useRef} from 'react'

export function useSequenceEditorReorder(
  layoutP: Pointer<SequenceEditorPanelLayout>,
  flattenedList: SequenceEditorTree_AllRowTypes[],
  leaf: SequenceEditorTree_AllRowTypes,
  nodeRef: {current: HTMLDivElement | null},
  setReorderState: (update: {
    activeItemKey?: StudioSheetItemKey | null
    swapTargetKey?: StudioSheetItemKey | null
  }) => void,
) {
  const layoutPRef = useRef(layoutP)
  layoutPRef.current = layoutP
  const flattenedListRef = useRef(flattenedList)
  flattenedListRef.current = flattenedList

  const onReorder = useCallback(
    (
      newOrder: StudioSheetItemKey[],
      parentKey: StudioSheetItemKey | undefined,
    ) => {
      const studio = getStudio()
      if (!studio) return
      const sheet = val(layoutPRef.current.sheet)
      const sheetAddress = {
        projectId: sheet.address.projectId,
        sheetId: sheet.address.sheetId,
      }
      studio.transaction(({stateEditors}) => {
        if (parentKey === undefined || parentKey === 'sheet') {
          stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence.sheetItemDisplayOrder.reorderAtSheetLevel(
            {...sheetAddress, newOrder},
          )
        } else {
          stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence.sheetItemDisplayOrder.reorderChildren(
            {...sheetAddress, parentKey, newOrder},
          )
        }
      })
    },
    [],
  )

  const dragOpts = useMemo(
    () => ({
      debugName: 'SequenceEditorReorder',
      onDragStart: () => {
        const list = flattenedListRef.current
        const item = leaf
        const parentKey =
          'parentSheetItemKey' in item ? item.parentSheetItemKey : undefined
        const siblings = list.filter(
          (l) =>
            ('parentSheetItemKey' in l ? l.parentSheetItemKey : undefined) ===
            parentKey,
        )
        if (siblings.length <= 1) return false
        const itemByKey = new Map(siblings.map((s) => [s.sheetItemKey, s]))
        const siblingKeys = siblings.map((s) => s.sheetItemKey)
        let lastOrder = [...siblingKeys]
        let activeIndex = lastOrder.indexOf(item.sheetItemKey)
        if (activeIndex === -1) return false
        setReorderState({activeItemKey: item.sheetItemKey, swapTargetKey: null})
        return {
          onDragEnd: () => {
            setReorderState({activeItemKey: null, swapTargetKey: null})
          },
          onDrag: (_x: number, totalDragDeltaY: number) => {
            const activeCenter =
              item.top + item.nodeHeight / 2 + totalDragDeltaY
            const prevKey = lastOrder[activeIndex - 1]
            const nextKey = lastOrder[activeIndex + 1]
            const prev = prevKey ? itemByKey.get(prevKey) : undefined
            const next = nextKey ? itemByKey.get(nextKey) : undefined
            setReorderState({swapTargetKey: null})
            if (next) {
              const nextCenter = next.top + next.nodeHeight / 2
              if (activeCenter > nextCenter) {
                setReorderState({swapTargetKey: nextKey})
                const newOrder = [...lastOrder]
                ;[newOrder[activeIndex], newOrder[activeIndex + 1]] = [
                  newOrder[activeIndex + 1],
                  newOrder[activeIndex],
                ]
                lastOrder = newOrder
                activeIndex += 1
                onReorder(newOrder, parentKey)
              }
            }
            if (prev) {
              const prevCenter = prev.top + prev.nodeHeight / 2
              if (activeCenter < prevCenter) {
                setReorderState({swapTargetKey: prevKey})
                const newOrder = [...lastOrder]
                ;[newOrder[activeIndex - 1], newOrder[activeIndex]] = [
                  newOrder[activeIndex],
                  newOrder[activeIndex - 1],
                ]
                lastOrder = newOrder
                activeIndex -= 1
                onReorder(newOrder, parentKey)
              }
            }
          },
        }
      },
    }),
    [
      leaf.sheetItemKey,
      leaf.top,
      leaf.nodeHeight,
      (leaf as {parentSheetItemKey?: StudioSheetItemKey}).parentSheetItemKey,
      onReorder,
      setReorderState,
    ],
  )

  return useDrag(nodeRef?.current ?? null, dragOpts)
}
