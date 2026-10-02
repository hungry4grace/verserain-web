import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PrivacyPage from './PrivacyPage.jsx'
import DeleteAccountPage from './DeleteAccountPage.jsx'

// Apply 長輩模式 before the first paint so the page doesn't jump in size.
try { if (localStorage.getItem('verserain_elder_mode') === 'true') document.documentElement.classList.add('elder-mode'); } catch { /* ignore */ }

const RootApp = window.location.pathname.startsWith('/privacy')
  ? PrivacyPage
  : window.location.pathname.startsWith('/delete-account')
    ? DeleteAccountPage
    : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
