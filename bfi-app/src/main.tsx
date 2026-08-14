import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'

async function bootstrapNativeShell() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#2a1f20' })
  } catch {
    // Status bar plugin may be unavailable in some simulators.
  }
}

void bootstrapNativeShell()

/** HashRouter is safer inside Capacitor WebViews than path-based history. */
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
