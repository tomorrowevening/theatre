import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@tomorrowevening/theatre-studio'
import {getProject} from '@tomorrowevening/theatre-core'
import {Scene} from './Scene'
import RemoteController from './RemoteController'

const project = getProject('Sample project')
studio.initialize()
RemoteController(project)

ReactDOM.createRoot(document.getElementById('root')!).render(<Scene />)
