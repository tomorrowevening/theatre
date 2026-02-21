import {Atom} from '@tomorrowevening/theatre-dataverse'

export type SheetAudioEntry = {
  label: string
  startTime: number
  duration: number
  decodedBuffer: AudioBuffer
  audioContext: AudioContext
  gainNode: GainNode
}

export const audioStore = new Atom<Record<string, SheetAudioEntry>>({})

export function sheetAudioKey(projectId: string, sheetId: string): string {
  return `${projectId}/${sheetId}`
}

export function setSheetAudio(
  projectId: string,
  sheetId: string,
  entry: SheetAudioEntry,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  audioStore.reduce((state) => ({...state, [key]: entry}))
}

export function updateSheetAudioStartTime(
  projectId: string,
  sheetId: string,
  startTime: number,
): void {
  const key = sheetAudioKey(projectId, sheetId)
  audioStore.reduce((state) => {
    const existing = state[key]
    if (!existing) return state
    return {...state, [key]: {...existing, startTime}}
  })
}
