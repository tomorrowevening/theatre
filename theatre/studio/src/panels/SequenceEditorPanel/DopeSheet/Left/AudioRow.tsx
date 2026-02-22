import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import React, {useCallback, useRef, useState} from 'react'
import styled from 'styled-components'
import {BaseHeader, LeftRowContainer} from './AnyCompositeRow'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'
import {val} from '@tomorrowevening/theatre-dataverse'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {
  removeSheetAudio,
  getSheetAudioEntries,
  updateSheetAudioStartTime,
  updateSheetAudioColor,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/audioStore'
import {MultiAudioPlaybackController} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/MultiAudioPlaybackController'
import DefaultPlaybackController from '@tomorrowevening/theatre-core/sequences/playbackControllers/DefaultPlaybackController'
import useContextMenu from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import usePopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/BasicPopover'

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

const ColorPickerOverlay = styled.div`
  position: fixed;
  background: #333;
  border-radius: 4px;
  padding: 4px;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

const ColorInputField = styled.input`
  background: #222;
  width: 50px;
  height: 30px;
  border: 1px solid #666;
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  &::-webkit-color-swatch {
    border: 1px solid #999;
    border-radius: 2px;
  }
`

const HexColorInput = styled.input`
  background: #222;
  border: 1px solid #666;
  color: #fff;
  width: 70px;
  height: 28px;
  padding: 4px;
  border-radius: 2px;
  font-family: monospace;
  font-size: 12px;

  &:focus {
    outline: none;
    border-color: #40aaa4;
  }
`

const AudioRow: React.FC<{
  leaf: SequenceEditorTree_AttachedAudio
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  const {projectId, sheetId} = leaf.sheet.address
  const {audioId} = leaf

  const rowHeaderRef = useRef<HTMLDivElement | null>(null)
  // Local color state for the picker UI; initialised from the reactive leaf value
  const [pickerColor, setPickerColor] = useState(leaf.audio.color)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerPos, setColorPickerPos] = useState({top: 0, left: 0})

  const handleDelete = useCallback(() => {
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
  }, [projectId, sheetId, audioId, layoutP])

  const startTimePopover = usePopover(
    {debugName: 'AudioRow/startTime', closeOnClickOutside: true},
    () => {
      let newStartTime = leaf.audio.startTime

      return (
        <BasicPopover>
          <div style={{padding: '8px', minWidth: '180px'}}>
            <div
              style={{
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#CCC',
                fontSize: '12px',
              }}
            >
              Start Time
            </div>
            <input
              type="number"
              defaultValue={leaf.audio.startTime}
              step={0.01}
              min={0}
              onChange={(e) => {
                newStartTime = parseFloat(e.target.value)
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                marginBottom: '10px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                color: '#FFF',
                fontSize: '11px',
                boxSizing: 'border-box',
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const t = parseFloat((e.target as HTMLInputElement).value)
                  if (!isNaN(t) && t >= 0) {
                    updateSheetAudioStartTime(projectId, sheetId, audioId, t)
                  }
                  startTimePopover.close('user action')
                } else if (e.key === 'Escape') {
                  startTimePopover.close('user action')
                }
              }}
            />
            <div
              style={{display: 'flex', justifyContent: 'flex-end', gap: '6px'}}
            >
              <button
                onClick={() => startTimePopover.close('user action')}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#CCC',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!isNaN(newStartTime) && newStartTime >= 0) {
                    updateSheetAudioStartTime(
                      projectId,
                      sheetId,
                      audioId,
                      newStartTime,
                    )
                  }
                  startTimePopover.close('user action')
                }}
                style={{
                  padding: '4px 10px',
                  background: '#40AAA4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Ok
              </button>
            </div>
          </div>
        </BasicPopover>
      )
    },
  )

  const [contextMenu] = useContextMenu(rowHeaderRef.current, {
    menuItems: () => [
      {
        label: 'Custom Color',
        callback: () => {
          setPickerColor(leaf.audio.color)
          if (rowHeaderRef.current) {
            const rect = rowHeaderRef.current.getBoundingClientRect()
            setColorPickerPos({top: rect.bottom + 4, left: rect.left})
          }
          setShowColorPicker(true)
        },
      },
      {
        label: 'Start Time',
        callback: () => {
          if (rowHeaderRef.current) {
            const rect = rowHeaderRef.current.getBoundingClientRect()
            startTimePopover.open(
              {clientX: rect.left, clientY: rect.bottom},
              rowHeaderRef.current,
            )
          }
        },
      },
      {
        label: 'Delete',
        callback: () => handleDelete(),
      },
    ],
  })

  return leaf.shouldRender ? (
    <LeftRowContainer depth={leaf.depth}>
      {contextMenu}
      {startTimePopover.node}
      {showColorPicker && (
        <ColorPickerOverlay
          style={{
            top: `${colorPickerPos.top}px`,
            left: `${colorPickerPos.left}px`,
          }}
        >
          <ColorInputField
            type="color"
            value={pickerColor}
            onChange={(e) => {
              const newColor = e.currentTarget.value
              setPickerColor(newColor)
              updateSheetAudioColor(projectId, sheetId, audioId, newColor)
            }}
          />
          <HexColorInput
            type="text"
            placeholder="#7ec8e3"
            value={pickerColor}
            onChange={(e) => {
              let hex = e.currentTarget.value
              if (!hex.startsWith('#')) hex = '#' + hex
              if (/^#[0-9A-F]{6}$/i.test(hex)) {
                setPickerColor(hex)
                updateSheetAudioColor(projectId, sheetId, audioId, hex)
              }
            }}
          />
          <button
            onClick={() => setShowColorPicker(false)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              border: '1px solid #666',
              borderRadius: '2px',
              background: '#222',
              color: '#FFF',
              height: '28px',
            }}
          >
            Done
          </button>
        </ColorPickerOverlay>
      )}
      <LeftRowHeader
        ref={rowHeaderRef}
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
