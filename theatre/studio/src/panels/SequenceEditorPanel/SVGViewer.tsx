import React, {useState, useImperativeHandle, forwardRef} from 'react'
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

export type SVGViewerProps = {
  layoutP: Pointer<SequenceEditorPanelLayout>
  renderMode?: 'circles' | 'lines' | 'both'
  color?: string
  strokeWidth?: number
  circleRadius?: number
  height?: number // Optional override - defaults to dopeSheetDims.height
}

export type SVGViewerRef = {
  clearData: () => void
  loadData: (data: SVGDataPoint[]) => void
  loadFromClipboard: () => Promise<void>
}

const Container = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  padding-bottom: 10px;
  pointer-events: none;
  z-index: 1;
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
      renderMode = 'both',
      color = '#4a9eff',
      strokeWidth = 2,
      circleRadius = 3,
      height: customHeight,
    },
    ref,
  ) => {
    const [data, setData] = useState<SVGDataPoint[]>([])

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
          console.log('🗑️ SVGViewer: Clearing data')
          setData([])
        },
        loadData: (newData: SVGDataPoint[]) => {
          console.log(
            '📊 SVGViewer: Loading data with',
            newData.length,
            'points',
          )
          setData(newData)
        },
        loadFromClipboard: async () => {
          try {
            const clipboardText = await navigator.clipboard.readText()
            const parsedData = parseSVGData(clipboardText)
            if (parsedData.length > 0) {
              console.log(
                '✅ SVGViewer: Successfully parsed',
                parsedData.length,
                'data points',
              )
              setData(parsedData)
            } else {
              console.warn('⚠️ SVGViewer: No valid data found in clipboard')
            }
          } catch (error) {
            console.error('❌ SVGViewer: Failed to read from clipboard:', error)
            throw error
          }
        },
      }),
      [],
    )

    return usePrism(() => {
      const width = val(layoutP.rightDims.width)
      const height = customHeight || val(layoutP.dopeSheetDims.height) - 30
      const unitSpaceToScaledSpaceMultiplier = val(
        layoutP.scaledSpace.fromUnitSpace,
      )(1)
      const leftPadding = val(layoutP.scaledSpace.leftPadding)

      // Calculate value range for normalization
      const values = data.map((d) => d.value)
      const minValue = values.length > 0 ? Math.min(...values) : 0
      const maxValue = values.length > 0 ? Math.max(...values) : 1
      const valueRange = maxValue - minValue || 1

      // Convert data points to screen coordinates
      const points = data.map((point, index) => {
        const x = point.time * unitSpaceToScaledSpaceMultiplier
        const normalizedValue = (point.value - minValue) / valueRange
        const y = height - normalizedValue * (height - 40) - 20 // 20px padding top/bottom
        return {x, y, originalValue: point.value, time: point.time, index}
      })

      // Generate path for lines
      const pathData =
        points.length > 0
          ? `M ${points[0].x} ${points[0].y} ` +
            points
              .slice(1)
              .map((p) => `L ${p.x} ${p.y}`)
              .join(' ')
          : ''

      return (
        <Container
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
                {/* Render lines */}
                {(renderMode === 'lines' || renderMode === 'both') &&
                  points.length > 1 && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeWidth}
                      opacity={0.8}
                    />
                  )}

                {/* Render circles */}
                {(renderMode === 'circles' || renderMode === 'both') &&
                  points.map((point) => (
                    <circle
                      key={`point-${point.index}-${point.time}-${point.originalValue}`}
                      cx={point.x}
                      cy={point.y}
                      r={circleRadius}
                      fill={color}
                      opacity={0.9}
                    >
                      <title>{`Time: ${point.time.toFixed(
                        2,
                      )}, Value: ${point.originalValue.toFixed(3)}`}</title>
                    </circle>
                  ))}
              </g>
            </SVGContainer>
          </HorizontallyScrollableArea>
        </Container>
      )
    }, [
      layoutP,
      data,
      renderMode,
      color,
      strokeWidth,
      circleRadius,
      customHeight,
    ])
  },
)

SVGViewer.displayName = 'SVGViewer'

export default SVGViewer
