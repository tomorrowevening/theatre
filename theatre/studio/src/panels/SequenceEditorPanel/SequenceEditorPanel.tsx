import {getOutlineSelection} from '@tomorrowevening/theatre-studio/selectors'
import {usePrism} from '@tomorrowevening/theatre-react'
import {valToAtom} from '@tomorrowevening/theatre-shared/utils/valToAtom'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import React, {useState} from 'react'
import styled from 'styled-components'

import DopeSheet from './DopeSheet/DopeSheet'
import GraphEditor from './GraphEditor/GraphEditor'
import type {PanelDims, SequenceEditorPanelLayout} from './layout/layout'
import {sequenceEditorPanelLayout} from './layout/layout'
import RightOverlay from './RightOverlay/RightOverlay'
import BasePanel, {
  usePanel,
} from '@tomorrowevening/theatre-studio/panels/BasePanel/BasePanel'
import type {PanelPosition} from '@tomorrowevening/theatre-studio/store/types'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import BasicNumberInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicNumberInput'
import clamp from 'lodash-es/clamp'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import PanelDragZone from '@tomorrowevening/theatre-studio/panels/BasePanel/PanelDragZone'
import PanelWrapper from '@tomorrowevening/theatre-studio/panels/BasePanel/PanelWrapper'
import FrameStampPositionProvider from './FrameStampPositionProvider'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type Sheet from '@tomorrowevening/theatre-core/sheets/Sheet'
import {
  isSheet,
  isSheetObject,
} from '@tomorrowevening/theatre-shared/instanceTypes'
import {uniq} from 'lodash-es'
import GraphEditorToggle from './GraphEditorToggle'
import {
  panelZIndexes,
  TitleBar,
  TitleBar_Piece,
  TitleBar_Punctuation,
} from '@tomorrowevening/theatre-studio/panels/BasePanel/common'
import type {UIPanelId} from '@tomorrowevening/theatre-shared/utils/ids'
import {usePresenceListenersOnRootElement} from '@tomorrowevening/theatre-studio/uiComponents/usePresence'

const Container = styled(PanelWrapper)`
  z-index: ${panelZIndexes.sequenceEditorPanel};
  box-shadow: 2px 2px 0 rgb(0 0 0 / 11%);
`

const LeftBackground = styled.div`
  background-color: rgba(40, 43, 47, 0.99);
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
`

export const zIndexes = (() => {
  const s = {
    rightBackground: 0,
    scrollableArea: 0,
    rightOverlay: 0,
    lengthIndicatorCover: 0,
    lengthIndicatorStrip: 0,
    playhead: 0,
    currentFrameStamp: 0,
    marker: 0,
    horizontalScrollbar: 0,
  }

  // sort the z-indexes
  let i = -1
  for (const key of Object.keys(s)) {
    s[key] = i
    i++
  }

  return s
})()

const Header_Container = styled(PanelDragZone)`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;

  ${TitleBar} {
    height: 30px;
  }
`

const defaultPosition: PanelPosition = {
  edges: {
    left: {from: 'screenLeft', distance: 0.1},
    right: {from: 'screenRight', distance: 0.2},
    top: {from: 'screenBottom', distance: 0.4},
    bottom: {from: 'screenBottom', distance: 0.01},
  },
}

const minDims = {width: 800, height: 200}

const SequenceEditorPanel: React.VFC<{}> = (props) => {
  return (
    <BasePanel
      panelId={'sequenceEditor' as UIPanelId}
      defaultPosition={defaultPosition}
      minDims={minDims}
    >
      <Content />
    </BasePanel>
  )
}

