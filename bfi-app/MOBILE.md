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

## Production API note (why ATTOM may show “Pending” on the phone)

Dev web (`npm run dev`) uses Vite’s `/api/property-lookup` proxy with local `ATTOM_API_KEY`.

Native builds load static `dist/` — **there is no Vite proxy**. They must call your deployed **Supabase Edge** `property-lookup`.

Checklist for live county data on emulator/device:

1. `bfi-app/.env.local` has real `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
2. Edge function deployed: `supabase functions deploy property-lookup`
3. Secrets set: `supabase secrets set ATTOM_API_KEY=…` (and Maps key if used)
4. Rebuild after env changes: `npm run cap:sync` then Run ▶ again  
   (Vite bakes `VITE_*` in at **build** time)

## System bars (white strips on Android 16)

Android 15/16 forces edge-to-edge. This project uses `@capawesome/capacitor-android-edge-to-edge-support` so status/nav bars match brand night `#2a1f20`.

GPS **permission sheets** are Android/iOS system UI — they stay system-themed; the app cannot recolor them.

## iOS first run (Mac + Xcode)

```bash
cd bfi-app
git pull origin cursor/create-bfi-app-vite-bd56
npm install
npm run cap:ios          # build + sync + open Xcode
```

In Xcode:
1. Top device menu → **iPhone 16** (or any recent Simulator)
2. Click **Run ▶** (or ⌘R)
3. First run may ask to trust the Mac developer certificate — accept

### Simulator GPS (for Verify testing)
**Features → Location → Custom Location…**  
Example near Marietta sample: lat `34.0`, lng `-84.5` (adjust to the property pin), or **City Run** then try Verify (expect “too far” unless near the pin).

### Page checklist (same app as Android / web)

| Screen | What to confirm |
|---|---|
| Search / home | Brand loads; address typeahead |
| Property shell | `3147 Swallow Dr NE, Marietta, GA 30066` resolves |
| County’s Fact | Live ATTOM fields when Edge + `VITE_SUPABASE_*` baked in |
| Sales History | Deed rows / amounts when live |
| Tax History | Multi-year assessments when live |
| Schools | District/campuses or ATTOM empty state |
| Verified Visits / Community | Copy + GPS gate messaging |
| Verify | Location permission → distance pass/fail |
| Homes in Diligence / Journey / Rules | Nav + pages open |

## Commands cheat sheet

| Script | Purpose |
|---|---|
| `npm run cap:sync` | Web build + sync into ios/ + android/ |
| `npm run cap:android` | Sync + open Android Studio |
| `npm run cap:ios` | Sync + open Xcode |
| `npx cap doctor` | Check Capacitor health |
