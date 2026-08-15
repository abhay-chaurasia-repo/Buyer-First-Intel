import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'

async function bootstrapNativeShell() {
  if (!Capacitor.isNativePlatform()) return
  try {
    // Light icons on dark bars
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark })
    await StatusBar.setStyle({ style: Style.Dark })
    if (Capacitor.getPlatform() === 'android') {
      await EdgeToEdge.enable()
      await EdgeToEdge.setBackgroundColor({ color: '#2a1f20' })
      await EdgeToEdge.setStatusBarColor({ color: '#2a1f20' })
      await EdgeToEdge.setNavigationBarColor({ color: '#2a1f20' })
    } else {
      await StatusBar.setBackgroundColor({ color: '#2a1f20' })
    }
  } catch {
    // Native chrome plugins may be unavailable in some simulators.
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
