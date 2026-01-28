import React, {useState} from 'react'
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

const Container = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  padding-bottom: 10px;
  pointer-events: none;
`

const SVGContainer = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  pointer-events: none;
`

const SVGViewer: React.FC<SVGViewerProps> = ({
  layoutP,
  renderMode = 'both',
  color = '#4a9eff',
  strokeWidth = 2,
  circleRadius = 3,
  height: customHeight,
}) => {
  const [data, setData] = useState<SVGDataPoint[]>([])

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
}

export default SVGViewer