const Content: React.VFC<{}> = () => {
  const {dims} = usePanel()
  const [containerNode, setContainerNode] = useState<null | HTMLDivElement>(
    null,
  )
  usePresenceListenersOnRootElement(containerNode)
  return usePrism(() => {
    const panelSize = prism.memo(
      'panelSize',
      (): PanelDims => {
        const width = dims.width
        const height = dims.height
        return {
          width: width,
          height: height,

          widthWithoutBorder: width - 2,
          heightWithoutBorder: height - 4,

          screenX: dims.left,
          screenY: dims.top,
        }
      },
      [dims],
    )

    const selectedSheets = uniq(
      getOutlineSelection()
        .filter((s): s is SheetObject | Sheet => isSheet(s) || isSheetObject(s))
        .map((s) => (isSheetObject(s) ? s.sheet : s)),
    )
    const selectedTemplates = uniq(selectedSheets.map((s) => s.template))

    if (selectedTemplates.length !== 1) return <></>
    const sheet = selectedSheets[0]

    if (!sheet) return <></>

    const panelSizeP = valToAtom('panelSizeP', panelSize).pointer

    // We make a unique key based on the sheet's address, so that
    // <Left /> and <Right />
    // don't have to listen to changes in sheet
    const key = prism.memo('key', () => JSON.stringify(sheet.address), [sheet])

    const layoutP = prism
      .memo(
        'layout',
        () => {
          return sequenceEditorPanelLayout(sheet, panelSizeP)
        },
        [sheet, panelSizeP],
      )
      .getValue()

    // Show sequence editor if there are keyframed properties, or if there's a sequence duration or markers
    const hasChildren = val(layoutP.tree.children).length > 0
    const sequenceState = val(
      sheet.project.pointers.historic.sheetsById[sheet.address.sheetId]
        .sequence,
    )
    const hasSequenceData =
      (sequenceState?.length && sequenceState.length > 0) ||
      (sequenceState?.markers && sequenceState.markers.length > 0)

    if (!hasChildren && !hasSequenceData) return <></>

    const containerRef = prism.memo(
      'containerRef',
      preventHorizontalWheelEvents,
      [],
    )

    const graphEditorAvailable = val(layoutP.graphEditorDims.isAvailable)
    const graphEditorOpen = val(layoutP.graphEditorDims.isOpen)

    return (
      <Container
        ref={(elt) => {
          containerRef(elt as HTMLDivElement)
          if (elt !== containerNode) {
            setContainerNode(elt as HTMLDivElement)
          }
        }}
      >
        <LeftBackground style={{width: `${val(layoutP.leftDims.width)}px`}} />
        <FrameStampPositionProvider layoutP={layoutP}>
          <Header layoutP={layoutP} />
          <DopeSheet key={key + '-dopeSheet'} layoutP={layoutP} />
          {graphEditorOpen && (
            <GraphEditor key={key + '-graphEditor'} layoutP={layoutP} />
          )}
          {graphEditorAvailable && <GraphEditorToggle layoutP={layoutP} />}
          <RightOverlay layoutP={layoutP} />
        </FrameStampPositionProvider>
      </Container>
    )
  }, [dims, containerNode])
}

const Header: React.FC<{layoutP: Pointer<SequenceEditorPanelLayout>}> = ({
  layoutP,
}) => {
  return usePrism(() => {
    const sheet = val(layoutP.sheet)
    const sequence = sheet.getSequence()

    return (
      <Header_Container
        style={{
          width: val(layoutP.leftDims.width),
        }}
      >
        <TitleBar>
          <TitleBar_Piece>{sheet.address.sheetId}</TitleBar_Piece>

          <TimeInputsContainer>
            <PositionInput layoutP={layoutP} />
            <TitleBar_Punctuation>/</TitleBar_Punctuation>
            <DurationInput layoutP={layoutP} />
            <TitleBar_Punctuation>@</TitleBar_Punctuation>
            <FpsInput layoutP={layoutP} />
            <TitleBar_Piece style={{fontSize: '9px', opacity: 0.7}}>
              fps
            </TitleBar_Piece>
          </TimeInputsContainer>
        </TitleBar>
      </Header_Container>
    )
  }, [layoutP])
}

const TimeInputsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  margin-right: 8px;
`

const TimeInput = styled(BasicNumberInput)`
  width: 50px;
  height: 20px;
  font-size: 12px;
  padding: 0;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #adadadb3;
  border-radius: 2px;

  &:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }
