export type SyncRole = 'editor' | 'app'
export type SyncTarget = 'app' | 'editor'

export type SyncEvent =
  | 'createSheet'
  | 'playSheet'
  | 'pauseSheet'
  | 'createSheetObject'
  | 'updateSheetObject'
  | 'setSheet'
  | 'setSheetObject'
  | 'updateTimeline'

export interface SyncMessage {
  event: SyncEvent
  target: SyncTarget
  data: Record<string, any>
}

export type DataUpdateCallback = (data: Record<string, any>) => void
export type VoidCallback = () => void

export interface ITransport {
  connect(): Promise<void>
  disconnect(): void
  send(data: SyncMessage): void
  onMessage(cb: (data: SyncMessage) => void): void
  onStatus(cb: (connected: boolean) => void): void
  readonly connected: boolean
}

export type SyncClientOptions = {
  /** 'editor' for the desktop studio window; 'app' for the remote/mobile client */
  role: SyncRole
  transport: ITransport
}
