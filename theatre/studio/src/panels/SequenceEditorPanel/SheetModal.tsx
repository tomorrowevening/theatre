import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import styled from 'styled-components'

type SheetModalProps = {
  onConfirm: (sheetName: string, mode: 'create' | 'duplicate') => void
  onCancel: () => void
}

export type SheetModalRef = {
  open: (mode: 'create' | 'duplicate', currentSheetName?: string) => void
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
  min-width: 400px;
  max-width: 500px;
`

const Title = styled.h3`
  color: #ffffff;
  font-size: 16px;
  font-family: inherit;
  margin: 0 0 16px 0;
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
  margin-bottom: 20px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.3);
  }

  &::placeholder {
    color: #888888;
  }
`

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

const SheetModal = forwardRef<SheetModalRef, SheetModalProps>(
  ({onConfirm, onCancel}, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<'create' | 'duplicate'>('create')
    const [sheetName, setSheetName] = useState('')

    const title = mode === 'create' ? 'Create New Sheet' : 'Duplicate Sheet'
    const placeholder = 'Enter sheet name'

    useImperativeHandle(ref, () => ({
      open: (newMode: 'create' | 'duplicate', currentSheetName?: string) => {
        setMode(newMode)
        setIsOpen(true)
        if (newMode === 'duplicate' && currentSheetName) {
          setSheetName(`${currentSheetName} Copy`)
        } else {
          setSheetName('')
        }
      },
      close: () => {
        setIsOpen(false)
        setSheetName('')
      },
    }))

    const handleConfirm = useCallback(() => {
      const trimmedName = sheetName.trim()
      if (trimmedName) {
        onConfirm(trimmedName, mode)
        setIsOpen(false)
        setSheetName('')
      }
    }, [sheetName, mode, onConfirm])

    const handleCancel = useCallback(() => {
      onCancel()
      setIsOpen(false)
      setSheetName('')
    }, [onCancel])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
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

    return (
      <Overlay isOpen={isOpen} onClick={handleOverlayClick}>
        <Modal>
          <Title>{title}</Title>
          <Input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
          />
          <ButtonContainer>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!sheetName.trim()}
            >
              Create
            </Button>
          </ButtonContainer>
        </Modal>
      </Overlay>
    )
  },
)

export default SheetModal
