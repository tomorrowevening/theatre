import React, {useState, useRef, useEffect} from 'react'
import styled from 'styled-components'
import BasicStringInput from '@tomorrowevening/theatre-studio/uiComponents/form/BasicStringInput'
import {propNameTextCSS} from '@tomorrowevening/theatre-studio/propEditors/utils/propNameTextCSS'
import {isAudioFile, formatFileSize} from './audioAnalysis'

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

const Description = styled.div`
  font-size: 11px;
  color: #666;
  font-style: italic;
  margin-bottom: 8px;
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

const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FileUploadArea = styled.div<{isDragOver: boolean; hasFile: boolean}>`
  border: 2px dashed ${(props) => (props.isDragOver ? '#4a9eff' : '#3a3a3a')};
  border-radius: 4px;
  padding: 16px;
  text-align: center;
  background: ${(props) =>
    props.isDragOver ? 'rgba(74, 158, 255, 0.1)' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.hasFile &&
    `
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.05);
  `}

  &:hover {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.05);
  }
`

const FileUploadText = styled.div`
  color: #999;
  font-size: 12px;
  margin-bottom: 4px;
`

const FileInfo = styled.div`
  color: #ccc;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`

const URLInput = styled(BasicStringInput)`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;

  &::placeholder {
    color: #666;
  }
`

const ErrorMessage = styled.div`
  color: #ff6b6b;
  font-size: 11px;
  margin-top: 4px;
`

const SuccessMessage = styled.div`
  color: #4a9eff;
  font-size: 11px;
  margin-top: 4px;
`

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #3a3a3a;
  margin-bottom: 16px;
`

const Tab = styled.button<{active: boolean}>`
  padding: 8px 16px;
  border: none;
  background: ${(props) => (props.active ? '#3a3a3a' : 'transparent')};
  color: ${(props) => (props.active ? '#ccc' : '#999')};
  font-size: 12px;
  cursor: pointer;
  border-bottom: 2px solid
    ${(props) => (props.active ? '#4a9eff' : 'transparent')};
  transition: all 0.2s;

  &:hover {
    background: #3a3a3a;
    color: #ccc;
  }
`

export type AttachAudioPopupProps = {
  onAttach: (source: string | File) => Promise<void>
  onCancel: () => void
}

const AttachAudioPopup: React.FC<AttachAudioPopupProps> = ({
  onAttach,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioURL, setAudioURL] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Focus the URL input when switching to URL tab
  useEffect(() => {
    setError('')
    setSuccess('')
  }, [activeTab])

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!isAudioFile(file)) {
      setError('Please select a supported audio file (MP3, WAV, OGG, M4A, AAC)')
      return
    }

    setAudioFile(file)
    setError('')
    setSuccess('')
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle click on upload area
  const handleUploadAreaClick = () => {
    fileInputRef.current?.click()
  }

  // Validate URL
  const isValidURL = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const isDataValid = () => {
    if (activeTab === 'file') {
      return audioFile !== null
    } else {
      return audioURL.trim() !== '' && isValidURL(audioURL.trim())
    }
  }

  const handleAttach = async () => {
    if (!isDataValid()) return

    setIsAttaching(true)
    setError('')
    setSuccess('')

    try {
      const source = activeTab === 'file' ? audioFile! : audioURL.trim()
      await onAttach(source)
      setSuccess('Audio attached successfully!')

      // Close popup after a brief delay to show success message
      void setTimeout(() => {
        onCancel()
      }, 1000)
    } catch (err) {
      console.error('Failed to attach audio:', err)
      setError(err instanceof Error ? err.message : 'Failed to attach audio')
    } finally {
      setIsAttaching(false)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (
        e.key === 'Enter' &&
        (e.ctrlKey || e.metaKey) &&
        isDataValid()
      ) {
        void handleAttach()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, audioFile, audioURL])

  const handleCancel = () => {
    setAudioFile(null)
    setAudioURL('')
    setError('')
    setSuccess('')
    onCancel()
  }

  return (
    <ModalOverlay onClick={handleCancel}>
      <Container onClick={(e) => e.stopPropagation()}>
        <Title>Attach Audio to Sequence</Title>

        <Description>
          Attach an audio file to sync with your sequence playback. The audio
          will play automatically when the sequence plays.
        </Description>

        <TabContainer>
          <Tab
            active={activeTab === 'file'}
            onClick={() => setActiveTab('file')}
          >
            Upload File
          </Tab>
          <Tab active={activeTab === 'url'} onClick={() => setActiveTab('url')}>
            From URL
          </Tab>
        </TabContainer>

        {activeTab === 'file' ? (
          <Row>
            <Label>Audio File</Label>
            <FileUploadContainer>
              <FileUploadArea
                isDragOver={isDragOver}
                hasFile={audioFile !== null}
                onClick={handleUploadAreaClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileUploadText>
                  {audioFile
                    ? 'Click to select a different audio file'
                    : 'Click to select or drag & drop an audio file'}
                </FileUploadText>
                <FileUploadText style={{fontSize: '11px', color: '#666'}}>
                  Supported formats: MP3, WAV, OGG, M4A, AAC
                </FileUploadText>
                {audioFile && (
                  <FileInfo>
                    🎵 {audioFile.name} ({formatFileSize(audioFile.size)})
                  </FileInfo>
                )}
              </FileUploadArea>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                onChange={handleFileInputChange}
                style={{display: 'none'}}
              />
            </FileUploadContainer>
          </Row>
        ) : (
          <Row>
            <Label>Audio URL</Label>
            <URLInput
              value={audioURL}
              temporarilySetValue={setAudioURL}
              discardTemporaryValue={() => setAudioURL('')}
              permanentlySetValue={setAudioURL}
              isValid={(value) =>
                value.trim() === '' || isValidURL(value.trim())
              }
            />
            {audioURL.trim() === '' && (
              <Description
                style={{marginTop: '4px', fontSize: '11px', color: '#666'}}
              >
                Example: https://example.com/audio.mp3
              </Description>
            )}
            <Description>
              Enter a URL to an audio file. Make sure the server supports CORS
              if loading from a different domain.
            </Description>
          </Row>
        )}

        {error && <ErrorMessage>❌ {error}</ErrorMessage>}
        {success && <SuccessMessage>✅ {success}</SuccessMessage>}

        <ButtonContainer>
          <Button onClick={handleCancel} disabled={isAttaching}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAttach}
            disabled={!isDataValid() || isAttaching}
          >
            {isAttaching ? 'Attaching...' : 'Attach Audio'}
          </Button>
        </ButtonContainer>
      </Container>
    </ModalOverlay>
  )
}

export default AttachAudioPopup
