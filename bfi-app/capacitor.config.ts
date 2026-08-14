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
    // Use https cleartext only for optional live-reload against a LAN Vite server.
    androidScheme: 'https',
  },
  plugins: {
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
