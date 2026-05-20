import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BlindScriptureApp from './BlindScriptureApp.jsx'
import PrivacyPage from './PrivacyPage.jsx'

const localPreviewHosts = new Set(['localhost', '127.0.0.1', '::1'])
if (localPreviewHosts.has(window.location.hostname)) {
  document.documentElement.dataset.localFontScale = '2x'
}

const RootApp = window.location.pathname.startsWith('/privacy')
  ? PrivacyPage
  : window.location.pathname.startsWith('/blind')
    ? BlindScriptureApp
    : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
