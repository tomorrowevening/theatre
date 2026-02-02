import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React, {useLayoutEffect, useMemo, useRef} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {useVal} from '@tomorrowevening/theatre-react'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'
import type {StudioHistoricStateSequenceEditorEvent} from '@tomorrowevening/theatre-studio/store/types/historic'
import BasicStringInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicStringInput'
import BasicNumberInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicNumberInput'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  min-width: 200px;
`

const Row = styled.div`
  display: flex;
  gap: 8px;
  height: 28px;
  align-items: center;
`

const Label = styled.div`
  ${propNameTextCSS};
  white-space: nowrap;
  min-width: 60px;
`

const EventEditorPopover: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  event: StudioHistoricStateSequenceEditorEvent
  /**
   * Called when user hits enter/escape
   */
  onRequestClose: (reason: string) => void
}> = ({layoutP, event}) => {
  const sheet = useVal(layoutP.sheet)

  const nameFns = useMemo(() => {
    let tempTransaction: CommitOrDiscard | undefined

    return {
      temporarilySetValue(newName: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateEvent(
            {
              sheetAddress: sheet.address,
              eventId: event.id,
              name: newName,
              value: event.value,
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
      permanentlySetValue(newName: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        getStudio()!.transaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateEvent(
            {
              sheetAddress: sheet.address,
              eventId: event.id,
              name: newName,
              value: event.value,
            },
          )
        })
      },
    }
  }, [layoutP, sheet, event])

  const timeFns = useMemo(() => {
    let tempTransaction: CommitOrDiscard | undefined

    return {
      temporarilySetValue(newTime: number): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceEvents(
            {
              sheetAddress: sheet.address,
              events: [{...event, position: newTime}],
              // Remove snapping function to allow free positioning
              // snappingFunction: sheet.getSequence().closestGridPosition,
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
      permanentlySetValue(newTime: number): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        getStudio()!.transaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.replaceEvents(
            {
              sheetAddress: sheet.address,
              events: [{...event, position: newTime}],
              // Remove snapping function to allow free positioning
              // snappingFunction: sheet.getSequence().closestGridPosition,
            },
          )
        })
      },
    }
  }, [layoutP, sheet, event])

  const valueFns = useMemo(() => {
    let tempTransaction: CommitOrDiscard | undefined

    return {
      temporarilySetValue(newValue: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        // Try to parse as JSON, fallback to string
        let parsedValue: any = newValue
        try {
          if (newValue.trim() !== '') {
            parsedValue = JSON.parse(newValue)
          }
        } catch {
          // Keep as string if not valid JSON
        }

        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateEvent(
            {
              sheetAddress: sheet.address,
              eventId: event.id,
              name: event.name,
              value: parsedValue,
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
      permanentlySetValue(newValue: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        // Try to parse as JSON, fallback to string
        let parsedValue: any = newValue
        try {
          if (newValue.trim() !== '') {
            parsedValue = JSON.parse(newValue)
          }
        } catch {
          // Keep as string if not valid JSON
        }

        getStudio()!.transaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateEvent(
            {
              sheetAddress: sheet.address,
              eventId: event.id,
              name: event.name,
              value: parsedValue,
            },
          )
        })
      },
    }
  }, [layoutP, sheet, event])

  const nameInputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    nameInputRef.current!.focus()
  }, [])

  // Convert value to string for editing
  const valueAsString = useMemo(() => {
    if (event.value === undefined || event.value === null) return ''
    if (typeof event.value === 'string') return event.value
    return JSON.stringify(event.value)
  }, [event.value])

  return (
    <Container>
      <Row>
        <Label>Name</Label>
        <BasicStringInput
          value={event.name ?? ''}
          {...nameFns}
          isValid={() => true}
          inputRef={nameInputRef}
        />
      </Row>
      <Row>
        <Label>Time</Label>
        <BasicNumberInput
          value={event.position}
          {...timeFns}
          isValid={() => true}
          nudge={({deltaX}) => deltaX * 0.25}
        />
      </Row>
      <Row>
        <Label>Value</Label>
        <BasicStringInput
          value={valueAsString}
          {...valueFns}
          isValid={() => true}
        />
      </Row>
    </Container>
  )
}

export default EventEditorPopover
