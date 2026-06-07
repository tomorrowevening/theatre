# @tomorrowevening/theatre-sync

Transport-agnostic sync for Theatre.js. Lets a remote or mobile device mirror and drive a desktop studio session in real time — over WebSockets or BroadcastChannel.

## How it works

There are two **roles**:

| Role | Description |
|------|-------------|
| `editor` | The desktop browser running Theatre Studio. Owns the project state and broadcasts prop/timeline changes. |
| `app` | A remote device (phone, tablet, second browser tab) that receives those changes and applies them to its scene. |

Both sides connect through a shared **transport**. The editor and app each create a `SyncClient` with the same transport config and opposite roles, then Theatre keeps them in sync automatically.

## Transports

### WebSocketTransport (cross-device)

Requires a relay server. Messages flow: `editor → server → app`.

Best for: phone/tablet control, real devices on the same network.

### BroadcastChannelTransport (same-origin tabs)

Uses the browser's [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) API — no server needed. Messages flow directly between tabs of the same origin.

Best for: editor in one tab, preview in another.

---

## Setup

### WebSocket — editor

```ts
import studio from '@tomorrowevening/theatre-studio'
import { getProject } from '@tomorrowevening/theatre-core'
import { SyncClient, createSyncExtension } from '@tomorrowevening/theatre-sync'
import state from './animationConfig'

const project = getProject('My Project', { state })
const client = new SyncClient({ url: 'ws://localhost:8080', role: 'editor' })

client.connect().catch(console.error)
client.loadProject(project, state).catch(console.error)

studio.extend(createSyncExtension(client))
studio.initialize()
```

### WebSocket — app (remote device)

```ts
import { getProject } from '@tomorrowevening/theatre-core'
import { SyncClient } from '@tomorrowevening/theatre-sync'
import state from './animationConfig'

const project = getProject('My Project', { state })
const client = new SyncClient({ url: 'ws://192.168.1.100:8080', role: 'app' })

await client.connect()
await client.loadProject(project, state)

// Register objects to receive live value updates from the editor
client.sheetObject('Main', 'Box', { x: 0, y: 0, opacity: 1 }, (values) => {
  mesh.position.x = values.x
  mesh.position.y = values.y
  mesh.material.opacity = values.opacity
})
```

### BroadcastChannel — editor tab

```ts
import studio from '@tomorrowevening/theatre-studio'
import { getProject } from '@tomorrowevening/theatre-core'
import { SyncClient, BroadcastChannelTransport, createSyncExtension } from '@tomorrowevening/theatre-sync'
import state from './animationConfig'

const project = getProject('My Project', { state })
const client = new SyncClient({
  transport: new BroadcastChannelTransport('my-project'),
  role: 'editor',
})

client.connect().catch(console.error)
client.loadProject(project, state).catch(console.error)

studio.extend(createSyncExtension(client))
studio.initialize()
```

### BroadcastChannel — app tab

```ts
import { getProject } from '@tomorrowevening/theatre-core'
import { SyncClient, BroadcastChannelTransport } from '@tomorrowevening/theatre-sync'
import state from './animationConfig'

const project = getProject('My Project', { state })
const client = new SyncClient({
  transport: new BroadcastChannelTransport('my-project'), // same name as editor
  role: 'app',
})

await client.connect()
await client.loadProject(project, state)

client.sheetObject('Main', 'Box', { x: 0, y: 0 }, (values) => {
  box.style.transform = `translate(${values.x}px, ${values.y}px)`
})
```

---

## Relay server (WebSocket only)

Start the relay server from the repo root:

```sh
npx tsx theatre/sync/server/index.ts

# Custom port
PORT=9000 npx tsx theatre/sync/server/index.ts
```

The server broadcasts every incoming message to all other connected clients. No business logic — role filtering happens in the browser.

---

## API

### `SyncClient`

```ts
new SyncClient(opts: SyncClientOptions)
```

`SyncClientOptions`:

| Option | Type | Description |
|--------|------|-------------|
| `role` | `'editor' \| 'app'` | Role of this client |
| `url` | `string` | WebSocket server URL — used when no `transport` is provided |
| `transport` | `ITransport` | Custom transport — takes precedence over `url` |

#### Connection

| Method | Description |
|--------|-------------|
| `connect()` | Connect the transport. Returns a `Promise<void>`. |
| `disconnect()` | Disconnect. |
| `dispose()` | Disconnect and release all Theatre state. |
| `connected` | `boolean` — current connection state. |
| `onStatusChange(cb)` | Subscribe to connection status changes. |

#### Theatre

| Method | Description |
|--------|-------------|
| `loadProject(project, state?)` | Register a Theatre `IProject`. Pass the saved state JSON to pre-populate sheets. Returns `Promise<void>`. |
| `sheet(name, instanceId?)` | Get or create a sheet, synced across roles. |
| `sheetObject(sheet, key, props, onUpdate?, instanceId?)` | Get or create a sheet object. `onUpdate` is called whenever values change. |
| `playSheet(name, params?, instanceId?)` | Play a sheet's sequence (synced). |
| `pauseSheet(name, instanceId?)` | Pause a sheet's sequence (synced). |
| `clearSheetObjects(sheetName)` | Unsubscribe all objects on a sheet. |
| `unsubscribe(sheetObject)` | Unsubscribe a single sheet object. |

#### Keyframe helpers

| Method | Description |
|--------|-------------|
| `getSheetObjectKeyframes(sheet, object, prop)` | Raw keyframe data for a single prop. |
| `getSheetObjectVectors(sheet, object)` | Interpolated `{position, x, y, z}` vectors across all keyframes. |
| `getSheetNames()` | List of registered sheet IDs. |

---

### `createSyncExtension(client)`

Returns a Theatre Studio extension that:
- Adds a wifi indicator to the global toolbar (green = connected, muted = disconnected). Clicking it toggles the connection.
- Wires up studio selection and timeline-position relay when `role` is `'editor'`.

Pass to `studio.extend()` before calling `studio.initialize()`.

---

### `WebSocketTransport`

```ts
new WebSocketTransport(url: string)
```

Connects to a WebSocket relay server. Automatically reconnects after 2 seconds on disconnect.

---

### `BroadcastChannelTransport`

```ts
new BroadcastChannelTransport(channelName?: string)
```

Default channel name: `'sync'`. Both the editor and app must use the same `channelName`. Calling `disconnect()` followed by `connect()` is supported.

---

### Custom transport

Implement `ITransport` to use any messaging layer (WebRTC, SSE, socket.io, etc.):

```ts
import type { ITransport, SyncMessage } from '@tomorrowevening/theatre-sync'

class MyTransport implements ITransport {
  connect(): Promise<void> { ... }
  disconnect(): void { ... }
  send(data: SyncMessage): void { ... }
  onMessage(cb: (data: SyncMessage) => void): void { ... }
  onStatus(cb: (connected: boolean) => void): void { ... }
  get connected(): boolean { ... }
}

const client = new SyncClient({ transport: new MyTransport(), role: 'editor' })
```
