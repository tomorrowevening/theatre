import React, {useState, useRef, useEffect} from 'react'
import styled from 'styled-components'
import BasicStringInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicStringInput'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-width: 400px;
  max-width: 500px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #ccc;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.div`
  ${propNameTextCSS};
  font-size: 12px;
  color: #999;
`

const DataPreview = styled.div`
  font-size: 11px;
  color: #666;
  font-style: italic;
  margin-top: 4px;
`

const ColorInputContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const ColorInput = styled.input`
  width: 40px;
  height: 28px;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }
`

const HexInput = styled(BasicStringInput)`
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 8px;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background: #2a2a2a;
  color: #ccc;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  resize: vertical;

  &::placeholder {
    color: #666;
  }

  &:focus {
    outline: none;
    border-color: #4a9eff;
  }
`

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const Button = styled.button<{variant?: 'primary' | 'secondary'}>`
  padding: 8px 16px;
  border: 1px solid
    ${(props) => (props.variant === 'primary' ? '#4a9eff' : '#3a3a3a')};
  border-radius: 4px;
  background: ${(props) =>
    props.variant === 'primary' ? '#4a9eff' : 'transparent'};
  color: ${(props) => (props.variant === 'primary' ? '#fff' : '#ccc')};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.variant === 'primary' ? '#3a8eef' : '#3a3a3a'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const EXAMPLE_DATA = `[
  {"time": 0, "value": 0},
  {"time": 1, "value": 0.5},
  {"time": 2, "value": 0.2},
  {"time": 3, "value": 1}
]

Or CSV format:
time,value
0,0
1,0.5
2,0.2
3,1

Or space-separated:
0 0
1 0.5
2 0.2
3 1`

export type SVGDataPoint = {
  time: number
  value: number
}

export type SVGLoadPopupProps = {
  onLoad: (data: SVGDataPoint[], color: string) => void
  onCancel: () => void
}

const SVGLoadPopup: React.FC<SVGLoadPopupProps> = ({onLoad, onCancel}) => {
  const [color, setColor] = useState('#4a9eff')
  const [hexValue, setHexValue] = useState('#4a9eff')
  const [svgData, setSvgData] = useState('')
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Focus the text area when component mounts
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus()
    }
  }, [])

  // Parse SVG data from text input
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

  const parsedDataCount = parseSVGData(svgData).length
  const isDataValid = parsedDataCount > 0

  const handleCreate = () => {
    const parsedData = parseSVGData(svgData)
    if (parsedData.length > 0) {
      onLoad(parsedData, color)
    } else {
      // Could show an error message here
      console.warn('No valid data found in input')
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && isDataValid) {
        handleCreate()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDataValid])

  // Sync color picker with hex input
  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    setHexValue(newColor)
  }

  // Sync hex input with color picker
  const handleHexChange = (newHex: string) => {
    setHexValue(newHex)
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(newHex)) {
      setColor(newHex)
    }
  }

  const handleCancel = () => {
    setSvgData('')
    setColor('#4a9eff')
    setHexValue('#4a9eff')
    onCancel()
  }

  return (
    <ModalOverlay onClick={handleCancel}>
      <Container onClick={(e) => e.stopPropagation()}>
        <Title>Load SVG Data</Title>

        <Row>
          <Label>Color</Label>
          <ColorInputContainer>
            <ColorInput
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
            />
            <HexInput
              value={hexValue}
              temporarilySetValue={handleHexChange}
              discardTemporaryValue={() => setHexValue(color)}
              permanentlySetValue={handleHexChange}
              isValid={(value) => /^#[0-9A-F]{6}$/i.test(value)}
            />
          </ColorInputContainer>
        </Row>

        <Row>
          <Label>SVG Data</Label>
          <TextArea
            ref={textAreaRef}
            value={svgData}
            onChange={(e) => setSvgData(e.target.value)}
            placeholder={EXAMPLE_DATA}
          />
          {svgData && (
            <DataPreview>
              {parsedDataCount > 0
                ? `${parsedDataCount} data points will be loaded`
                : 'No valid data points found'}
            </DataPreview>
          )}
        </Row>

        <ButtonContainer>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!isDataValid}
          >
            Create
          </Button>
        </ButtonContainer>
      </Container>
    </ModalOverlay>
  )
}

export default SVGLoadPopup
