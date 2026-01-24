import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@tomorrowevening/theatre-studio'
import {getProject} from '@tomorrowevening/theatre-core'
import ThreeScene from './ThreeScene'

studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThreeScene project={getProject('Three Basic')} />,
)
