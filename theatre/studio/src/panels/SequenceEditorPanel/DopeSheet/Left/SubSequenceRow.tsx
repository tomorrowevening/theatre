import type {SequenceEditorTree_SubSequence} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React, {useRef} from 'react'
import styled from 'styled-components'
import {BaseHeader} from './AnyCompositeRow'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'
import {usePropHighlightMouseEnter} from './usePropHighlightMouseEnter'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import useContextMenu from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import type {$IntentionalAny} from '@tomorrowevening/theatre-dataverse/src/types'
import {val} from '@tomorrowevening/theatre-dataverse'

const LeftRowContainer = styled.li<{depth: number}>`
  --depth: ${(props) => props.depth - 1};
  margin: 0;
  padding: 0;
  list-style: none;
`

const LeftRowHeader = styled(BaseHeader)`
  padding-left: calc(var(--depth) * 10px);
  display: flex;
  align-items: stretch;
  color: #999;
  box-sizing: border-box;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

const LeftRowHead_Label = styled.span`
  ${propNameTextCSS};
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 4px;
  padding-left: 20px;
  line-height: 26px;
  flex-wrap: nowrap;
  color: #ccc;

  ${LeftRowHeader}:hover & {
    color: #fff;
  }
`

const SubSequenceRow: React.FC<{
  leaf: SequenceEditorTree_SubSequence
}> = ({leaf}) => {
  const rowHeaderRef = useRef<HTMLDivElement | null>(null)
  usePropHighlightMouseEnter(rowHeaderRef.current, leaf)

  const label =
    leaf.subSequence.label === undefined ? '' : leaf.subSequence.label
  const subSequenceLabel = `${label} (${leaf.subSequence.sheetId})`

  const [contextMenu] = useContextMenu(rowHeaderRef.current, {
    menuItems: () => {
      return [
        {
          label: 'Edit Label',
          callback: () => {
            const newLabel = prompt('Enter new label:', leaf.subSequence.label)
            if (newLabel !== null && newLabel.trim() !== '') {
              getStudio()!.transaction(({stateEditors}) => {
                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                  {
                    sheetAddress: leaf.sheet.address,
                    subSequenceId: leaf.subSequence.id as $IntentionalAny,
                    updates: {label: newLabel.trim()},
                  },
                )
              })
            }
          },
        },
        {
          label: 'Edit Duration',
          callback: () => {
            // Get the actual duration value, falling back to the referenced sheet's sequence duration if undefined
            let currentDuration: number = leaf.subSequence.duration ?? 0
            if (currentDuration === 0) {
              const studio = getStudio()!
              const projects = val(studio.projectsP)
              const project = projects[leaf.sheet.address.projectId]
              currentDuration =
                val(
                  project.pointers.historic.sheetsById[
                    leaf.subSequence.sheetId as $IntentionalAny
                  ].sequence.length,
                ) ?? 0
            }

            const newDuration = prompt(
              'Enter new duration (seconds):',
              String(currentDuration),
            )
            if (newDuration !== null) {
              const duration = parseFloat(newDuration)
              if (!isNaN(duration) && duration > 0) {
                getStudio()!.transaction(({stateEditors}) => {
                  stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                    {
                      sheetAddress: leaf.sheet.address,
                      subSequenceId: leaf.subSequence.id as $IntentionalAny,
                      updates: {duration},
                    },
                  )
                })
              }
            }
          },
        },
        {
          label: 'Edit Time Scale',
          callback: () => {
            // Use the actual timeScale value, falling back to 1.0 if undefined
            const currentTimeScale = leaf.subSequence.timeScale ?? 1.0

            const newTimeScale = prompt(
              'Enter new time scale:',
              String(currentTimeScale),
            )
            if (newTimeScale !== null) {
              const timeScale = parseFloat(newTimeScale)
              if (!isNaN(timeScale) && timeScale > 0) {
                getStudio()!.transaction(({stateEditors}) => {
                  stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.updateSubSequence(
                    {
                      sheetAddress: leaf.sheet.address,
                      subSequenceId: leaf.subSequence.id as $IntentionalAny,
                      updates: {timeScale},
                    },
                  )
                })
              }
            }
          },
        },
        {
          label: 'Delete Sub-sequence',
          callback: () => {
            if (
              confirm(
                `Are you sure you want to delete sub-sequence "${leaf.subSequence.label}"?`,
              )
            ) {
              getStudio()!.transaction(({stateEditors}) => {
                stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.sequenceEditor.removeSubSequence(
                  {
                    sheetAddress: leaf.sheet.address,
                    subSequenceId: leaf.subSequence.id as $IntentionalAny,
                  },
                )
              })
            }
          },
        },
      ]
    },
  })

  return leaf.shouldRender ? (
    <LeftRowContainer depth={leaf.depth}>
      {contextMenu}
      <LeftRowHeader
        ref={rowHeaderRef}
        style={{
          height: leaf.nodeHeight + 'px',
        }}
        isEven={leaf.n % 2 === 0}
      >
        <LeftRowHead_Label>{subSequenceLabel}</LeftRowHead_Label>
      </LeftRowHeader>
    </LeftRowContainer>
  ) : null
}

export default SubSequenceRow
