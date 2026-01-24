import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import React, {useLayoutEffect, useMemo, useRef} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {useVal} from '@tomorrowevening/theatre-react'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import type {BasicNumberInputNudgeFn} from '@tomorrowevening/theatre-studio/uiComponents/form/BasicNumberInput'
import type {CommitOrDiscard} from '@tomorrowevening/theatre-studio/StudioStore/StudioStore'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'
import type {StudioHistoricStateSequenceEditorMarker} from '@tomorrowevening/theatre-studio/store/types/historic'
import BasicStringInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicStringInput'

const Container = styled.div`
  display: flex;
  gap: 8px;
  /* padding: 4px 8px; */
  height: 28px;
  align-items: center;
`

const Label = styled.div`
  ${propNameTextCSS};
  white-space: nowrap;
`

const nudge: BasicNumberInputNudgeFn = ({deltaX}) => deltaX * 0.25

const MarkerEditorPopover: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  marker: StudioHistoricStateSequenceEditorMarker
  /**
   * Called when user hits enter/escape
   */
  onRequestClose: (reason: string) => void
}> = ({layoutP, marker}) => {
  const sheet = useVal(layoutP.sheet)

  const fns = useMemo(() => {
    let tempTransaction: CommitOrDiscard | undefined

    return {
      temporarilySetValue(newLabel: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateMarker(
            {
              sheetAddress: sheet.address,
              markerId: marker.id,
              label: newLabel,
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
      permanentlySetValue(newLabel: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        getStudio()!.transaction(({stateEditors}) => {
          stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateMarker(
            {
              sheetAddress: sheet.address,
              markerId: marker.id,
              label: newLabel,
            },
          )
        })
      },
    }
  }, [layoutP, sheet])

  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    inputRef.current!.focus()
  }, [])

  return (
    <Container>
      {/* <Label>Marker</Label> */}
      <BasicStringInput
        value={marker.label ?? ''}
        {...fns}
        isValid={() => true}
        inputRef={inputRef}
      />
    </Container>
  )
}

export default MarkerEditorPopover
