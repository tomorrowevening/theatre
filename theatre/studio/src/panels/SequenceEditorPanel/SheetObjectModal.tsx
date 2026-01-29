import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import styled from 'styled-components'

type PropType = 'number' | 'string' | 'boolean' | 'rgba' | 'compound'

type RGBAColor = {
  r: number
  g: number
  b: number
  a: number
}

type SheetObjectModalProps = {
  onConfirm: (objectData: {
    name: string
    key: string
    type: PropType
    value: any
    min?: number
    max?: number
    step?: number
  }) => void
  onCancel: () => void
}

export type SheetObjectModalRef = {
  open: (existingObjectName?: string) => void
  close: () => void
}

const Overlay = styled.div<{isOpen: boolean}>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${(props) => (props.isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 10000;
`

const Modal = styled.div`
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 24px;
  min-width: 500px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
`

const Title = styled.h3`
  color: #ffffff;
  font-size: 16px;
  font-family: inherit;
  margin: 0 0 20px 0;
  font-weight: 500;
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  color: #cccccc;
  font-size: 12px;
  font-family: inherit;
  margin-bottom: 6px;
  font-weight: 500;
`

const Input = styled.input`
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.3);
  }

  &::placeholder {
    color: #888888;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Select = styled.select`
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.3);
  }

  option {
    background: #1e1e1e;
    color: #ffffff;
  }
`

const RangeGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
`

const ColorGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`

const ColorPreview = styled.div<{color: string}>`
  width: 40px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #3e3e42;
  background: ${(props) => props.color};
  cursor: pointer;
  position: relative;

  &:hover {
    border-color: #0078d4;
  }
`

const ColorPicker = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`

const HexInput = styled(Input)`
  flex: 1;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
`

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ToggleSwitch = styled.div<{isOn: boolean}>`
  width: 48px;
  height: 24px;
  border-radius: 12px;
  background: ${(props) => (props.isOn ? '#0078d4' : '#3e3e42')};
  border: 1px solid ${(props) => (props.isOn ? '#0078d4' : '#5a5a5a')};
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.isOn ? '#106ebe' : '#4a4a4a')};
  }
`

const ToggleKnob = styled.div<{isOn: boolean}>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  position: absolute;
  top: 2px;
  left: ${(props) => (props.isOn ? '26px' : '2px')};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`

const ToggleLabel = styled.span<{isOn: boolean}>`
  color: ${(props) => (props.isOn ? '#ffffff' : '#cccccc')};
  font-size: 14px;
  font-family: inherit;
  font-weight: ${(props) => (props.isOn ? '500' : 'normal')};
`

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`

