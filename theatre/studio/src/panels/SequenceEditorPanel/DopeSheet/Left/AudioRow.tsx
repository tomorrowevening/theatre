import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React from 'react'
import styled from 'styled-components'
import {BaseHeader, LeftRowContainer} from './AnyCompositeRow'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'

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
  color: #7ec8e3;

  ${LeftRowHeader}:hover & {
    color: #aee;
  }
`

const AudioRow: React.FC<{
  leaf: SequenceEditorTree_AttachedAudio
}> = ({leaf}) => {
  return leaf.shouldRender ? (
    <LeftRowContainer depth={leaf.depth}>
      <LeftRowHeader
        style={{height: leaf.nodeHeight + 'px'}}
        isEven={leaf.n % 2 === 0}
      >
        <LeftRowHead_Label title={leaf.audio.label}>
          ♪ {leaf.audio.label}
        </LeftRowHead_Label>
      </LeftRowHeader>
    </LeftRowContainer>
  ) : null
}

export default AudioRow
