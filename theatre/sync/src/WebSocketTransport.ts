import type {SyncMessage} from './types'

type MessageCallback = (data: SyncMessage) => void
type StatusCallback = (connected: boolean) => void

export class WebSocketTransport {
  private ws: WebSocket | null = null
  private onMessageCb?: MessageCallback
  private onStatusCb?: StatusCallback
  private reconnectTimer?: number
  private _connected = false

  constructor(private readonly url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.url)

        ws.onopen = () => {
          this.ws = ws
          this._connected = true
          this.onStatusCb?.(true)
          resolve()
        }

        ws.onmessage = (evt) => {
          try {
            const data: SyncMessage = JSON.parse(evt.data as string)
            this.onMessageCb?.(data)
          } catch {
            // ignore malformed messages
          }
        }

        ws.onclose = () => {
          this.ws = null
          this._connected = false
          this.onStatusCb?.(false)
          // auto-reconnect after a short delay
          this.reconnectTimer = window.setTimeout(() => {
            this.connect().catch(() => {
              /* will retry again on close */
            })
          }, 2000)
        }

        ws.onerror = () => {
          reject(new Error(`WebSocket connection failed: ${this.url}`))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  disconnect(): void {
    window.clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
    this._connected = false
  }

  send(data: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  onMessage(cb: MessageCallback): void {
    this.onMessageCb = cb
  }

  onStatus(cb: StatusCallback): void {
    this.onStatusCb = cb
  }

  get connected(): boolean {
    return this._connected
  }
}