const Button = styled.button<{variant?: 'primary' | 'secondary'}>`
  background: ${(props) =>
    props.variant === 'primary' ? '#0078d4' : 'transparent'};
  color: ${(props) => (props.variant === 'primary' ? '#ffffff' : '#cccccc')};
  border: 1px solid
    ${(props) => (props.variant === 'primary' ? '#0078d4' : '#3e3e42')};
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  min-width: 80px;

  &:hover {
    background: ${(props) =>
      props.variant === 'primary' ? '#106ebe' : '#3e3e42'};
  }

  &:active {
    background: ${(props) =>
      props.variant === 'primary' ? '#005a9e' : '#4a4a4a'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SheetObjectModal = forwardRef<SheetObjectModalRef, SheetObjectModalProps>(
  ({onConfirm, onCancel}, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState('')
    const [key, setKey] = useState('')
    const [type, setType] = useState<PropType>('number')
    const [value, setValue] = useState('')
    const [min, setMin] = useState('')
    const [max, setMax] = useState('')
    const [step, setStep] = useState('')
    const [hexColor, setHexColor] = useState('#FFFFFF')
    const [booleanValue, setBooleanValue] = useState(false)

    // Color conversion utilities
    const hexToRgba = (hex: string): RGBAColor => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (result) {
        return {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
          a: 1,
        }
      }
      return {r: 1, g: 1, b: 1, a: 1}
    }

    const rgbaToHex = (rgba: RGBAColor): string => {
      const toHex = (n: number) => {
        const hex = Math.round(n * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`.toUpperCase()
    }

    const parseRgbaValue = (valueStr: string): RGBAColor => {
      try {
        const parsed = JSON.parse(valueStr)
        if (
          parsed &&
          typeof parsed === 'object' &&
          'r' in parsed &&
          'g' in parsed &&
          'b' in parsed
        ) {
          return {
            r: parsed.r,
            g: parsed.g,
            b: parsed.b,
            a: 1, // Always 1 for animation purposes
          }
        }
      } catch {}
      return {r: 1, g: 1, b: 1, a: 1}
    }

    useImperativeHandle(ref, () => ({
      open: (existingObjectName?: string) => {
        setIsOpen(true)
        // Reset form
        setName(existingObjectName || '')
        setKey('')
        setType('number')
        setValue('')
        setMin('')
        setMax('')
        setStep('')
        setHexColor('#FFFFFF')
        setBooleanValue(false)
      },
      close: () => {
        setIsOpen(false)
      },
    }))

    const getDefaultValue = (propType: PropType) => {
      switch (propType) {
        case 'number':
          return '0'
        case 'string':
          return 'Hello World'
        case 'boolean':
          return 'false'
        case 'rgba':
          return '{"r": 1, "g": 1, "b": 1, "a": 1}'
        case 'compound':
          return '{"x": 0, "y": 0, "z": 0}'
        default:
          return ''
      }
    }

    const getPlaceholder = (propType: PropType) => {
      switch (propType) {
        case 'number':
          return 'e.g. 0, 3.14, -10'
        case 'string':
          return 'e.g. "Hello World"'
        case 'boolean':
          return 'Use toggle below'
        case 'rgba':
          return 'Use color picker or enter hex'
        case 'compound':
          return '{"x": 0, "y": 0, "z": 0}'
        default:
          return ''
      }
    }

    const handleTypeChange = (newType: PropType) => {
      setType(newType)
      const defaultVal = getDefaultValue(newType)
      setValue(defaultVal)

      // Set specific defaults for different types
      if (newType === 'rgba') {
        const rgba = parseRgbaValue(defaultVal)
        setHexColor(rgbaToHex(rgba))
      } else if (newType === 'boolean') {
        setBooleanValue(false)
        setValue('false')
      }

      // Clear range inputs for non-number types
      if (newType !== 'number') {
        setMin('')
        setMax('')
        setStep('')
      }
    }

    const handleBooleanToggle = () => {
      const newValue = !booleanValue
      setBooleanValue(newValue)
      setValue(newValue.toString())
    }

    const handleColorChange = (newHex: string) => {
      setHexColor(newHex)
      const rgba = hexToRgba(newHex)
      setValue(JSON.stringify(rgba))
    }

    const handleHexInputChange = (newHex: string) => {
      // Validate hex format
      const hexRegex = /^#[0-9A-Fa-f]{6}$/
      if (hexRegex.test(newHex)) {
        handleColorChange(newHex)
      } else {
        setHexColor(newHex) // Allow partial input
      }
    }

    const parseValue = (rawValue: string, propType: PropType) => {
      switch (propType) {
        case 'number':
          const num = parseFloat(rawValue)
          return isNaN(num) ? 0 : num
        case 'string':
          return rawValue
        case 'boolean':
          return rawValue.toLowerCase() === 'true'
        case 'rgba':
          try {
            return JSON.parse(rawValue)
          } catch {
            return {r: 1, g: 1, b: 1, a: 1}
          }
        case 'compound':
          try {
            return JSON.parse(rawValue)
          } catch {
            return {}
          }
        default:
          return rawValue
      }
    }

    const handleConfirm = useCallback(() => {
      const trimmedName = name.trim()
      const trimmedKey = key.trim()
      if (!trimmedName || !trimmedKey) return

      const parsedValue = parseValue(value, type)
      const objectData: any = {
        name: trimmedName,
        key: trimmedKey,
        type,
        value: parsedValue,
      }

      // Add range properties for number type
      if (type === 'number') {
        if (min !== '') objectData.min = parseFloat(min)
        if (max !== '') objectData.max = parseFloat(max)
        if (step !== '') objectData.step = parseFloat(step)
      }

      onConfirm(objectData)
      setIsOpen(false)
    }, [name, key, type, value, min, max, step, onConfirm])

    const handleCancel = useCallback(() => {
      onCancel()
      setIsOpen(false)
    }, [onCancel])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          handleConfirm()
        } else if (e.key === 'Escape') {
          handleCancel()
        }
      },
      [handleConfirm, handleCancel],
    )

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          handleCancel()
        }
      },
      [handleCancel],
    )

    const isNumberType = type === 'number'
    const isRgbaType = type === 'rgba'
    const isBooleanType = type === 'boolean'
    const canSubmit = name.trim() !== '' && key.trim() !== ''

    return (
      <Overlay isOpen={isOpen} onClick={handleOverlayClick}>
        <Modal>
          <Title>Create Sheet Object</Title>

          <FormGroup>
            <Label>Object Name</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter object name (e.g. 'myBox', 'character')"
              autoFocus
            />
          </FormGroup>

          <FormGroup>
            <Label>Property Key</Label>
            <Input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter property key (e.g. 'position', 'color', 'scale')"
            />
          </FormGroup>

          <FormGroup>
            <Label>Type</Label>
            <Select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as PropType)}
            >
              <option value="number">Number</option>
              <option value="string">String</option>
              <option value="boolean">Boolean</option>
              <option value="rgba">Color</option>
              <option value="compound">Object</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Default Value</Label>
            {isRgbaType ? (
              <ColorGroup>
                <ColorPreview color={hexColor}>
                  <ColorPicker
                    type="color"
                    value={hexColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                  />
                </ColorPreview>
                <HexInput
                  type="text"
                  value={hexColor}
                  onChange={(e) => handleHexInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="#FFFFFF"
                />
              </ColorGroup>
            ) : isBooleanType ? (
              <ToggleContainer>
                <ToggleSwitch isOn={booleanValue} onClick={handleBooleanToggle}>
                  <ToggleKnob isOn={booleanValue} />
                </ToggleSwitch>
                <ToggleLabel isOn={booleanValue}>
                  {booleanValue ? 'True' : 'False'}
                </ToggleLabel>
              </ToggleContainer>
            ) : (
              <Input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholder(type)}
              />
            )}
          </FormGroup>

          {isNumberType && (
            <FormGroup>
              <Label>Range (Optional)</Label>
              <RangeGroup>
                <div>
                  <Label style={{fontSize: '11px', marginBottom: '4px'}}>
                    Min
                  </Label>
                  <Input
                    type="number"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Min"
                  />
                </div>
                <div>
                  <Label style={{fontSize: '11px', marginBottom: '4px'}}>
                    Max
                  </Label>
                  <Input
                    type="number"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Max"
                  />
                </div>
                <div>
                  <Label style={{fontSize: '11px', marginBottom: '4px'}}>
                    Step
                  </Label>
                  <Input
                    type="number"
                    value={step}
                    onChange={(e) => setStep(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Step"
                  />
                </div>
              </RangeGroup>
            </FormGroup>
          )}

          <ButtonContainer>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!canSubmit}
            >
              Create
            </Button>
          </ButtonContainer>
        </Modal>
      </Overlay>
    )
  },
)

SheetObjectModal.displayName = 'SheetObjectModal'

export default SheetObjectModal
