import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {getOutlineSelection} from '@tomorrowevening/theatre-studio/selectors'
import {generateSequenceMarkerId} from '@tomorrowevening/theatre-shared/utils/ids'
import {usePrism} from '@tomorrowevening/theatre-react'
import {valToAtom} from '@tomorrowevening/theatre-shared/utils/valToAtom'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import React, {useState, useCallback, useRef} from 'react'
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
import SVGViewer from './SVGViewer'
import type {SVGViewerRef} from './SVGViewer'
import StartMenu from './StartMenu'

/**
 * Initiates a file download for the provided data with the provided file name
 */
function saveFile(content: string | Blob, fileName: string) {
  const file = new File([content], fileName)
  const objUrl = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), {
    href: objUrl,
    target: '_blank',
    rel: 'noopener',
  })
  a.setAttribute('download', fileName)
  a.click()

  setTimeout(() => {
    URL.revokeObjectURL(objUrl)
  }, 40000)
}

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
    svgViewer: 0,
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
  z-index: 2;

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

  // SVGViewer ref for controlling it from the Start Menu
  const svgViewerRef = useRef<SVGViewerRef>(null)

  const handleSVGViewerClear = useCallback(() => {
    svgViewerRef.current?.clearData()
  }, [])

  const handleSVGViewerLoad = useCallback(async () => {
    try {
      await svgViewerRef.current?.loadFromClipboard()
    } catch (error) {
      console.error('Failed to load from clipboard:', error)
    }
  }, [])

  const handleSVGViewerShow = useCallback(() => {
    svgViewerRef.current?.show()
  }, [])

  const handleSVGViewerHide = useCallback(() => {
    svgViewerRef.current?.hide()
  }, [])

  const handleFileSave = useCallback(() => {
    console.log('💾 Start Menu: Saving project files')
    try {
      const projects = val(getStudio().projectsP)
      Object.values(projects).forEach((project) => {
        if (project) {
          const projectId = project.address.projectId
          const slugifiedProjectId = projectId
            .replace(/[^\w\d'_\-]+/g, ' ')
            .trim()
          const fileName = `${slugifiedProjectId}.json`
          const str = JSON.stringify(
            getStudio().createContentOfSaveFile(projectId),
            null,
            2,
          )
          saveFile(str, fileName)
          console.log(`✅ Saved project: ${fileName}`)
        }
      })
    } catch (error) {
      console.error('❌ Failed to save project files:', error)
    }
  }, [])

  const handleMarkersAdd = useCallback(() => {
    try {
      const selectedSheets = uniq(
        getOutlineSelection()
          .filter(
            (s): s is SheetObject | Sheet => isSheet(s) || isSheetObject(s),
          )
          .map((s) => (isSheetObject(s) ? s.sheet : s)),
      )

      if (selectedSheets.length > 0) {
        const sheet = selectedSheets[0]
        const sheetSequence = sheet.getSequence()

        getStudio().transaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceMarkers(
            {
              sheetAddress: sheet.address,
              markers: [
                {
                  id: generateSequenceMarkerId(),
                  position: sheetSequence.position,
                  label: `Marker ${
                    Math.floor(sheetSequence.position * 100) / 100
                  }s`,
                },
              ],
              snappingFunction: sheetSequence.closestGridPosition,
            },
          )
        })
      } else {
        console.warn('⚠️ No sheet selected for adding marker')
      }
    } catch (error) {
      console.error('❌ Failed to add marker:', error)
    }
  }, [])

  const handleMarkersClear = useCallback(() => {
    try {
      const selectedSheets = uniq(
        getOutlineSelection()
          .filter(
            (s): s is SheetObject | Sheet => isSheet(s) || isSheetObject(s),
          )
          .map((s) => (isSheetObject(s) ? s.sheet : s)),
      )

      if (selectedSheets.length > 0) {
        const sheet = selectedSheets[0]

        // Get all existing marker IDs first
        const markerSetP =
          getStudio().atomP.historic.projects.stateByProjectId[
            sheet.address.projectId
          ].stateBySheetId[sheet.address.sheetId].sequenceEditor.markerSet
        const markerAllIds = val(markerSetP.allIds)

        if (markerAllIds && Object.keys(markerAllIds).length > 0) {
          // Remove each marker individually using the correct transaction pattern
          Object.keys(markerAllIds).forEach((markerId) => {
            getStudio().transaction(({stateEditors}) => {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.removeMarker(
                {
                  sheetAddress: sheet.address,
                  markerId: markerId as any,
                },
              )
            })
          })
        } else {
          console.log('ℹ️ No markers to clear')
        }
      } else {
        console.warn('⚠️ No sheet selected for clearing markers')
      }
    } catch (error) {
      console.error('❌ Failed to clear markers:', error)
    }
  }, [])

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
        <StartMenu
          layoutP={layoutP}
          onSVGViewerClear={handleSVGViewerClear}
          onSVGViewerLoad={handleSVGViewerLoad}
          onSVGViewerShow={handleSVGViewerShow}
          onSVGViewerHide={handleSVGViewerHide}
          onFileSave={handleFileSave}
          onMarkersAdd={handleMarkersAdd}
          onMarkersClear={handleMarkersClear}
        />
        <FrameStampPositionProvider layoutP={layoutP}>
          <Header layoutP={layoutP} />
          <SVGViewer
            ref={svgViewerRef}
            key={key + '-svgViewer'}
            layoutP={layoutP}
            sheetAddress={sheet.address}
            renderMode="both"
            color="#4575e3"
          />
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
            <TitleBar_Punctuation>-</TitleBar_Punctuation>
            <FrameInput layoutP={layoutP} />
            <TitleBar_Punctuation>:</TitleBar_Punctuation>
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

const FrameTimeInput = styled(TimeInput)`
  width: 40px;
`

const FpsTimeInput = styled(TimeInput)`
  width: 40px;
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
      <FpsTimeInput
        value={fps}
        {...fns}
        isValid={(v) => isFinite(v) && v >= 1 && v <= 2 ** 12}
        nudge={({deltaX}) => deltaX * 1}
      />
    )
  }, [layoutP])
}

const FrameInput: React.FC<{layoutP: Pointer<SequenceEditorPanelLayout>}> = ({
  layoutP,
}) => {
  return usePrism(() => {
    const sheet = val(layoutP.sheet)
    const sequence = sheet.getSequence()
    const fps = sequence.subUnitsPerUnit
    const position = val(sequence.pointer.position)
    const frames = Math.round(position * fps)

    let tempFrames: number | undefined
    const originalPosition = sequence.position

    const fns = {
      temporarilySetValue(newFrames: number): void {
        if (tempFrames !== undefined) {
          tempFrames = undefined
        }
        tempFrames = newFrames
        const newPosition = clamp(newFrames / fps, 0, sequence.length)
        sequence.position = newPosition
      },
      discardTemporaryValue(): void {
        if (tempFrames !== undefined) {
          tempFrames = undefined
          sequence.position = originalPosition
        }
      },
      permanentlySetValue(newFrames: number): void {
        if (tempFrames !== undefined) {
          tempFrames = undefined
        }
        const newPosition = clamp(newFrames / fps, 0, sequence.length)
        sequence.position = newPosition
      },
    }

    return (
      <FrameTimeInput
        value={frames}
        {...fns}
        isValid={(v) => isFinite(v) && v >= 0}
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
