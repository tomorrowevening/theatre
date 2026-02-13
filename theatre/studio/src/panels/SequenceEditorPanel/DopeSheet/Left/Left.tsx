import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {usePrism, useVal} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React, {useCallback, useLayoutEffect, useRef, useState} from 'react'
import styled from 'styled-components'
import LeftSheetObjectRow from './SheetObjectRow'
import SubSequenceRow from './SubSequenceRow'
import uniqueKeyForAnyObject from '@tomorrowevening/theatre-shared/utils/uniqueKeyForAnyObject'
import {createStudioSheetItemKey} from '@tomorrowevening/theatre-shared/utils/ids'
import {useSearch} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/SearchContext'
import {filterSequenceEditorTree} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/treeSearch'
import usePopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/BasicPopover'
import {flattenSequenceEditorTree} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/utils'
import {useVerticalScrollState} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/VerticalScrollContainer'
import {decideRowByPropType} from './PropWithChildrenRow'
import type {SequenceEditorTree_AllRowTypes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'

const Container = styled.div`
  position: absolute;
  left: 0;
  overflow-x: visible;

  &.drop-target {
    background: rgba(64, 170, 164, 0.1);
    outline: 2px dashed rgba(64, 170, 164, 0.5);
    outline-offset: -2px;
  }
`

const ListContainer = styled.div`
  margin: 0 0 50px 0;
  padding: 0;
  position: relative;
`

const Left: React.VFC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const {searchTerm, searchTrigger} = useSearch()
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedData, setDroppedData] = useState<{
    sheetId: string
    projectId: string
    sheetInstanceId: string
  } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollStateP = useVerticalScrollState()

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation()
    }

    node.addEventListener('wheel', handleWheel, {passive: true})
    return () => node.removeEventListener('wheel', handleWheel)
  }, [])

  const addSubSequencePopover = usePopover(
    {debugName: 'Left/addSubSequence'},
    () => {
      if (!droppedData) return <></>

      let newLabel = droppedData.sheetId

      return (
        <BasicPopover>
          <div style={{padding: '8px', minWidth: '300px'}}>
            <div
              style={{marginBottom: '8px', fontWeight: 'bold', color: '#CCC'}}
            >
              Add Sub-sequence
            </div>
            <div style={{marginBottom: '4px', fontSize: '11px', color: '#999'}}>
              Label:
            </div>
            <input
              type="text"
              defaultValue={droppedData.sheetId}
              onChange={(e) => {
                newLabel = e.target.value
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                marginBottom: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                color: '#FFF',
                fontSize: '11px',
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // OK button logic
                  const sheet = val(layoutP.sheet)
                  const sequence = sheet.getSequence()
                  sequence.addSubSequence(droppedData.sheetId, 0, {
                    label: newLabel.trim() || droppedData.sheetId,
                  })
                  addSubSequencePopover.close('user action')
                  setDroppedData(null)
                } else if (e.key === 'Escape') {
                  addSubSequencePopover.close('user action')
                  setDroppedData(null)
                }
              }}
            />
            <div
              style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}
            >
              <button
                onClick={() => {
                  addSubSequencePopover.close('user action')
                  setDroppedData(null)
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#CCC',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const sheet = val(layoutP.sheet)
                  const sequence = sheet.getSequence()
                  sequence.addSubSequence(droppedData.sheetId, 0, {
                    label: newLabel.trim() || droppedData.sheetId,
                  })
                  addSubSequencePopover.close('user action')
                  setDroppedData(null)
                }}
                style={{
                  padding: '6px 12px',
                  background: '#40AAA4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Ok
              </button>
            </div>
          </div>
        </BasicPopover>
      )
    },
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      try {
        const data = e.dataTransfer.getData('application/json')
        if (!data) return

        const dragData = JSON.parse(data)
        if (dragData.type !== 'theatre-sheet') return

        // Store the dropped data and open the popover
        setDroppedData({
          sheetId: dragData.sheetId,
          projectId: dragData.projectId,
          sheetInstanceId: dragData.sheetInstanceId,
        })

        // Open the popover at the drop location
        if (containerRef.current) {
          addSubSequencePopover.open(
            {clientX: e.clientX, clientY: e.clientY},
            containerRef.current,
          )
        }
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    },
    [addSubSequencePopover],
  )

  const {scrollTop, clientHeight} = useVal(scrollStateP)

  return usePrism(() => {
    const tree = val(layoutP.tree)
    const width = val(layoutP.leftDims.width)

    // Apply search filter if search term exists
    const filteredTree = searchTerm.trim()
      ? filterSequenceEditorTree(tree, searchTerm)
      : tree

    const flattenedList = flattenSequenceEditorTree(filteredTree)
    const visibleItems: SequenceEditorTree_AllRowTypes[] = []
    const buffer = 500 // pixels buffer
    const minTop = scrollTop - buffer
    const maxTop = scrollTop + clientHeight + buffer

    let startIndex = -1
    for (let i = 0; i < flattenedList.length; i++) {
      const item = flattenedList[i]
      if (item.top + item.nodeHeight >= minTop) {
        startIndex = i
        break
      }
    }

    if (startIndex !== -1) {
      for (let i = startIndex; i < flattenedList.length; i++) {
        const item = flattenedList[i]
        if (item.top > maxTop) {
          break
        }
        visibleItems.push(item)
      }
    }

    const lastItem = flattenedList[flattenedList.length - 1]
    const totalHeight = lastItem ? lastItem.top + lastItem.nodeHeight : 0

    return (
      <>
        {addSubSequencePopover.node}
        <Container
          id="leftContainer"
          ref={containerRef}
          style={{
            width: width + 'px',
            top: 0,
            pointerEvents: droppedData !== null ? 'none' : 'auto',
          }}
          className={isDragOver ? 'drop-target' : ''}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ListContainer style={{height: totalHeight + 'px'}}>
            {visibleItems.map((leaf) => {
              let node: React.ReactNode = null
              if (leaf.type === 'subSequence') {
                node = (
                  <SubSequenceRow
                    key={createStudioSheetItemKey.forSubSequence(
                      leaf.subSequence.id,
                    )}
                    leaf={leaf}
                  />
                )
              } else if (leaf.type === 'sheetObject') {
                node = (
                  <LeftSheetObjectRow
                    key={
                      'sheetObject-' + uniqueKeyForAnyObject(leaf.sheetObject)
                    }
                    leaf={leaf}
                    renderChildren={false}
                    layoutP={layoutP}
                  />
                )
              } else if (
                leaf.type === 'propWithChildren' ||
                leaf.type === 'primitiveProp'
              ) {
                node = decideRowByPropType(leaf, false)
              }

              if (!node) return null

              return (
                <div
                  key={leaf.type + '-' + (leaf.sheetItemKey || leaf.top)}
                  style={{
                    position: 'absolute',
                    top: leaf.top + 'px',
                    width: '100%',
                  }}
                >
                  {node}
                </div>
              )
            })}
          </ListContainer>
        </Container>
      </>
    )
  }, [
    layoutP,
    searchTerm,
    searchTrigger,
    isDragOver,
    droppedData,
    handleDragOver,
    handleDrop,
    addSubSequencePopover.node,
    scrollTop,
    clientHeight,
  ])
}

export default Left
