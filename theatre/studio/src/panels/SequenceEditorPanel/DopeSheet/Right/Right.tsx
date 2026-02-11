import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {usePrism} from '@tomorrowevening/theatre-react'
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

export const contentWidth = 1000000

const Wrapper = styled.div`
  position: relative;
`

const ListContainer = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  position: absolute;
  left: 0;
  width: ${contentWidth}px;
  z-index: 10;
`

const Right: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const {searchTerm, searchTrigger} = useSearch()

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

    return (
      <Wrapper>
        <HorizontallyScrollableArea layoutP={layoutP} height={height}>
          <DopeSheetSelectionView layoutP={layoutP} height={height}>
            <ListContainer style={{top: filteredTree.top + 'px'}}>
              {filteredTree.children.map((leaf) => {
                if (leaf.type === 'subSequence') {
                  return (
                    <SubSequenceRow
                      layoutP={layoutP}
                      key={createStudioSheetItemKey.forSubSequence(
                        leaf.subSequence.id,
                      )}
                      leaf={leaf}
                    />
                  )
                }
                // existing sheetObject rendering
                return (
                  <RightSheetObjectRow
                    layoutP={layoutP}
                    key={'sheetObject-' + leaf.sheetObject.address.objectKey}
                    leaf={leaf}
                  />
                )
              })}
            </ListContainer>
          </DopeSheetSelectionView>
        </HorizontallyScrollableArea>
      </Wrapper>
    )
  }, [layoutP, searchTerm, searchTrigger])
}

export default Right
