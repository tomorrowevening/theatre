import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import styled from 'styled-components'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {prism, val} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import type {$FixMe} from '@tomorrowevening/theatre-shared/utils/types'
import getStudio from '@tomorrowevening/theatre-studio/getStudio'
import randomColor from '@tomorrowevening/theatre-studio/utils/randomColor'

export type SequenceDataPoint = {
  time: number
  value: number
}

export type SequenceDataset = {
  id: string
  data: SequenceDataPoint[]
  color: string
  name?: string
}

export type SequenceDataViewerProps = {
  layoutP: Pointer<SequenceEditorPanelLayout>
  sheetAddress?: {projectId: string; sheetId: string}
  renderMode?: 'circles' | 'lines' | 'both'
  color?: string
  strokeWidth?: number
  circleRadius?: number
  height?: number // Optional override - defaults to dopeSheetDims.height
}

export type SequenceDataViewerRef = {
  clearData: () => void
  addData: (data: SequenceDataPoint[], color?: string) => void
  loadData: (data: SequenceDataPoint[], color?: string) => void // Keep for backward compatibility
  loadFromClipboard: () => Promise<void>
  show: () => void
  hide: () => void
}

const Container = styled.div<{isVisible: boolean}>`
  position: absolute;
  right: 0;
  bottom: 0;
  padding-bottom: 10px;
  pointer-events: none;
  z-index: 1;
  display: ${(props) => (props.isVisible ? 'block' : 'none')};
`

const TheCanvas = styled.canvas`
  position: relative;
  left: 0;
`

const getBackingStoreRatio = (ctx: CanvasRenderingContext2D): number => {
  const _ctx = ctx as $FixMe
  return (
    _ctx.webkitBackingStorePixelRatio ||
    _ctx.mozBackingStorePixelRatio ||
    _ctx.msBackingStorePixelRatio ||
    _ctx.oBackingStorePixelRatio ||
    _ctx.backingStorePixelRatio ||
    1
  )
}

const getDevicePixelRatio = () => window.devicePixelRatio || 1

const getRatio = (ctx: CanvasRenderingContext2D) => {
  return getDevicePixelRatio() / getBackingStoreRatio(ctx)
}

const SequenceDataViewer = forwardRef<
  SequenceDataViewerRef,
  SequenceDataViewerProps
