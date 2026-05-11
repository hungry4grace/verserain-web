import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BlindScriptureApp from './BlindScriptureApp.jsx'

const RootApp = window.location.pathname.startsWith('/blind') ? BlindScriptureApp : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
