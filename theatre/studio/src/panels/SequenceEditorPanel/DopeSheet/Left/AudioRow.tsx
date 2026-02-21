import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React, {useCallback} from 'react'
import styled from 'styled-components'
import {BaseHeader, LeftRowContainer} from './AnyCompositeRow'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'
import {val} from '@tomorrowevening/theatre-dataverse'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {
  removeSheetAudio,
  getSheetAudioEntries,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/audioStore'
import {MultiAudioPlaybackController} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/MultiAudioPlaybackController'
import DefaultPlaybackController from '@tomorrowevening/theatre-core/sequences/playbackControllers/DefaultPlaybackController'

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
  flex: 1;
  color: #7ec8e3;

  ${LeftRowHeader}:hover & {
    color: #aee;
  }
`

const DeleteButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 6px;
  color: #888;
  font-size: 12px;
  line-height: 1;

  &:hover {
    color: #f77;
  }

  ${LeftRowHeader}:hover & {
    display: flex;
  }
`

const AudioRow: React.FC<{
  leaf: SequenceEditorTree_AttachedAudio
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  const {projectId, sheetId} = leaf.sheet.address
  const {audioId} = leaf

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      removeSheetAudio(projectId, sheetId, audioId)
      const remaining = getSheetAudioEntries(projectId, sheetId)
      const sequence = val(layoutP.sheet).getSequence()
      if (remaining.length > 0) {
        sequence.replacePlaybackController(
          new MultiAudioPlaybackController(remaining),
        )
      } else {
        sequence.replacePlaybackController(new DefaultPlaybackController())
      }
    },
    [projectId, sheetId, audioId, layoutP],
  )

  return leaf.shouldRender ? (
    <LeftRowContainer depth={leaf.depth}>
      <LeftRowHeader
        style={{height: leaf.nodeHeight + 'px'}}
        isEven={leaf.n % 2 === 0}
      >
        <LeftRowHead_Label title={leaf.audio.label}>
          ♪ {leaf.audio.label}
        </LeftRowHead_Label>
        <DeleteButton onClick={handleDelete} title="Remove audio">
          ✕
        </DeleteButton>
      </LeftRowHeader>
    </LeftRowContainer>
  ) : null
}

export default AudioRow
