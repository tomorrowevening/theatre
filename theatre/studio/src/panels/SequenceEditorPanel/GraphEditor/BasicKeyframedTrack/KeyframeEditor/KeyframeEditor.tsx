import type {
  Keyframe,
  TrackData,
} from '@tomorrowevening/theatre-core/projects/store/types/SheetState_Historic'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {
  SequenceTrackId,
  StudioSheetItemKey,
} from '@tomorrowevening/theatre-shared/utils/ids'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React from 'react'
import styled from 'styled-components'
import type {graphEditorColors} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/GraphEditor/GraphEditor'
import type {ExtremumSpace} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/GraphEditor/BasicKeyframedTrack/BasicKeyframedTrack'
import Curve from './Curve'
import CurveHandle from './CurveHandle'
import GraphEditorDotScalar from './GraphEditorDotScalar'
import GraphEditorDotNonScalar from './GraphEditorDotNonScalar'
import GraphEditorNonScalarDash from './GraphEditorNonScalarDash'
import type {PropTypeConfig_AllSimples} from '@tomorrowevening/theatre-core/propTypes'
import type {PathToProp} from '@tomorrowevening/theatre-shared/utils/addresses'

const Container = styled.g`
  /* position: absolute; */
`

const noConnector = <></>

type IKeyframeEditorProps = {
  index: number
  keyframe: Keyframe
  trackData: TrackData
  itemKey: StudioSheetItemKey
  layoutP: Pointer<SequenceEditorPanelLayout>
  trackId: SequenceTrackId
  sheetObject: SheetObject
  pathToProp: PathToProp
  extremumSpace: ExtremumSpace
  isScalar: boolean
  color: keyof typeof graphEditorColors
  propConfig: PropTypeConfig_AllSimples
}

const KeyframeEditor: React.VFC<IKeyframeEditorProps> = (props) => {
  const {index, trackData, isScalar} = props
  const cur = trackData.keyframes[index]
  const next = trackData.keyframes[index + 1]

  const connected = cur.connectedRight && !!next
  const shouldShowCurve = connected && next.value !== cur.value

  return (
    <Container>
      {shouldShowCurve ? (
        <>
          <Curve {...props} />
          {!cur.type ||
            (cur.type === 'bezier' && (
              <>
                <CurveHandle {...props} which="left" />
                <CurveHandle {...props} which="right" />
              </>
            ))}
        </>
      ) : (
        noConnector
      )}
      {isScalar ? (
        <GraphEditorDotScalar {...props} />
      ) : (
        <>
          <GraphEditorDotNonScalar {...props} which="left" />
          <GraphEditorDotNonScalar {...props} which="right" />
          <GraphEditorNonScalarDash {...props} />
        </>
      )}
    </Container>
  )
}

export default KeyframeEditor