`

const PositionInput: React.FC<{layoutP: Pointer<SequenceEditorPanelLayout>}> =
  ({layoutP}) => {
    return usePrism(() => {
      const sheet = val(layoutP.sheet)
      const sequence = sheet.getSequence()
      const value = Number(val(sequence.pointer.position).toFixed(3))

      let tempPosition: number | undefined
      const originalPosition = sequence.position

      const fns = {
        temporarilySetValue(newPosition: number): void {
          if (tempPosition !== undefined) {
            tempPosition = undefined
          }
          tempPosition = clamp(newPosition, 0, sequence.length)
          sequence.position = tempPosition
        },
        discardTemporaryValue(): void {
          if (tempPosition !== undefined) {
            tempPosition = undefined
            sequence.position = originalPosition
          }
        },
        permanentlySetValue(newPosition: number): void {
          if (tempPosition !== undefined) {
            tempPosition = undefined
          }
          sequence.position = clamp(newPosition, 0, sequence.length)
        },
      }

      return (
        <TimeInput
          value={value}
          {...fns}
          isValid={(v) => isFinite(v) && v >= 0}
          nudge={({deltaX}) => deltaX * 0.01}
        />
      )
    }, [layoutP])
  }

const DurationInput: React.FC<{layoutP: Pointer<SequenceEditorPanelLayout>}> =
  ({layoutP}) => {
    return usePrism(() => {
      const sheet = val(layoutP.sheet)
      const sequence = sheet.getSequence()
      const sequenceLength = sequence.length

      let tempTransaction: CommitOrDiscard | undefined

      const fns = {
        temporarilySetValue(newLength: number): void {
          if (tempTransaction) {
            tempTransaction.discard()
            tempTransaction = undefined
          }
          tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
            stateEditors.coreByProject.historic.sheetsById.sequence.setLength({
              ...sheet.address,
              length: newLength,
            })
          })
        },
        discardTemporaryValue(): void {
          if (tempTransaction) {
            tempTransaction.discard()
            tempTransaction = undefined
          }
        },
        permanentlySetValue(newLength: number): void {
          if (tempTransaction) {
            tempTransaction.discard()
            tempTransaction = undefined
          }
          getStudio()!.transaction(({stateEditors}) => {
            stateEditors.coreByProject.historic.sheetsById.sequence.setLength({
              ...sheet.address,
              length: newLength,
            })
          })
        },
      }

      return (
        <TimeInput
          value={sequenceLength}
          {...fns}
          isValid={(v) => isFinite(v) && v > 0}
          nudge={({deltaX}) => deltaX * 0.1}
        />
      )
    }, [layoutP])
  }

const FpsInput: React.FC<{layoutP: Pointer<SequenceEditorPanelLayout>}> = ({
  layoutP,
}) => {
  return usePrism(() => {
    const sheet = val(layoutP.sheet)
    const sequence = sheet.getSequence()
    const fps = sequence.subUnitsPerUnit

    let tempTransaction: CommitOrDiscard | undefined

    const fns = {
      temporarilySetValue(newFps: number): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          stateEditors.coreByProject.historic.sheetsById.sequence.setSubUnitsPerUnit(
            {
              ...sheet.address,
              subUnitsPerUnit: newFps,
            },
          )
        })
      },
      discardTemporaryValue(): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
      },
      permanentlySetValue(newFps: number): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        getStudio()!.transaction(({stateEditors}) => {
          stateEditors.coreByProject.historic.sheetsById.sequence.setSubUnitsPerUnit(
            {
              ...sheet.address,
              subUnitsPerUnit: newFps,
            },
          )
        })
      },
    }

    return (
      <TimeInput
        value={fps}
        {...fns}
        isValid={(v) => isFinite(v) && v >= 1 && v <= 2 ** 12}
        nudge={({deltaX}) => deltaX * 1}
      />
    )
  }, [layoutP])
}

export default SequenceEditorPanel

const preventHorizontalWheelEvents = () => {
  let lastNode: null | HTMLElement = null
  const listenerOptions = {
    passive: false,
    capture: false,
  }

  const receiveWheelEvent = (event: WheelEvent) => {
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (node: HTMLElement | null) => {
    if (lastNode !== node && lastNode) {
      lastNode.removeEventListener('wheel', receiveWheelEvent, listenerOptions)
    }
    lastNode = node
    if (node) {
      node.addEventListener('wheel', receiveWheelEvent, listenerOptions)
    }
  }
}
