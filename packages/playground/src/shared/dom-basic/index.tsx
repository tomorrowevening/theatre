import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@tomorrowevening/theatre-studio'
import type {IExtension, ToolsetConfig} from '@tomorrowevening/theatre-studio'
import {getProject} from '@tomorrowevening/theatre-core'
import {Scene} from './Scene'
import config from './animationConfig'

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
          onClick: () => {
            studio.createPane('example', {
              x: {value: 150, unit: 'px'},
              y: {value: 10, unit: 'px'},
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
      ]
      set(toolsetConfig)
      return () => console.log('toolbar removed!')
    },
  },
  panes: [
    {
      class: 'example',
      maxInstances: 1,
      mount: ({paneId, node}) => {
        return () => {
          //
        }
      },
    },
  ],
}
studio.extend(extensionConfig)
studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={getProject('Sample project', {state: config})} />,
)
