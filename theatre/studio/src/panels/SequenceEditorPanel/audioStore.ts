import {Atom} from '@tomorrowevening/theatre-dataverse'

export type SheetAudioEntry = {
  id: string
  sourceURL: string | null
  label: string
  color: string
  startTime: number
  duration: number
  decodedBuffer: AudioBuffer
  audioContext: AudioContext
  gainNode: GainNode
}

let _idCounter = 0
export function generateAudioId(): string {
  return `audio_${Date.now()}_${++_idCounter}`
}

// sheetKey -> ordered list of audio entries
export const audioStore = new Atom<Record<string, SheetAudioEntry[]>>({})

export function sheetAudioKey(projectId: string, sheetId: string): string {
  return `${projectId}/${sheetId}`
}

export function addSheetAudio(
  projectId: string,
  sheetId: string,
  entry: SheetAudioEntry,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  const storedColor = localStorage.getItem(
    audioColorStorageKey(projectId, sheetId, entry.sourceURL, entry.label),
  )
  const entryWithColor = storedColor ? {...entry, color: storedColor} : entry
  audioStore.reduce((state) => ({
    ...state,
    [key]: [...(state[key] ?? []), entryWithColor],
  }))
}

export function removeSheetAudio(
  projectId: string,
  sheetId: string,
  audioId: string,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  audioStore.reduce((state) => ({
    ...state,
    [key]: (state[key] ?? []).filter((e) => e.id !== audioId),
  }))
}

export function updateSheetAudioStartTime(
  projectId: string,
  sheetId: string,
  audioId: string,
  startTime: number,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  audioStore.reduce((state) => ({
    ...state,
    [key]: (state[key] ?? []).map((e) =>
      e.id === audioId ? {...e, startTime} : e,
    ),
  }))
}

function audioColorStorageKey(
  projectId: string,
  sheetId: string,
  sourceURL: string | null,
  label: string,
): string {
  const identifier = sourceURL ?? label
  return `theatre-audio-color-${projectId}/${sheetId}/${identifier}`
}

export function updateSheetAudioColor(
  projectId: string,
  sheetId: string,
  audioId: string,
  color: string,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  audioStore.reduce((state) => {
    const entries = state[key] ?? []
    const entry = entries.find((e) => e.id === audioId)
    if (entry) {
      localStorage.setItem(
        audioColorStorageKey(projectId, sheetId, entry.sourceURL, entry.label),
        color,
      )
    }
    return {
      ...state,
      [key]: entries.map((e) => (e.id === audioId ? {...e, color} : e)),
    }
  })
}

export function updateSheetAudioLabel(
  projectId: string,
  sheetId: string,
  audioId: string,
  label: string,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  audioStore.reduce((state) => ({
    ...state,
    [key]: (state[key] ?? []).map((e) =>
      e.id === audioId ? {...e, label} : e,
    ),
  }))
}

export function getSheetAudioEntries(
  projectId: string,
  sheetId: string,
): SheetAudioEntry[] {
  return audioStore.get()[sheetAudioKey(projectId, sheetId)] ?? []
}