>(
  (
    {
      layoutP,
      sheetAddress,
      renderMode = 'both',
      color = randomColor(),
      strokeWidth = 1,
      circleRadius = 3,
      height: customHeight,
    },
    ref,
  ) => {
    // Helper functions for localStorage
    const getStorageKey = (address?: {projectId: string; sheetId: string}) => {
      if (!address) return 'sequenceDataViewer_default'
      return `sequenceDataViewer_${address.projectId}_${address.sheetId}`
    }

    const loadDataFromStorage = (address?: {
      projectId: string
      sheetId: string
    }): SequenceDataset[] => {
      try {
        const key = getStorageKey(address)
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Handle backward compatibility with old single dataset format
          if (Array.isArray(parsed)) {
            // Old format: array of data points
            if (
              parsed.length > 0 &&
              typeof parsed[0] === 'object' &&
              'time' in parsed[0]
            ) {
              return [
                {
                  id: 'legacy',
                  data: parsed,
                  color: randomColor(),
                  name: 'Legacy Data',
                },
              ]
            }
            // New format: array of datasets
            return parsed.filter(
              (dataset) =>
                dataset &&
                typeof dataset === 'object' &&
                Array.isArray(dataset.data) &&
                typeof dataset.color === 'string',
            )
          }
        }
      } catch (error) {
        console.warn(
          '⚠️ SequenceDataViewer: Failed to load data from localStorage:',
          error,
        )
      }
      return []
    }

    const saveDataToStorage = (
      datasets: SequenceDataset[],
      address?: {projectId: string; sheetId: string},
    ) => {
      try {
        const key = getStorageKey(address)
        localStorage.setItem(key, JSON.stringify(datasets))
      } catch (error) {
        console.warn(
          '⚠️ SequenceDataViewer: Failed to save data to localStorage:',
          error,
        )
      }
    }

    // Initialize datasets from localStorage for the current sheet
    const [datasets, setDatasets] = useState<SequenceDataset[]>(() =>
      loadDataFromStorage(sheetAddress),
    )
    const [isVisible, setIsVisible] = useState(true)

    // Reload data when sheet address changes
    useEffect(() => {
      const newDatasets = loadDataFromStorage(sheetAddress)
      setDatasets(newDatasets)
    }, [sheetAddress?.projectId, sheetAddress?.sheetId])

    // Helper function to parse SVG data from clipboard
    const parseData = (text: string): SequenceDataPoint[] => {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item) =>
              typeof item === 'object' &&
              typeof item.time === 'number' &&
              typeof item.value === 'number',
          )
        }
      } catch {
        // If JSON parsing fails, try to parse as CSV or other formats
        const lines = text.trim().split('\n')
        const data: SequenceDataPoint[] = []

        for (const line of lines) {
          // Skip empty lines and headers
          if (
            !line.trim() ||
            line.toLowerCase().includes('time') ||
            line.toLowerCase().includes('value')
          ) {
            continue
          }

          // Try comma-separated values
          const parts = line.split(',').map((s) => s.trim())
          if (parts.length >= 2) {
            const time = parseFloat(parts[0])
            const value = parseFloat(parts[1])
            if (!isNaN(time) && !isNaN(value)) {
              data.push({time, value})
            }
          } else {
            // Try space or tab separated values
            const spaceParts = line.split(/\s+/).filter((s) => s.length > 0)
            if (spaceParts.length >= 2) {
              const time = parseFloat(spaceParts[0])
              const value = parseFloat(spaceParts[1])
              if (!isNaN(time) && !isNaN(value)) {
                data.push({time, value})
              }
            }
          }
        }

        return data
      }

      return []
    }

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        clearData: () => {
          const newDatasets: SequenceDataset[] = []
          setDatasets(newDatasets)
          saveDataToStorage(newDatasets, sheetAddress)
        },
        addData: (newData: SequenceDataPoint[], newColor?: string) => {
          console.log(
            '📊 SequenceDataViewer: Adding dataset with',
            newData.length,
            'points',
            newColor ? `and color ${newColor}` : '',
          )
          const newDataset: SequenceDataset = {
            id: `dataset-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            data: newData,
            color: newColor || color,
            name: `Dataset ${datasets.length + 1}`,
          }
          const updatedDatasets = [...datasets, newDataset]
          setDatasets(updatedDatasets)
          saveDataToStorage(updatedDatasets, sheetAddress)
        },
        loadData: (newData: SequenceDataPoint[], newColor?: string) => {
          // Keep for backward compatibility - now just calls addData
          console.log(
            '📊 SequenceDataViewer: loadData called, redirecting to addData',
          )
          const newDataset: SequenceDataset = {
            id: `dataset-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            data: newData,
            color: newColor || color,
            name: `Dataset ${datasets.length + 1}`,
          }
          const updatedDatasets = [...datasets, newDataset]
          setDatasets(updatedDatasets)
          saveDataToStorage(updatedDatasets, sheetAddress)
        },
        loadFromClipboard: async () => {
          try {
            const clipboardText = await navigator.clipboard.readText()
            const parsedData = parseData(clipboardText)
            if (parsedData.length > 0) {
              console.log(
                '✅ SequenceDataViewer: Successfully parsed',
                parsedData.length,
                'data points from clipboard',
              )
              const newDataset: SequenceDataset = {
                id: `clipboard-${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 11)}`,
                data: parsedData,
                color: color,
                name: `Clipboard Data ${datasets.length + 1}`,
              }
              const updatedDatasets = [...datasets, newDataset]
              setDatasets(updatedDatasets)
              saveDataToStorage(updatedDatasets, sheetAddress)
            } else {
              console.warn(
                '⚠️ SequenceDataViewer: No valid data found in clipboard',
              )
            }
          } catch (error) {
            console.error(
              '❌ SequenceDataViewer: Failed to read from clipboard:',
              error,
            )
            throw error
          }
        },
        show: () => {
          console.log('👁️ SequenceDataViewer: Showing component')
          setIsVisible(true)
        },
        hide: () => {
          console.log('🙈 SequenceDataViewer: Hiding component')
          setIsVisible(false)
        },
      }),
      [sheetAddress, datasets, color],
    )

    // Keep datasets in a ref so the prism draw callback always has the latest
    const datasetsRef = useRef(datasets)
    datasetsRef.current = datasets

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)

    const {ctx, ratio} = useMemo(() => {
      if (!canvas) return {}
      const ctx = canvas.getContext('2d')!
      const ratio = getRatio(ctx)
      return {ctx, ratio}
    }, [canvas])

    useLayoutEffect(() => {
      if (!ctx) return

      const width = val(layoutP.rightDims.width)
      const height = customHeight || val(layoutP.dopeSheetDims.height) - 30

      canvas!.width = width * ratio!
      canvas!.height = height * ratio!

      const untap = prism(() => {
        return {
          clippedSpaceWidth: val(layoutP.clippedSpace.width),
          unitSpaceToClippedSpace: val(layoutP.clippedSpace.fromUnitSpace),
          height,
        }
      }).onChange(
        getStudio().ticker,
        (p) => {
          ctx.save()
          ctx.scale(ratio!, ratio!)
          drawData(
            ctx,
            p.clippedSpaceWidth,
            p.height,
            p.unitSpaceToClippedSpace,
            datasetsRef.current,
            renderMode,
            strokeWidth,
            circleRadius,
          )
          ctx.restore()
        },
        true,
      )

      return () => {
        untap()
      }
    }, [
      ctx,
      layoutP,
      customHeight,
      datasets,
      renderMode,
      strokeWidth,
      circleRadius,
    ])

    const width = val(layoutP.rightDims.width)
    const height = customHeight || val(layoutP.dopeSheetDims.height) - 30

    return (
      <Container
        isVisible={isVisible}
        style={{
          width: width + 'px',
          height: height + 'px',
        }}
      >
        <TheCanvas
          ref={setCanvas}
          style={{
            width: width + 'px',
            height: height + 'px',
          }}
        />
      </Container>
    )
  },
)

