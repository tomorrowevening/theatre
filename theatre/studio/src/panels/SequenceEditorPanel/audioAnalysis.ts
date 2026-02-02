export type AudioAnalysisResult = {
  time: number
  amplitude: number
}

export type AudioAnalysisOptions = {
  sampleRate?: number // How many samples per second to analyze (default: 100)
  normalize?: boolean // Whether to normalize amplitude to 0-1 range (default: true)
}

/**
 * Analyzes an audio file and extracts amplitude data over time
 * @param file - The audio file to analyze (MP3, WAV, etc.)
 * @param options - Analysis options
 * @returns Promise resolving to array of time/amplitude data points
 */
export async function analyzeAudioFile(
  file: File,
  options: AudioAnalysisOptions = {},
): Promise<AudioAnalysisResult[]> {
  const {sampleRate = 100, normalize = true} = options

  try {
    // Create audio context
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)()

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Get the first channel (mono or left channel for stereo)
    const channelData = audioBuffer.getChannelData(0)
    const duration = audioBuffer.duration
    const originalSampleRate = audioBuffer.sampleRate

    // Calculate how many samples to skip for our target sample rate
    const samplesPerAnalysis = Math.floor(originalSampleRate / sampleRate)
    const totalAnalysisPoints = Math.floor(
      channelData.length / samplesPerAnalysis,
    )

    const results: AudioAnalysisResult[] = []
    let maxAmplitude = 0

    // First pass: calculate RMS amplitude for each time segment
    for (let i = 0; i < totalAnalysisPoints; i++) {
      const startSample = i * samplesPerAnalysis
      const endSample = Math.min(
        startSample + samplesPerAnalysis,
        channelData.length,
      )

      // Calculate RMS (Root Mean Square) amplitude for this segment
      let sumSquares = 0
      for (let j = startSample; j < endSample; j++) {
        sumSquares += channelData[j] * channelData[j]
      }
      const rmsAmplitude = Math.sqrt(sumSquares / (endSample - startSample))

      const time = (i * samplesPerAnalysis) / originalSampleRate

      results.push({
        time,
        amplitude: rmsAmplitude,
      })

      // Track max amplitude for normalization
      if (rmsAmplitude > maxAmplitude) {
        maxAmplitude = rmsAmplitude
      }
    }

    // Second pass: normalize if requested
    if (normalize && maxAmplitude > 0) {
      for (const result of results) {
        result.amplitude = result.amplitude / maxAmplitude
      }
    }

    // Clean up audio context
    await audioContext.close()

    console.log(
      `🎵 Audio analysis complete: ${
        results.length
      } data points over ${duration.toFixed(2)}s`,
    )

    return results
  } catch (error) {
    console.error('❌ Audio analysis failed:', error)
    throw new Error(
      `Failed to analyze audio file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }
}

/**
 * Validates if a file is a supported audio format
 */
export function isAudioFile(file: File): boolean {
  const supportedTypes = [
    'audio/mpeg', // MP3
    'audio/wav', // WAV
    'audio/ogg', // OGG
    'audio/mp4', // M4A
    'audio/aac', // AAC
  ]

  return (
    supportedTypes.includes(file.type) ||
    file.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/) !== null
  )
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
