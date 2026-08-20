# Due Diligence · for home buyers

Buyer due-diligence app (React + Vite + TypeScript). County facts, sales & tax history, schools, Presence Confirmed (~100m of the pin), and a GPS-gated Buyer Community observation form.

## Develop (web)

```bash
cd bfi-app
npm install
cp .env.example .env.local   # if present — add Supabase + keys as needed
npm run dev
```

## iOS & Android

Native shells use **Capacitor**. See **[MOBILE.md](./MOBILE.md)** for setup, sync, and store roadmap.

```bash
npm run cap:sync      # build web → sync into ios/ + android/
npm run cap:android   # Android Studio
npm run cap:ios       # Xcode (Mac only)
```

App id: `com.duediligence.buyer`

## Backend

Property lookup runs through Vite’s `/api` proxy in local web dev, or the Supabase Edge Function `property-lookup` in production / native builds. See `supabase/README.md` and `supabase/PROPERTY_DATA.md`.