SequenceDataViewer.displayName = 'SequenceDataViewer'

export default SequenceDataViewer

function drawData(
  ctx: CanvasRenderingContext2D,
  clippedSpaceWidth: number,
  height: number,
  unitSpaceToClippedSpace: (u: number) => number,
  datasets: SequenceDataset[],
  renderMode: 'circles' | 'lines' | 'both',
  strokeWidth: number,
  circleRadius: number,
) {
  ctx.clearRect(0, 0, clippedSpaceWidth, height)
  const TWO_PI = Math.PI * 2

  for (const dataset of datasets) {
    const points = dataset.data.map((point) => {
      const x = unitSpaceToClippedSpace(point.time)
      const normalizedValue = point.value // fixed 0-1 range
      const y = height - normalizedValue * (height - 60) - 20 // 20px padding top/bottom
      return {x, y}
    })

    if (points.length === 0) continue

    // Draw lines
    if (
      (renderMode === 'lines' || renderMode === 'both') &&
      points.length > 1
    ) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.strokeStyle = dataset.color
      ctx.lineWidth = strokeWidth
      ctx.stroke()
    }

    // Draw circles
    if (renderMode === 'circles' || renderMode === 'both') {
      ctx.fillStyle = dataset.color
      ctx.globalAlpha = 0.5
      for (const point of points) {
        ctx.beginPath()
        ctx.arc(point.x, point.y, circleRadius, 0, TWO_PI)
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1
  }
}
