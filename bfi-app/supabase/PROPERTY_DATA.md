# Property data plan (address → ATTOM → schools → GPS)

## Step 1 — Address search (Google Places + fallbacks)
- Client: `src/lib/addressSearch.ts`, `src/lib/propertyLookup.ts`
- **Primary:** Google Places API (New) Autocomplete + Place Details via Vite `/api/property-lookup` or Edge Function
  - Env: `GOOGLE_MAPS_API_KEY` (server-only, never `VITE_*`)
  - Key must allow server calls: Application restriction **None** (or IP), API restriction **Places API (New)**
  - Billing required on the Google Cloud project
- Fallbacks: Census Geocoder, then browser Photon/Nominatim
- After an address is chosen, Step 2 (ATTOM) still loads County’s Fact / tax / sales

## Step 2 — ATTOM county facts + tax + sales (done in code)
- Mapper: `src/lib/attomMap.ts`
- Parallel packages on resolve:
  - [`GET /property/basicprofile`](https://api.developer.attomdata.com/docs#!/Property32V1/propertyBasicProfile) — County’s Fact (`yearBuilt`, `grossSizeAdjusted`, `beds`, `bathsFull` / `bathsPartial` / `bathsTotal`, `assessment.owner`)
  - `GET /assessment/detail` — Tax History (tax year, assessed, land, improvement, annual tax, market value)
  - `GET /sale/detail` — latest transfer (date, deed type, document #; **sale amount hidden**)
  - `GET /saleshistory/expandedhistory` — Sales History deed chain (buyer/seller/doc; **amounts hidden**)
- Query: `address1` + `address2` (or `attomid`) — e.g. `address1=3147 SWALLOW DR&address2=Marietta, GA`
- Headers: `apikey`, `Accept: application/json`
- Dev proxy: Vite `POST /api/property-lookup` + `.env.local` `ATTOM_API_KEY`
- Production: Edge Function `property-lookup` + secret `ATTOM_API_KEY`
- Status chip: **Live county facts · ATTOM** when any package matches

### Local setup
```bash
# in bfi-app/.env.local (gitignored)
ATTOM_API_KEY=your_attom_key
GOOGLE_MAPS_API_KEY=your_maps_platform_key
```

### Deploy Edge Function
```bash
supabase functions deploy property-lookup
supabase secrets set ATTOM_API_KEY=your_attom_key
supabase secrets set GOOGLE_MAPS_API_KEY=your_maps_platform_key
```

### Try these sample addresses (known to return ATTOM data on Free Trial)
- `3147 Swallow Dr NE, Marietta, GA 30066`
- `4529 Winona Court, Denver, CO`
- `901 W Mary St, Austin, TX`
- `100 Congress Ave, Austin, TX`
- `1600 Pennsylvania Ave NW, Washington, DC`

Some residential streets may return `SuccessWithoutResult` on the trial plan — address match still works; facts stay pending with a note.

## Step 3 — GreatSchools (next)
- Bind schools CatchUp surface using lat/lng from the resolved address

## Step 4 — Real GPS Verify
- Compare device geolocation to `property.lat` / `property.lng` within ~100m
