import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@tomorrowevening/theatre-studio'
import type {IExtension, ToolsetConfig} from '@tomorrowevening/theatre-studio'
import {getProject} from '@tomorrowevening/theatre-core'
import {Scene} from './Scene'
/**
 * This is a basic example of using Theatre.js for manipulating the DOM.
 */

const extensionConfig: IExtension = {
  id: 'hello-world-extension',
  toolbars: {
    global(set, studio) {
      const toolsetConfig: ToolsetConfig = [
        {
          type: 'Icon',
          title: 'Example Icon',
          svgSource: '🍕',
          onClick: () => studio.createPane('example'),
        },
      ]
      set(toolsetConfig)
      return () => console.log('toolbar removed!')
    },
  },
  panes: [
    {
      class: 'example',
      mount: ({paneId, node}) => {
        studio.ui.renderToolset('exampleToolbar', node)
        return () => console.log('pane closed!')
      },
    },
  ],
}
studio.extend(extensionConfig)
studio.initialize()

const config = {
  sheetsById: {
    DOM: {
      staticOverrides: {
        byObject: {},
      },
      sequence: {
        subUnitsPerUnit: 30,
        length: 1,
        type: 'PositionalSequence',
        tracksByObject: {},
        markers: [
          {
            id: 'jI9k_a5vL9',
            position: 0,
            label: 'start',
          },
          {
            id: 'Qr9AinYoxN',
            position: 0.5,
            label: 'mid',
          },
        ],
      },
    },
    Simple: {
      staticOverrides: {
        byObject: {},
      },
      sequence: {
        subUnitsPerUnit: 30,
        length: 0.5,
        type: 'PositionalSequence',
        tracksByObject: {
          Example: {
            trackData: {
              ncYW4XRntY: {
                type: 'BasicKeyframedTrack',
                __debugName: 'Example:["opacity"]',
                keyframes: [
                  {
                    id: 'oWg7ODD3eI',
                    position: 0,
                    connectedRight: true,
                    handles: [0.5, 1, 0.5, 0],
                    type: 'bezier',
                    value: 1,
                  },
                  {
                    id: 'V3JpckFa7m',
                    position: 0.5,
                    connectedRight: true,
                    handles: [0.5, 1, 0.5, 0],
                    type: 'bezier',
                    value: 0,
                  },
                ],
              },
            },
            trackIdByPropPath: {
              '["opacity"]': 'ncYW4XRntY',
            },
          },
        },
      },
    },
  },
  definitionVersion: '0.4.0',
  revisionHistory: ['qnfoTbsOxWEu3Y53', 'tuRjUa-qdS1HoL-_'],
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={getProject('Sample project', {state: config})} />,
)
