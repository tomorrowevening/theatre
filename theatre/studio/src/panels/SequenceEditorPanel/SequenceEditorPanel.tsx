import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import {getOutlineSelection} from '@tomorrowevening/theatre-studio/selectors'
import {
  generateSequenceMarkerId,
  generateSequenceEventId,
} from '@tomorrowevening/theatre-shared/utils/ids'
import {usePrism} from '@tomorrowevening/theatre-react'
import {valToAtom} from '@tomorrowevening/theatre-shared/utils/valToAtom'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import React, {useState, useCallback, useRef} from 'react'
import styled from 'styled-components'
import {types} from '@tomorrowevening/theatre-core'

import DopeSheet from './DopeSheet/DopeSheet'
import GraphEditor from './GraphEditor/GraphEditor'
import type {PanelDims, SequenceEditorPanelLayout} from './layout/layout'
import {minLeftPanelWidth, sequenceEditorPanelLayout} from './layout/layout'
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
import SVGLoadPopup from './SVGLoadPopup'
import type {SVGDataPoint} from './SVGLoadPopup'
import AttachAudioPopup from './AttachAudioPopup'
import StartMenu from './StartMenu'
import SheetModal from './SheetModal'
import type {SheetModalRef} from './SheetModal'
import SheetObjectModal from './SheetObjectModal'
import type {SheetObjectModalRef} from './SheetObjectModal'
import {SearchProvider} from './SearchContext'

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

