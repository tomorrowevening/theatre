import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import studio from '@tomorrowevening/theatre-studio'
import extension from '@tomorrowevening/theatre-r3f/dist/extension'

studio.extend(extension)
studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
