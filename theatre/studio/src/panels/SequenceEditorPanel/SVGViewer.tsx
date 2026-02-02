import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react'
import styled from 'styled-components'
import {usePrism} from '@tomorrowevening/theatre-react'
import type {Pointer} from '@tomorrowevening/theatre-dataverse'
import {val} from '@tomorrowevening/theatre-dataverse'
import type {SequenceEditorPanelLayout} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {contentWidth} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/Right'
import HorizontallyScrollableArea from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/HorizontallyScrollableArea'

export type SVGDataPoint = {
  time: number
  value: number
}

export type SVGDataset = {
  id: string
  data: SVGDataPoint[]
  color: string
  name?: string
}

export type SVGViewerProps = {
  layoutP: Pointer<SequenceEditorPanelLayout>
  sheetAddress?: {projectId: string; sheetId: string}
  renderMode?: 'circles' | 'lines' | 'both'
  color?: string
  strokeWidth?: number
  circleRadius?: number
  height?: number // Optional override - defaults to dopeSheetDims.height
}

export type SVGViewerRef = {
  clearData: () => void
  addData: (data: SVGDataPoint[], color?: string) => void
  loadData: (data: SVGDataPoint[], color?: string) => void // Keep for backward compatibility
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

const SVGContainer = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  pointer-events: none;
`

const SVGViewer = forwardRef<SVGViewerRef, SVGViewerProps>(
  (
    {
      layoutP,
      sheetAddress,
      renderMode = 'both',
      color = '#4a9eff',
      strokeWidth = 2,
      circleRadius = 3,
      height: customHeight,
    },
    ref,
  ) => {
    // Helper functions for localStorage
    const getStorageKey = (address?: {projectId: string; sheetId: string}) => {
      if (!address) return 'svgViewer_default'
      return `svgViewer_${address.projectId}_${address.sheetId}`
    }

    const loadDataFromStorage = (address?: {
      projectId: string
      sheetId: string
    }): SVGDataset[] => {
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
                  color: '#4a9eff',
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
          '⚠️ SVGViewer: Failed to load data from localStorage:',
          error,
        )
      }
      return []
    }

    const saveDataToStorage = (
      datasets: SVGDataset[],
      address?: {projectId: string; sheetId: string},
    ) => {
      try {
        const key = getStorageKey(address)
        localStorage.setItem(key, JSON.stringify(datasets))
        console.log(
          `💾 SVGViewer: Saved ${datasets.length} datasets to localStorage for ${key}`,
        )
      } catch (error) {
        console.warn(
          '⚠️ SVGViewer: Failed to save data to localStorage:',
          error,
        )
      }
    }

    // Initialize datasets from localStorage for the current sheet
    const [datasets, setDatasets] = useState<SVGDataset[]>(() =>
      loadDataFromStorage(sheetAddress),
    )
    const [isVisible, setIsVisible] = useState(true)

    // Reload data when sheet address changes
    useEffect(() => {
      const newDatasets = loadDataFromStorage(sheetAddress)
      setDatasets(newDatasets)
    }, [sheetAddress?.projectId, sheetAddress?.sheetId])

    // Helper function to parse SVG data from clipboard
    const parseSVGData = (text: string): SVGDataPoint[] => {
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
        const data: SVGDataPoint[] = []

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
          console.log('🗑️ SVGViewer: Clearing all datasets')
          const newDatasets: SVGDataset[] = []
          setDatasets(newDatasets)
          saveDataToStorage(newDatasets, sheetAddress)
        },
        addData: (newData: SVGDataPoint[], newColor?: string) => {
          console.log(
            '📊 SVGViewer: Adding dataset with',
            newData.length,
            'points',
            newColor ? `and color ${newColor}` : '',
          )
          const newDataset: SVGDataset = {
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
        loadData: (newData: SVGDataPoint[], newColor?: string) => {
          // Keep for backward compatibility - now just calls addData
          console.log('📊 SVGViewer: loadData called, redirecting to addData')
          const newDataset: SVGDataset = {
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
            const parsedData = parseSVGData(clipboardText)
            if (parsedData.length > 0) {
              console.log(
                '✅ SVGViewer: Successfully parsed',
                parsedData.length,
                'data points from clipboard',
              )
              const newDataset: SVGDataset = {
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
              console.warn('⚠️ SVGViewer: No valid data found in clipboard')
            }
          } catch (error) {
            console.error('❌ SVGViewer: Failed to read from clipboard:', error)
            throw error
          }
        },
        show: () => {
          console.log('👁️ SVGViewer: Showing component')
          setIsVisible(true)
        },
        hide: () => {
          console.log('🙈 SVGViewer: Hiding component')
          setIsVisible(false)
        },
      }),
      [sheetAddress, datasets, color],
    )

    return usePrism(() => {
      const width = val(layoutP.rightDims.width)
      const height = customHeight || val(layoutP.dopeSheetDims.height) - 30
      const unitSpaceToScaledSpaceMultiplier = val(
        layoutP.scaledSpace.fromUnitSpace,
      )(1)
      const leftPadding = val(layoutP.scaledSpace.leftPadding)

      // Use fixed 0-1 range for consistent scaling
      // This ensures that value 0.25 appears at 25% height, not full height
      const minValue = 0
      const maxValue = 1
      const valueRange = 1

      return (
        <Container
          isVisible={isVisible}
          style={{
            width: width + 'px',
            height: height + 'px',
            // @ts-expect-error
            '--unitSpaceToScaledSpaceMultiplier':
              unitSpaceToScaledSpaceMultiplier,
          }}
        >
          <HorizontallyScrollableArea layoutP={layoutP} height={height}>
            <SVGContainer
              width={contentWidth}
              height={height}
              viewBox={`0 0 ${contentWidth} ${height}`}
            >
              <g
                style={{
                  transform: `translate(${leftPadding}px, 0px)`,
                }}
              >
                {/* Render each dataset */}
                {datasets.map((dataset) => {
                  // Convert data points to screen coordinates for this dataset
                  const points = dataset.data.map((point, index) => {
                    const x = point.time * unitSpaceToScaledSpaceMultiplier
                    const normalizedValue =
                      (point.value - minValue) / valueRange
                    const y = height - normalizedValue * (height - 40) - 20 // 20px padding top/bottom
                    return {
                      x,
                      y,
                      originalValue: point.value,
                      time: point.time,
                      index,
                    }
                  })

                  // Generate path for lines for this dataset
                  const pathData =
                    points.length > 0
                      ? `M ${points[0].x} ${points[0].y} ` +
                        points
                          .slice(1)
                          .map((p) => `L ${p.x} ${p.y}`)
                          .join(' ')
                      : ''

                  return (
                    <g key={dataset.id}>
                      {/* Render lines for this dataset */}
                      {(renderMode === 'lines' || renderMode === 'both') &&
                        points.length > 1 && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke={dataset.color}
                            strokeWidth={strokeWidth}
                            opacity={0.8}
                          />
                        )}

                      {/* Render circles for this dataset */}
                      {(renderMode === 'circles' || renderMode === 'both') &&
                        points.map((point) => (
                          <circle
                            key={`${dataset.id}-point-${point.index}-${point.time}-${point.originalValue}`}
                            cx={point.x}
                            cy={point.y}
                            r={circleRadius}
                            fill={dataset.color}
                            opacity={0.9}
                          >
                            <title>{`${
                              dataset.name || 'Dataset'
                            } - Time: ${point.time.toFixed(
                              2,
                            )}, Value: ${point.originalValue.toFixed(
                              3,
                            )}`}</title>
                          </circle>
                        ))}
                    </g>
                  )
                })}
              </g>
            </SVGContainer>
          </HorizontallyScrollableArea>
        </Container>
      )
    }, [
      layoutP,
      datasets,
      renderMode,
      strokeWidth,
      circleRadius,
      customHeight,
      isVisible,
    ])
  },
)

SVGViewer.displayName = 'SVGViewer'

export default SVGViewer
