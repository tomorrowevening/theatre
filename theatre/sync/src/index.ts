/**
 * \@tomorrowevening/theatre-sync
 *
 * Transport-agnostic sync for Theatre.js. Lets a remote/mobile device mirror
 * and drive a desktop studio session — over WebSockets or BroadcastChannel.
 *
 * --- Desktop (editor) setup — WebSocket ---
 * ```ts
 * import studio from '@tomorrowevening/theatre-studio'
 * import { SyncClient, createSyncExtension } from '@tomorrowevening/theatre-sync'
 *
 * const client = new SyncClient({ url: 'ws://localhost:8080', role: 'editor' })
 * await client.connect()
 * await client.loadProject(project, state)
 *
 * studio.initialize()
 * studio.extend(createSyncExtension(client))
 * ```
 *
 * --- Desktop (editor) setup — BroadcastChannel ---
 * ```ts
 * import studio from '@tomorrowevening/theatre-studio'
 * import { SyncClient, BroadcastChannelTransport, createSyncExtension } from '@tomorrowevening/theatre-sync'
 *
 * const client = new SyncClient({ transport: new BroadcastChannelTransport(), role: 'editor' })
 * await client.connect()
 * await client.loadProject(project, state)
 *
 * studio.initialize()
 * studio.extend(createSyncExtension(client))
 * ```
 *
 * --- Remote/mobile (app) setup ---
 * ```ts
 * import { SyncClient } from '@tomorrowevening/theatre-sync'
 *
 * const client = new SyncClient({ url: 'ws://192.168.1.1:8080', role: 'app' })
 * await client.connect()
 * await client.loadProject(project, state)
 *
 * const obj = client.sheetObject('MySheet', 'Box', { x: 0, y: 0 }, (values) => {
 *   mesh.position.x = values.x
 * })
 * ```
 *
 * --- Relay server (WebSocket only) ---
 * Run with:  npx tsx theatre/sync/server/index.ts
 * Or import: import '\@tomorrowevening/theatre-sync/server'
 *
 * @packageDocumentation
 */

export {SyncClient} from './SyncClient'
export {createSyncExtension} from './extension'
export {WebSocketTransport} from './WebSocketTransport'
export {BroadcastChannelTransport} from './BroadcastChannelTransport'
export type {
  ITransport,
  SyncClientOptions,
  SyncRole,
  SyncTarget,
  SyncEvent,
  SyncMessage,
} from './types'
