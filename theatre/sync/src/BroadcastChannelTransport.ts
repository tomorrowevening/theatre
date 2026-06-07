import type {ITransport, SyncMessage} from './types'

/**
 * Transport that uses the browser's BroadcastChannel API — no server required.
 * Ideal for syncing between tabs/windows of the same origin (e.g. editor in one
 * tab, app preview in another).
 *
 * Both sides must use the same `channelName`.
 *
 * @example
 * ```ts
 * // Editor tab
 * const transport = new BroadcastChannelTransport('my-project')
 * const client = new SyncClient({ transport, role: 'editor' })
 *
 * // App tab
 * const transport = new BroadcastChannelTransport('my-project')
 * const client = new SyncClient({ transport, role: 'app' })
 * ```
 */
export class BroadcastChannelTransport implements ITransport {
  private channel: BroadcastChannel
  private onMessageCb?: (data: SyncMessage) => void
  private onStatusCb?: (connected: boolean) => void
  private _connected = false

  constructor(readonly channelName = 'sync') {
    this.channel = new BroadcastChannel(channelName)
  }

  connect(): Promise<void> {
    this.channel.onmessage = (evt) => {
      try {
        this.onMessageCb?.(evt.data as SyncMessage)
      } catch {
        // ignore malformed messages
      }
    }
    this._connected = true
    this.onStatusCb?.(true)
    return Promise.resolve()
  }

  disconnect(): void {
    this.channel.close()
    // Recreate so connect() can be called again later
    this.channel = new BroadcastChannel(this.channelName)
    this._connected = false
    this.onStatusCb?.(false)
  }

  send(data: SyncMessage): void {
    if (this._connected) {
      this.channel.postMessage(data)
    }
  }

  onMessage(cb: (data: SyncMessage) => void): void {
    this.onMessageCb = cb
  }

  onStatus(cb: (connected: boolean) => void): void {
    this.onStatusCb = cb
  }

  get connected(): boolean {
    return this._connected
  }
}
