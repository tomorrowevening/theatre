import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {usePrism, useVal} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import DopeSheetSelectionView from './DopeSheetSelectionView'
import HorizontallyScrollableArea from './HorizontallyScrollableArea'
import RightSheetObjectRow from './SheetObjectRow'
import SubSequenceRow from './SubSequenceRow'
import {useSearch} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/SearchContext'
import {filterSequenceEditorTree} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/treeSearch'
import {createStudioSheetItemKey} from '@tomorrowevening/theatre-shared/utils/ids'
import {flattenSequenceEditorTree} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/utils'
import {useVerticalScrollState} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/VerticalScrollContainer'
import {decideRowByPropType} from './PropWithChildrenRow'
import type {SequenceEditorTree_AllRowTypes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'

export const contentWidth = 1000000

const Wrapper = styled.div`
  position: relative;
`

const ListContainer = styled.div`
  margin: 0;
  padding: 0;
  position: absolute;
  left: 0;
  width: ${contentWidth}px;
  z-index: 10;
`

const Right: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const {searchTerm, searchTrigger} = useSearch()
  const scrollStateP = useVerticalScrollState()
  const {scrollTop, clientHeight} = useVal(scrollStateP)

  return usePrism(() => {
    const tree = val(layoutP.tree)

    // Apply search filter if search term exists
    const filteredTree = searchTerm.trim()
      ? filterSequenceEditorTree(tree, searchTerm)
      : tree

    const height =
      val(layoutP.tree.top) +
      // stretch the height of the dope sheet in case the rows don't cover its whole vertical space
      Math.max(
        filteredTree.heightIncludingChildren,
        val(layoutP.dopeSheetDims.height),
      )

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

    return (
      <Wrapper>
        <HorizontallyScrollableArea layoutP={layoutP} height={height}>
          <DopeSheetSelectionView layoutP={layoutP} height={height}>
            <ListContainer style={{top: '0px'}}>
              {visibleItems.map((leaf) => {
                let node: React.ReactNode = null
                if (leaf.type === 'subSequence') {
                  node = (
                    <SubSequenceRow
                      layoutP={layoutP}
                      key={createStudioSheetItemKey.forSubSequence(
                        leaf.subSequence.id,
                      )}
                      leaf={leaf}
                    />
                  )
                } else if (leaf.type === 'sheetObject') {
                  node = (
                    <RightSheetObjectRow
                      layoutP={layoutP}
                      key={'sheetObject-' + leaf.sheetObject.address.objectKey}
                      leaf={leaf}
                      renderChildren={false}
                    />
                  )
                } else if (
                  leaf.type === 'propWithChildren' ||
                  leaf.type === 'primitiveProp'
                ) {
                  node = decideRowByPropType(leaf, layoutP, false)
                }

                if (!node) return null

                return (
                  <div
                    key={leaf.type + '-' + (leaf.sheetItemKey || leaf.top)}
                    style={{
                      position: 'absolute',
                      top: leaf.top + 'px',
                      width: '100%',
                      height: leaf.nodeHeight + 'px', // Right side might need height constraint? Row component handles it?
                    }}
                  >
                    {node}
                  </div>
                )
              })}
            </ListContainer>
          </DopeSheetSelectionView>
        </HorizontallyScrollableArea>
      </Wrapper>
    )
  }, [layoutP, searchTerm, searchTrigger, scrollTop, clientHeight])
}

export default Right