const Container = styled(PanelWrapper)<{collapsedWidth?: number}>`
  z-index: ${panelZIndexes.sequenceEditorPanel};
  box-shadow: 2px 2px 0 rgb(0 0 0 / 11%);
  ${(props) =>
    props.collapsedWidth
      ? `width: ${props.collapsedWidth}px !important; max-width: ${props.collapsedWidth}px !important;`
      : ''}
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
    height: 60px;
    display: flex;
    flex-direction: column;
    align-items: normal;
    padding: 0;
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

const SequenceEditorPanel: React.VFC<{}> = () => {
  return usePrism(() => {
    const studio = getStudio()!
    const rightPanelOpen =
      val(studio.atomP.historic.panels.sequenceEditor.rightPanelOpen) ?? true
    const minDims = {
      width: minLeftPanelWidth * (rightPanelOpen ? 2 : 1),
      height: 200,
    }

    return (
      <BasePanel
        panelId={'sequenceEditor' as UIPanelId}
        defaultPosition={defaultPosition}
        minDims={minDims}
      >
        <Content />
      </BasePanel>
    )
  }, [])
}

const Content: React.VFC<{}> = () => {
  const {dims} = usePanel()
  const [containerNode, setContainerNode] = useState<null | HTMLDivElement>(
    null,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)

  // SVGViewer ref for controlling it from the Start Menu
  const svgViewerRef = useRef<SVGViewerRef>(null)

  // SVG Load Popup state
  const [showSVGLoadPopup, setShowSVGLoadPopup] = useState(false)

  // Attach Audio Popup state
  const [showAttachAudioPopup, setShowAttachAudioPopup] = useState(false)
  const [currentSheet, setCurrentSheet] = useState<any>(null)

  // SheetModal ref for controlling it from the Start Menu
  const sheetModalRef = useRef<SheetModalRef>(null)

  // SheetObjectModal ref for controlling it from the Start Menu
  const sheetObjectModalRef = useRef<SheetObjectModalRef>(null)

  // Store for tracking object properties to prevent overwrites
  const objectPropertiesStore = useRef<Map<string, Record<string, any>>>(
    new Map(),
  )

  // Current sheet ref to access sheet info from handlers
  const currentSheetRef = useRef<any>(null)

  const handleSVGViewerClear = useCallback(() => {
    svgViewerRef.current?.clearData()
  }, [])

  const handleSVGViewerLoad = useCallback(() => {
    setShowSVGLoadPopup(true)
  }, [])

  const handleSVGViewerShow = useCallback(() => {
    svgViewerRef.current?.show()
  }, [])

  const handleSVGViewerHide = useCallback(() => {
    svgViewerRef.current?.hide()
  }, [])

  const handleSVGLoadPopupLoad = useCallback(
    (data: SVGDataPoint[], color: string) => {
      svgViewerRef.current?.addData(data, color)
      setShowSVGLoadPopup(false)
    },
    [],
  )

  const handleSVGLoadPopupCancel = useCallback(() => {
    setShowSVGLoadPopup(false)
  }, [])

  const handleAttachAudio = useCallback(
    async (source: string | File) => {
      if (!currentSheet) {
        throw new Error('No sheet selected')
      }

      try {
        // Access the public API sheet to get the sequence with attachAudio method
        const publicSheet = currentSheet.project.publicApi.sheet(
          currentSheet.address.sheetId,
        )
        const sequence = publicSheet.sequence

        // Convert File to URL if needed, since attachAudio only accepts string or AudioBuffer
        let audioSource: string
        if (source instanceof File) {
          audioSource = URL.createObjectURL(source)
        } else {
          audioSource = source
        }

        await sequence.attachAudio({source: audioSource})
        console.log('✅ Audio attached successfully')

        // Clean up the object URL if we created one
        if (source instanceof File) {
          // Clean up after a delay to ensure the audio is loaded
          setTimeout(() => {
            URL.revokeObjectURL(audioSource)
          }, 5000)
        }
      } catch (error) {
        console.error('❌ Failed to attach audio:', error)
        throw error
      }
    },
    [currentSheet],
  )

  const handleAttachAudioPopupCancel = useCallback(() => {
    setShowAttachAudioPopup(false)
    setCurrentSheet(null)
  }, [])

  const handleSheetCreate = useCallback(() => {
    sheetModalRef.current?.open('create')
  }, [])

  const handleSheetDuplicate = useCallback(() => {
    const currentSheet = currentSheetRef.current
    const currentSheetName = currentSheet?.address?.sheetId || 'Sheet'
    sheetModalRef.current?.open('duplicate', currentSheetName)
  }, [])

  const handleSheetModalConfirm = useCallback(
    (sheetName: string, mode: 'create' | 'duplicate') => {
      try {
        const currentSheet = currentSheetRef.current
        if (currentSheet?.project?.publicApi) {
          // Create the sheet immediately
          const newSheet = currentSheet.project.publicApi.sheet(sheetName)
          console.log(
            `✅ Successfully ${
              mode === 'create' ? 'created' : 'duplicated'
            } sheet: ${sheetName}`,
          )
        } else {
          console.error('❌ No current sheet or project available')
        }
      } catch (error) {
        console.error(`❌ Failed to ${mode} sheet:`, error)
      }
    },
    [],
  )

  const handleSheetModalCancel = useCallback(() => {
    console.log('❌ Sheet modal cancelled')
  }, [])

  const handleSheetObjectCreate = useCallback(() => {
    sheetObjectModalRef.current?.open()
  }, [])

  const handleSearchChange = useCallback((newSearchTerm: string) => {
    setSearchTerm(newSearchTerm)
  }, [])

  const handleSearchTrigger = useCallback((newTrigger: number) => {
    setSearchTrigger(newTrigger)
  }, [])

  // Add event listener for attach audio custom event
  React.useEffect(() => {
    const handleAttachAudioEvent = (event: CustomEvent) => {
      const {sheet} = event.detail
      setCurrentSheet(sheet)
      setShowAttachAudioPopup(true)
    }

    document.addEventListener(
      'theatre:attachAudio',
      handleAttachAudioEvent as EventListener,
    )

    return () => {
      document.removeEventListener(
        'theatre:attachAudio',
        handleAttachAudioEvent as EventListener,
      )
    }
  }, [])

  const handleSheetObjectModalConfirm = useCallback(
    (objectData: {
      name: string
      key: string
      type: string
      value: any
      min?: number
      max?: number
      step?: number
    }) => {
      try {
        const currentSheet = currentSheetRef.current
        if (currentSheet) {
          // Build the prop configuration based on type
          let propConfig: any

          switch (objectData.type) {
            case 'number':
              if (
                objectData.min !== undefined ||
                objectData.max !== undefined ||
                objectData.step !== undefined
              ) {
                const rangeOptions: any = {}
                if (
                  objectData.min !== undefined &&
                  objectData.max !== undefined
                ) {
                  rangeOptions.range = [objectData.min, objectData.max]
                }
                if (objectData.step !== undefined) {
                  rangeOptions.nudgeMultiplier = objectData.step
                }
                propConfig = types.number(objectData.value, rangeOptions)
              } else {
                propConfig = types.number(objectData.value)
              }
              break
            case 'string':
              propConfig = types.string(objectData.value)
              break
            case 'boolean':
              propConfig = types.boolean(objectData.value)
              break
            case 'rgba':
              propConfig = types.rgba(objectData.value)
              break
            case 'compound':
              propConfig = objectData.value
              break
            default:
              propConfig = objectData.value
          }

          // Access the public API sheet to create the object
          const publicSheet = currentSheet.project.publicApi.sheet(
            currentSheet.address.sheetId,
          )

          // Get or create the object's property store
          const objectKey = `${currentSheet.address.sheetId}:${objectData.name}`
          let existingProps = objectPropertiesStore.current.get(objectKey) || {}

          // Add the new property to existing properties
          existingProps[objectData.key] = propConfig

          // Update the store
          objectPropertiesStore.current.set(objectKey, existingProps)

          let sheetObject

          try {
            // Step 1: Try to get existing object to read its current values
            let existingObject
            let existingValues = {}

            try {
              // Attempt to get existing object (this might fail if object doesn't exist)
              existingObject = publicSheet.object(objectData.name, {})
              existingValues = existingObject.value || {}
            } catch (existingError) {
              // console.log('📝 No existing object found, creating fresh')
            }

            // Step 2: Merge existing values with new property types (your approach!)
            // This preserves existing properties while adding new ones
            const mergedConfig = {...existingProps}

            // Step 3: Create/reconfigure with the complete config
            sheetObject = publicSheet.object(objectData.name, mergedConfig, {
              reconfigure: true,
            })

            // Verify success
            const expectedProps = Object.keys(existingProps)
            const actualProps = Object.keys(sheetObject.value || {})
            const missingProps = expectedProps.filter(
              (prop: string) => !(actualProps as string[]).includes(prop),
            )

            if (missingProps.length !== 0) {
              console.log('⚠️ Still missing props:', missingProps)
              console.log(
                'This indicates a fundamental Theatre.js limitation with reconfigure',
              )
            }
          } catch (error) {
            console.error('❌ Object creation failed:', error)
            throw error
          }
        } else {
          console.error('❌ No current sheet available')
        }
      } catch (error) {
        console.error('❌ Failed to create sheet object:', error)
      }
    },
    [],
  )

  const handleSheetObjectModalCancel = useCallback(() => {
    console.log('❌ Sheet object modal cancelled')
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

  const handleEventsAdd = useCallback(() => {
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
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceEvents(
            {
              sheetAddress: sheet.address,
              events: [
                {
                  id: generateSequenceEventId(),
                  name: 'event',
                  position: sheetSequence.position,
                },
              ],
              // Remove snapping function to allow free positioning
              // snappingFunction: sheetSequence.closestGridPosition,
            },
          )
        })
      } else {
        console.warn('⚠️ No sheet selected for adding event')
      }
    } catch (error) {
      console.error('❌ Failed to add event:', error)
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

  const handleMarkersLog = useCallback(() => {
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
        const sheetState = val(
          getStudio().atomP.historic.projects.stateByProjectId[
            sheet.address.projectId
          ].stateBySheetId[sheet.address.sheetId],
        )

        // Get markers from core state
        const coreMarkers =
          val(
            getStudio().atomP.historic.coreByProject[sheet.address.projectId]
              .sheetsById[sheet.address.sheetId].sequence.markers,
          ) || []

        console.group('📍 Markers for sheet:', sheet.address.sheetId)
        console.log('Total markers:', coreMarkers.length)
        coreMarkers.forEach((marker, index) => {
          console.log(
            `${index + 1}. "${marker.label || 'Unnamed'}" at ${
              marker.position
            }s (ID: ${marker.id})`,
          )
        })
        console.groupEnd()
      } else {
        console.warn('⚠️ No sheet selected for logging markers')
      }
    } catch (error) {
      console.error('❌ Failed to log markers:', error)
    }
  }, [])

  const handleEventsClear = useCallback(() => {
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

        // Get all existing event IDs first
        const eventSetP =
          getStudio().atomP.historic.projects.stateByProjectId[
            sheet.address.projectId
          ].stateBySheetId[sheet.address.sheetId].sequenceEditor.eventSet
        const eventAllIds = val(eventSetP?.allIds)

        if (eventAllIds && Object.keys(eventAllIds).length > 0) {
          // Remove each event individually using the correct transaction pattern
          Object.keys(eventAllIds).forEach((eventId) => {
            getStudio().transaction(({stateEditors}) => {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.removeEvent(
                {
                  sheetAddress: sheet.address,
                  eventId: eventId as any,
                },
              )
            })
          })
        } else {
          console.log('ℹ️ No events to clear')
        }
      } else {
        console.warn('⚠️ No sheet selected for clearing events')
      }
    } catch (error) {
      console.error('❌ Failed to clear events:', error)
    }
  }, [])

  const handleEventsLog = useCallback(() => {
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

        // Get events from core state
        const coreEvents =
          val(
            getStudio().atomP.historic.coreByProject[sheet.address.projectId]
              .sheetsById[sheet.address.sheetId].sequence.events,
          ) || []

        console.group('🎯 Events for sheet:', sheet.address.sheetId)
        console.log('Total events:', coreEvents.length)
        coreEvents.forEach((event, index) => {
          console.log(
            `${index + 1}. "${event.name}" at ${event.position}s${
              event.value !== undefined
                ? ` (value: ${JSON.stringify(event.value)})`
                : ''
            } (ID: ${event.id})`,
          )
        })
        console.groupEnd()
      } else {
        console.warn('⚠️ No sheet selected for logging events')
      }
    } catch (error) {
      console.error('❌ Failed to log events:', error)
    }
  }, [])

  usePresenceListenersOnRootElement(containerNode)

  return usePrism(() => {
    // Get rightPanelOpen state from studio early so we can use it in panelSize calculation
    const studio = getStudio()!
    const rightPanelOpenFromStudio =
      val(studio.atomP.historic.panels.sequenceEditor.rightPanelOpen) ?? true

    const panelSize = prism.memo(
      'panelSize',
      (): PanelDims => {
        const width = rightPanelOpenFromStudio ? dims.width : minLeftPanelWidth
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
      [dims, rightPanelOpenFromStudio],
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

    // Store current sheet in ref for handlers to access
    currentSheetRef.current = sheet

    // Auto-adjust sequence editor time range to match sheet duration
    // This runs inside usePrism so it's reactive to sheet changes
    const sheetSequence = sheet.getSequence()
    const sequenceDuration = sheetSequence.length

    // Check if we need to adjust the range
    const currentRange = val(
      getStudio().atomP.ahistoric.projects.stateByProjectId[
        sheet.address.projectId
      ].stateBySheetId[sheet.address.sheetId].sequence.clippedSpaceRange,
    ) || {start: 0, end: 10}

    // Only auto-adjust if:
    // 1. Duration is valid and not default
    // 2. Current range doesn't match sequence duration
    // 3. Current range appears to be the default (start: 0, end: 10) - indicating no user interaction
    const isDefaultRange = currentRange.start === 0 && currentRange.end === 10
    // Add 5% padding to the end so users can see the full duration including end markers
    const paddedDuration = sequenceDuration * 1.05
    const needsAdjustment =
      sequenceDuration > 0 &&
      sequenceDuration !== 10 &&
      currentRange.end !== paddedDuration &&
      isDefaultRange

    if (needsAdjustment) {
      // Use setTimeout to avoid calling transaction inside usePrism
      setTimeout(() => {
        getStudio().transaction(({stateEditors}) => {
          stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence.clippedSpaceRange.set(
            {
              ...sheet.address,
              range: {start: 0, end: paddedDuration},
            },
          )
        })
      }, 0)
    }

    const panelSizeP = valToAtom('panelSizeP', panelSize).pointer

    // We make a unique key based on the sheet's address, so that
    // <Left /> and <Right />
    // don't have to listen to changes in sheet
    const key = prism.memo('key', () => JSON.stringify(sheet.address), [sheet])

    const layoutP = sequenceEditorPanelLayout(sheet, panelSizeP).getValue()

    // Always show sequence editor when a sheet is selected
    // With the new Start Menu, users can dynamically add objects and properties
    const hasChildren = val(layoutP.tree.children).length > 0
    const sequenceState = val(
      sheet.project.pointers.historic.sheetsById[sheet.address.sheetId]
        .sequence,
    )
    const hasSequenceData =
      (sequenceState?.length && sequenceState.length > 0) ||
      (sequenceState?.markers && sequenceState.markers.length > 0)

    // Always show the panel when a sheet is selected - users can now create content dynamically
    // if (!hasChildren && !hasSequenceData) return <></>

    const containerRef = prism.memo(
      'containerRef',
      preventHorizontalWheelEvents,
      [],
    )

    const graphEditorAvailable = val(layoutP.graphEditorDims.isAvailable)
    const graphEditorOpen = val(layoutP.graphEditorDims.isOpen)
    const rightPanelOpen = val(layoutP.rightPanelOpen)
    const collapsedWidth = !rightPanelOpen ? minLeftPanelWidth : undefined

    return (
      <Container
        collapsedWidth={collapsedWidth}
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
          onMarkersLog={handleMarkersLog}
          onEventsAdd={handleEventsAdd}
          onEventsClear={handleEventsClear}
          onEventsLog={handleEventsLog}
          onSheetCreate={handleSheetCreate}
          onSheetDuplicate={handleSheetDuplicate}
          onSheetObjectCreate={handleSheetObjectCreate}
          onSearchChange={handleSearchChange}
          onSearchTrigger={handleSearchTrigger}
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
          <SearchProvider searchTerm={searchTerm} searchTrigger={searchTrigger}>
            <DopeSheet
              key={key + '-dopeSheet-' + searchTerm + '-' + searchTrigger}
              layoutP={layoutP}
            />
          </SearchProvider>
          {graphEditorOpen && (
            <GraphEditor key={key + '-graphEditor'} layoutP={layoutP} />
          )}
          {graphEditorAvailable && <GraphEditorToggle layoutP={layoutP} />}
          {rightPanelOpen && <RightOverlay layoutP={layoutP} />}
        </FrameStampPositionProvider>

        {/* Sheet Modal */}
        <SheetModal
          ref={sheetModalRef}
          onConfirm={handleSheetModalConfirm}
          onCancel={handleSheetModalCancel}
        />

        {/* Sheet Object Modal */}
        <SheetObjectModal
          ref={sheetObjectModalRef}
          onConfirm={handleSheetObjectModalConfirm}
          onCancel={handleSheetObjectModalCancel}
        />

        {/* SVG Load Popup */}
        {showSVGLoadPopup && (
          <SVGLoadPopup
            onLoad={handleSVGLoadPopupLoad}
            onCancel={handleSVGLoadPopupCancel}
          />
        )}

        {/* Attach Audio Popup */}
        {showAttachAudioPopup && (
          <AttachAudioPopup
            onAttach={handleAttachAudio}
            onCancel={handleAttachAudioPopupCancel}
          />
        )}
      </Container>
    )
  }, [
    dims,
    containerNode,
    searchTerm,
    searchTrigger,
    showSVGLoadPopup,
    showAttachAudioPopup,
  ])
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
        <TitleBar
          style={{
            borderRight: '1px solid #222',
          }}
        >
          <TitleRow
            style={{
              borderBottom: '1px solid #222',
            }}
          >
            <TitleBar_Piece
              style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {sheet.address.sheetId}
            </TitleBar_Piece>
          </TitleRow>

          <TimeInputsRow>
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
          </TimeInputsRow>
        </TitleBar>
      </Header_Container>
    )
  }, [layoutP])
}

const TimeInputsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 8px;
`

const TimeInputsRow = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 8px;
`

const TimeInput = styled(BasicNumberInput)`
  flex: 1;
  min-width: 0;
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
