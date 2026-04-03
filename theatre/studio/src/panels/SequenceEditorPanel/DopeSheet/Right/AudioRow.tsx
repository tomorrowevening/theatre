import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React, {useCallback, useRef, useState} from 'react'
import styled from 'styled-components'
import {
  removeSheetAudio,
  getSheetAudioEntries,
  updateSheetAudioStartTime,
  updateSheetAudioColor,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/audioStore'
import {MultiAudioPlaybackController} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/MultiAudioPlaybackController'
import {DefaultPlaybackController} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/playbackControllers'
import useContextMenu from '@tomorrowevening/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import usePopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@tomorrowevening/theatre-studio/uiComponents/Popover/BasicPopover'
import RightRow from './Row'
import AudioTrack from './AudioTrack/AudioTrack'
import {
  CONTROL_HEIGHT,
  HEX_INPUT_WIDTH,
} from '@tomorrowevening/theatre-studio/styleConstants'

const RightAudioRowTarget = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
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
  width: ${HEX_INPUT_WIDTH}px;
  height: ${CONTROL_HEIGHT}px;
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
  const rowRef = useRef<HTMLDivElement | null>(null)

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

  const [contextMenu] = useContextMenu(rowRef.current, {
    menuItems: () => [
      {
        label: 'Custom Color',
        callback: () => {
          setPickerColor(leaf.audio.color)
          if (rowRef.current) {
            const rect = rowRef.current.getBoundingClientRect()
            setColorPickerPos({top: rect.bottom + 4, left: rect.left})
          }
          setShowColorPicker(true)
        },
      },
      {
        label: 'Start Time',
        callback: () => {
          if (rowRef.current) {
            const rect = rowRef.current.getBoundingClientRect()
            startTimePopover.open(
              {clientX: rect.left, clientY: rect.bottom},
              rowRef.current,
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

  return (
    <RightRow
      leaf={leaf}
      node={
        <RightAudioRowTarget ref={rowRef}>
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
                  height: `${CONTROL_HEIGHT}px`,
                }}
              >
                Done
              </button>
            </ColorPickerOverlay>
          )}
          <AudioTrack layoutP={layoutP} leaf={leaf} />
        </RightAudioRowTarget>
      }
    >
      {null}
    </RightRow>
  )
}

export default AudioRow
