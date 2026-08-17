/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />
import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor wraps the Vite web build as native iOS + Android shells.
 * Build web assets first (`npm run build`), then `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.duediligence.buyer',
  appName: 'Due Diligence',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Match Android origin so Edge Function CORS treats iOS like a normal HTTPS client.
    iosScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    // Capawesome owns inset padding; disable Capacitor core auto-insets to avoid double padding.
    SystemBars: {
      insetsHandling: 'disable',
    },
    EdgeToEdge: {
      backgroundColor: '#2a1f20',
      statusBarColor: '#2a1f20',
      navigationBarColor: '#2a1f20',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#2a1f20',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2a1f20',
    },
  },
}

export default config
