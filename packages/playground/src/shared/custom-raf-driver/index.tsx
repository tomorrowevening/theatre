import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import studio from '@tomorrowevening/theatre-studio'
import extension from '@tomorrowevening/theatre-r3f/dist/extension'
import {createRafDriver} from '@tomorrowevening/theatre-core'

const rafDriver = createRafDriver({name: 'a custom 5fps raf driver'})
setInterval(() => {
  rafDriver.tick(performance.now())
}, 200)

studio.extend(extension)
studio.initialize({
  __experimental_rafDriver: rafDriver,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App rafDriver={rafDriver} />,
)
