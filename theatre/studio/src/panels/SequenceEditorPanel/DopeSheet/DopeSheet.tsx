import {useVal} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import Left from './Left/Left'
import DopesheetSplitter from './DopesheetSplitter'
import DopeSheetBackground from './Right/DopeSheetBackground'
import Right from './Right/Right'
import VerticalScrollContainer from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/VerticalScrollContainer'

const Container = styled.div`
  position: absolute;
  left: 0;
  right: 0;
`

const DopeSheet: React.VFC<{layoutP: Pointer<SequenceEditorPanelLayout>}> = ({
  layoutP,
}) => {
  const height = useVal(layoutP.dopeSheetDims.height)

  return (
    <Container style={{height: height + 'px'}}>
      <DopeSheetBackground layoutP={layoutP} />
      <VerticalScrollContainer>
        <Left layoutP={layoutP} />
        <Right layoutP={layoutP} />
      </VerticalScrollContainer>
      <DopesheetSplitter layoutP={layoutP} />
    </Container>
  )
}

export default DopeSheet
