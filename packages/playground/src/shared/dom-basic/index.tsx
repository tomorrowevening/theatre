import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@theatre/studio'
import type {IExtension, ToolsetConfig} from '@theatre/studio'
import {getProject, types} from '@theatre/core'
import type {ISheetObject} from '@theatre/core'
import {Scene} from './Scene'
/**
 * This is a basic example of using Theatre.js for manipulating the DOM.
 */

const dataConfig = {
  exampleProp: types.stringLiteral('yes', {
    no: 'no',
    yes: 'yes',
  }),
}
const extensionConfig: IExtension = {
  id: 'hello-world-extension',
  toolbars: {
    global(set, studio) {
      const obj: ISheetObject<typeof dataConfig> = studio
        .getStudioProject()
        .sheet('example extension UI')
        .object('editor', dataConfig)
      return obj.onValuesChange(({exampleProp}) =>
        set([
          {
            type: 'Icon',
            title: 'Example Icon',
            svgSource: '👁',
            onClick: () => studio.createPane('example'),
          },
        ]),
      )
    },
    exampleToolbar(set, studio) {
      const toolsetConfig: ToolsetConfig = [
        {
          type: 'Icon',
          title: 'Example Icon',
          svgSource: '🍕',
          onClick: () => console.log('icon clicked!'),
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
  },
  definitionVersion: '0.4.0',
  revisionHistory: ['tuRjUa-qdS1HoL-_'],
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={getProject('Sample project', {state: config})} />,
)
