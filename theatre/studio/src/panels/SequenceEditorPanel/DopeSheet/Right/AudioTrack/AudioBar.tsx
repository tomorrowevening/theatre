import type {SequenceEditorTree_AttachedAudio} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import React, {useMemo, useEffect, useRef, useCallback} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {useLockFrameStampPositionRef} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/FrameStampPositionProvider'
import {useCssCursorLock} from '@tomorrowevening/theatre-studio/uiComponents/PointerEventsHandler'
import useDrag from '@tomorrowevening/theatre-studio/uiComponents/useDrag'
import useRefAndState from '@tomorrowevening/theatre-studio/utils/useRefAndState'
import {pointerEventsAutoInNormalMode} from '@tomorrowevening/theatre-studio/css'
import {MultiAudioPlaybackController} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/MultiAudioPlaybackController'
import {
  getSheetAudioEntries,
  updateSheetAudioStartTime,
} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/audioStore'

const BarContainer = styled.div`
  position: absolute;
  height: 100%;
  min-width: 20px;
  cursor: ew-resize;
  ${pointerEventsAutoInNormalMode}

  &:hover canvas {
    opacity: 0.85;
  }
`

const WaveCanvas = styled.canvas`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 20px;
  border-radius: 2px;
  display: block;
`

function drawWaveform(
  canvas: HTMLCanvasElement,
  decodedBuffer: AudioBuffer,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const {width, height} = canvas
  if (width === 0 || height === 0) return

  ctx.clearRect(0, 0, width, height)

  // Background
  ctx.fillStyle = 'rgba(126, 200, 227, 0.25)'
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 2)
  ctx.fill()

  // Border
  ctx.strokeStyle = 'rgba(126, 200, 227, 0.65)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, 2)
  ctx.stroke()

  // Waveform — combine all channels into one pass
  const numChannels = decodedBuffer.numberOfChannels
  const totalSamples = decodedBuffer.length
  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) {
    channels.push(decodedBuffer.getChannelData(c))
  }

  const mid = height / 2
  const samplesPerPixel = totalSamples / width

  ctx.fillStyle = 'rgba(126, 200, 227, 0.85)'

  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samplesPerPixel)
    const end = Math.min(Math.floor((x + 1) * samplesPerPixel), totalSamples)

    let min = 0
    let max = 0
    for (let i = start; i < end; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = channels[c][i]
        if (s < min) min = s
        if (s > max) max = s
      }
    }

    const yTop = mid - max * mid
    const barHeight = Math.max(1, (max - min) * mid)
    ctx.fillRect(x, yTop, 1, barHeight)
  }
}

const AudioBar: React.FC<{
  leaf: SequenceEditorTree_AttachedAudio
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  const [containerRef, containerNode] = useRefAndState<HTMLDivElement | null>(
    null,
  )
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const frameStampLock = useLockFrameStampPositionRef()

  const {projectId, sheetId} = leaf.sheet.address
  const {audioId} = leaf

  // Draw waveform whenever the canvas or audio data changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const entries = getSheetAudioEntries(projectId, sheetId)
    const entry = entries.find((e) => e.id === audioId)
    if (!entry) return

    // Size the canvas to its rendered CSS size × DPR for crisp rendering
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.floor(rect.width * dpr)
    const h = Math.floor(rect.height * dpr)
    if (w === 0 || h === 0) return

    canvas.width = w
    canvas.height = h

    drawWaveform(canvas, entry.decodedBuffer)
  }, [projectId, sheetId, audioId])

  // Redraw on mount and whenever the container resizes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    redraw()

    const observer = new ResizeObserver(() => redraw())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [redraw])

  const dragOpts = useMemo((): Parameters<typeof useDrag>[1] => {
    let initialStartTime = 0

    return {
      debugName: 'AudioBar/drag',
      lockCSSCursorTo: 'ew-resize',
      onDragStart(_event) {
        initialStartTime = leaf.audio.startTime
        frameStampLock(true, initialStartTime)

        return {
          onDrag(dx) {
            const clippedSpaceRange = val(layoutP.clippedSpace.range)
            const clippedSpaceWidth = val(layoutP.clippedSpace.width)
            const unitSpaceToSceneSpace =
              (clippedSpaceRange.end - clippedSpaceRange.start) /
              clippedSpaceWidth
            const delta = dx * unitSpaceToSceneSpace
            const sequence = val(layoutP.sheet).getSequence()
            const rawStartTime = initialStartTime + delta
            const newStartTime = Math.max(
              0,
              sequence.closestGridPosition(rawStartTime),
            )
            updateSheetAudioStartTime(projectId, sheetId, audioId, newStartTime)
          },
          onDragEnd(dragHappened) {
            frameStampLock(false, 0)

            if (dragHappened) {
              const entries = getSheetAudioEntries(projectId, sheetId)
              if (entries.length > 0) {
                const sequence = val(layoutP.sheet).getSequence()
                sequence.replacePlaybackController(
                  new MultiAudioPlaybackController(entries),
                )
              }
            } else {
              updateSheetAudioStartTime(
                projectId,
                sheetId,
                audioId,
                initialStartTime,
              )
            }
          },
        }
      },
    }
  }, [leaf, layoutP, frameStampLock, projectId, sheetId, audioId])

  const [isDraggingD] = useDrag(containerNode, dragOpts)
  useCssCursorLock(isDraggingD, 'draggingPositionInSequenceEditor', 'ew-resize')

  const leftPadding = val(layoutP.scaledSpace.leftPadding)
  const {startTime, duration, label} = leaf.audio

  const left = `calc(${leftPadding}px + calc(var(--unitSpaceToScaledSpaceMultiplier) * ${startTime}px))`
  const width = `calc(var(--unitSpaceToScaledSpaceMultiplier) * ${duration}px)`

  const endTime = startTime + duration

  return (
    <BarContainer
      ref={containerRef}
      style={{left, width}}
      title={`Audio: ${label}\nStart: ${startTime.toFixed(
        2,
      )}s  End: ${endTime.toFixed(2)}s`}
    >
      <WaveCanvas ref={canvasRef} />
    </BarContainer>
  )
}

export default AudioBar
