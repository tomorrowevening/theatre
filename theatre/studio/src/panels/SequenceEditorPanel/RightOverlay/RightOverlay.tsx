import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {zIndexes} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/SequenceEditorPanel'
import {usePrism} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import LengthIndicator from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/LengthIndicator/LengthIndicator'
import FrameStamp from './FrameStamp'
import HorizontalScrollbar from './HorizontalScrollbar'
import Playhead from './Playhead'
import TopStrip from './TopStrip'
import FocusRangeCurtains from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/FocusRangeCurtains'
import Markers from './Markers/Markers'
import Events from './Events/Events'

const Container = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: ${() => zIndexes.rightOverlay};
  overflow: visible;
  pointer-events: none;
`

const TopBar = styled.div`
  background: rgba(0, 0, 0, 0.33);
  pointer-events: visible;
  position: absolute;
  top: 30px;
  width: 100%;
  height: 30px;
`

const RightOverlay: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  return usePrism(() => {
    const width = val(layoutP.rightDims.width)

    return (
      <Container style={{width: width + 'px'}}>
        <Playhead layoutP={layoutP} />
        <HorizontalScrollbar layoutP={layoutP} />
        <FrameStamp layoutP={layoutP} />
        <TopStrip layoutP={layoutP} />
        <TopBar>
          <Markers layoutP={layoutP} />
          <Events layoutP={layoutP} />
        </TopBar>
        <LengthIndicator layoutP={layoutP} />
        <FocusRangeCurtains layoutP={layoutP} />
      </Container>
    )
  }, [layoutP])
}

export default RightOverlay
