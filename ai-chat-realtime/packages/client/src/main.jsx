import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './components/AppRouter.jsx'
import './index.css'

const rootElement = document.getElementById('root')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)

if (document?.body?.classList.contains('preload')) {
  requestAnimationFrame(() => {
    document.body.classList.remove('preload')
    document.body.classList.add('page-loaded')
  })
}
