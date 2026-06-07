// Structural types only — avoids a hard dep on any specific Theatre package.
type ToolsetConfig = Array<{
  type: 'Icon'
  svgSource: string
  title: string
  onClick: () => void
}>

interface IExtension {
  id: string
  toolbars?: Record<
    string,
    (set: (config: ToolsetConfig) => void, studio: any) => (() => void) | void
  >
}

import type {SyncClient} from './SyncClient'

// Feather "wifi" icon — shown when connected
const SVG_CONNECTED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00ff77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
  <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
  <line x1="12" y1="20" x2="12.01" y2="20"/>
</svg>`

// Feather "wifi-off" icon — shown when disconnected
const SVG_DISCONNECTED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FF0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="1" y1="1" x2="23" y2="23"/>
  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
  <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
  <line x1="12" y1="20" x2="12.01" y2="20"/>
</svg>`

/**
 * Creates a Theatre.js studio extension that:
 * - Adds a wifi indicator to the global toolbar (green = connected, muted = disconnected)
 * - Wires up studio selection and timeline-position relay when role is 'editor'
 *
 * @example
 * ```ts
 * import studio from '@tomorrowevening/theatre-studio'
 * import { SyncClient, createSyncExtension } from '@tomorrowevening/theatre-sync'
 *
 * const client = new SyncClient({ url: 'ws://localhost:8080', role: 'editor' })
 * await client.connect()
 *
 * studio.initialize()
 * studio.extend(createSyncExtension(client))
 * ```
 */
export function createSyncExtension(client: SyncClient): IExtension {
  return {
    id: '@tomorrowevening/theatre-sync',

    toolbars: {
      global: (set, studio) => {
        const update = () => {
          const connected = client.connected
          const config: ToolsetConfig = [
            {
              type: 'Icon',
              svgSource: connected ? SVG_CONNECTED : SVG_DISCONNECTED,
              title: connected
                ? 'WS Sync: Connected — click to disconnect'
                : 'WS Sync: Disconnected — click to reconnect',
              onClick: () => {
                if (client.connected) {
                  client.disconnect()
                } else {
                  client.connect().catch(console.error)
                }
              },
            },
          ]
          set(config)
        }

        client.onStatusChange(update)
        update()

        // Wire up studio ↔ client for the editor role
        if (client.role === 'editor') {
          client.attachStudio(studio)
        }

        return () => {
          client.detachStudio()
        }
      },
    },
  }
}
