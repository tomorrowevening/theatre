import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studiopanelsSequenceEditorPanellayoutlayout'
import {usePrism} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import LeftSheetObjectRow from './SheetObjectRow'
import uniqueKeyForAnyObject from '@tomorrowevening/theatre-shared/utils/uniqueKeyForAnyObject'
import {useSearch} from '@tomorrowevening/theatre-studiopanelsSequenceEditorPanelSearchContext'
import {filterSequenceEditorTree} from '@tomorrowevening/theatre-studiopanelsSequenceEditorPanellayout\treeSearch'

const Container = styled.div`
  position: absolute;
  left: 0;
  overflow-x: visible;
`

const ListContainer = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const Left: React.VFC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const {searchTerm, searchTrigger} = useSearch()

  return usePrism(() => {
    const tree = val(layoutP.tree)
    const width = val(layoutP.leftDims.width)

    // Apply search filter if search term exists
    const filteredTree = searchTerm.trim()
      ? filterSequenceEditorTree(tree, searchTerm)
      : tree

    return (
      <Container style={{width: width + 'px', top: filteredTree.top + 'px'}}>
        <ListContainer>
          {filteredTree.children.map((sheetObjectLeaf) => (
            <LeftSheetObjectRow
              key={
                'sheetObject-' +
                uniqueKeyForAnyObject(sheetObjectLeaf.sheetObject)
              }
              leaf={sheetObjectLeaf}
            />
          ))}
        </ListContainer>
      </Container>
    )
  }, [layoutP, searchTerm, searchTrigger])
}

export default Left
