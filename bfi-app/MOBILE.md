# Due Diligence — iOS & Android (Capacitor)

The product UI stays **React + Vite**. Capacitor wraps that web build in native **iOS** and **Android** shells so you can ship to the App Store and Play Store.

```
bfi-app/ (React)
   ↓ npm run build → dist/
   ↓ npx cap sync
ios/  +  android/   ← native projects
```

App id: `com.duediligence.buyer`  
App name: **Due Diligence**

## Prerequisites

| Platform | Machine | Tools |
|---|---|---|
| Android | Mac / Windows / Linux | [Android Studio](https://developer.android.com/studio), SDK 35+, device or emulator |
| iOS | **Mac only** | Xcode 16+, CocoaPods, Apple Developer account for device/TestFlight |

This cloud agent environment can scaffold projects but **cannot** build iOS (needs Mac) or run Android Studio GUIs.

## One-time setup (on your machine)

```bash
cd bfi-app
npm install
npm run build
npx cap add android   # once
npx cap add ios       # once — Mac only
npx cap sync
```

### Android location permission
`android/app/src/main/AndroidManifest.xml` must include (already set in this repo):

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS location permission
`ios/App/App/Info.plist` must include (already set in this repo):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Due Diligence uses your location to verify you are at a home before unlocking on-site buyer labels.</string>
```

## Daily develop loop

**Web (fast):**
```bash
npm run dev
```

**Native (device / simulator):**
```bash
npm run cap:sync          # build web + copy into ios/android
npm run cap:android       # opens Android Studio
npm run cap:ios           # opens Xcode (Mac)
```

Then Run ▶ on a simulator or plugged-in phone.

## What already works in native shell

- Same diligence UI (County’s Fact, Sales, Tax, Schools, Community)
- **GPS Verify** via `@capacitor/geolocation` (native permission sheet)
- Nearby Verify nudge while the property screen is open
- Status bar styling for the dark shell

## What comes next (native-only roadmap)

1. Push + **geofence** around Homes in Diligence (background “tap Verify” when near)
2. App icons / splash assets per store guidelines
3. Production API: point the app at deployed Edge Functions (not Vite `/api` proxy)
4. TestFlight + Play internal testing
5. Store listings, privacy nutrition labels (location usage)

## Production API note

Dev uses Vite’s `/api/property-lookup` proxy. Native builds load static `dist/` and must call your **Supabase Edge** `property-lookup` (or another HTTPS API). Ensure `VITE_SUPABASE_URL` / anon key are set for release builds and that Edge secrets include `ATTOM_API_KEY` + `GOOGLE_MAPS_API_KEY`.

## Commands cheat sheet

| Script | Purpose |
|---|---|
| `npm run cap:sync` | Web build + sync into native projects |
| `npm run cap:android` | Sync + open Android Studio |
| `npm run cap:ios` | Sync + open Xcode |
| `npx cap doctor` | Check Capacitor health |
