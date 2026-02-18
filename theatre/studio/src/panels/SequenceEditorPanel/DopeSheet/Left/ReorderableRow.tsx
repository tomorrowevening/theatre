import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_AllRowTypes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React, {useCallback, useState} from 'react'
import {useSequenceEditorReorder} from './useSequenceEditorReorder'
import {useCssCursorLock} from '@tomorrowevening/theatre-studio/uiComponents/PointerEventsHandler'
import {useReorderContext} from './ReorderContext'

const ReorderableRow: React.VFC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  flattenedList: SequenceEditorTree_AllRowTypes[]
  leaf: SequenceEditorTree_AllRowTypes
  children: React.ReactNode
  style: React.CSSProperties
}> = ({layoutP, flattenedList, leaf, children, style}) => {
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null)
  const rowRef = useCallback((node: HTMLDivElement | null) => {
    setRowEl(node)
  }, [])
  const {state, setReorderState} = useReorderContext()
  const [isDragging] = useSequenceEditorReorder(
    layoutP,
    flattenedList,
    leaf,
    {current: rowEl},
    setReorderState,
  )

  useCssCursorLock(isDragging, 'reordering', 'ns-resize')

  const isActive = state.activeItemKey === leaf.sheetItemKey
  const isSwapTarget = state.swapTargetKey === leaf.sheetItemKey

  return (
    <div
      ref={rowRef}
      style={{
        ...style,
        position: 'absolute',
        zIndex: isDragging ? 10 : undefined,
        ...(isActive && {
          border: '2px solid rgba(64, 170, 164, 0.9)',
          borderRadius: 2,
          boxSizing: 'border-box',
        }),
        ...(isSwapTarget && {
          border: '2px dashed rgba(64, 170, 164, 0.7)',
          borderRadius: 2,
          boxSizing: 'border-box',
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 4px,
            rgba(64, 170, 164, 0.08) 4px,
            rgba(64, 170, 164, 0.08) 8px
          )`,
        }),
      }}
    >
      {children}
    </div>
  )
}

export default ReorderableRow
