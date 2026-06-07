import React from 'react'
import ReactDOM from 'react-dom/client'
import type {IStudio, ToolsetConfig} from '@tomorrowevening/theatre-studio'
import {getProject} from '@tomorrowevening/theatre-core'
import {
  BroadcastChannelTransport,
  SyncClient,
  WebSocketTransport,
  createSyncExtension,
} from '@tomorrowevening/theatre-sync'
import {Scene} from './Scene'
import config from './animationConfig'

/**
 * This is a basic example of using Theatre.js for manipulating the DOM.
 */

const isEditor = location.hash.search('editor') > -1
const role = isEditor ? 'editor' : 'app'

/**
 * WebSocket server example:
 * node -r esbuild-register theatre/sync/server/index.ts
 */
const useWebsockets = false // requires the WebSocket server
const transport = useWebsockets
  ? new WebSocketTransport('ws://localhost:8080')
  : new BroadcastChannelTransport('my-project')

const syncClient = new SyncClient({
  transport,
  role,
})
syncClient.connect().catch(console.error)

// Studio

if (isEditor) {
  const extensionConfig = {
    id: 'hello-world-extension',
    toolbars: {
      global(
        set: (config: ToolsetConfig) => void,
        studio: IStudio,
      ): () => void {
        const toolsetConfig: ToolsetConfig = [
          {
            type: 'Icon',
            title: 'Example Icon',
            svgSource: '🍕',
            onClick: () => {
              studio.createPane('example', {
                x: {value: 10, unit: 'px'},
                y: {value: 200, unit: 'px'},
                width: {value: 256, unit: 'px'},
                height: {value: 256, unit: 'px'},
              })
            },
          },
          {
            type: 'Icon',
            title: 'Kill Icon',
            svgSource: '💀',
            onClick: () => {
              studio.destroyPane('example')
            },
          },
          {
            type: 'Flyout',
            label: '🤍',
            items: [
              {
                label: 'Item #1',
                onClick: () => {
                  console.log('#1 clicked')
                },
              },
              {
                label: 'Item #2',
                onClick: () => {
                  console.log('#2 clicked')
                },
              },
              {
                label: 'Item #3',
                onClick: () => {
                  console.log('#3 clicked')
                },
              },
            ],
          },
        ]
        set(toolsetConfig)
        return () => console.log('toolbar removed!')
      },
    },
    panes: [
      {
        class: 'example',
        maxInstances: 1,
        mount: (_: {paneId: string; node: HTMLElement}) => {
          return () => {
            //
          }
        },
      },
    ],
  }
  void import('@tomorrowevening/theatre-studio').then(({default: studio}) => {
    studio.extend(extensionConfig as any)
    studio.extend(createSyncExtension(syncClient))
    studio.initialize()
  })
}

// Core

const project = getProject('Sample project', {state: config})
syncClient.loadProject(project, config).catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={project} />,
)
