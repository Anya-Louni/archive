import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

if (import.meta.env.DEV) {
  let shareModalNoticeShown = false
  window.addEventListener('error', (event) => {
    const source = event.filename || ''
    const message = event.message || ''
    const isShareModalError = source.includes('share-modal.js') || message.includes('share-modal.js')

    if (isShareModalError) {
      event.preventDefault()
      if (!shareModalNoticeShown) {
        shareModalNoticeShown = true
        console.info(
          '[dev-note] Ignored external share-modal.js error. This file is not part of the app bundle and is usually browser-injected.',
        )
      }
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
