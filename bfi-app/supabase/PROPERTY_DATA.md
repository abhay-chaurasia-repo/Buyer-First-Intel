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
- [`GET /property/basicprofile`](https://api.developer.attomdata.com/docs#!/Property32V1/propertyBasicProfile) — County’s Fact
    - Core: `yearBuilt`, `grossSizeAdjusted`, `beds`, `bathsFull` / `bathsPartial` / `bathsTotal`, `assessment.owner`
    - High-value: property type, legal/subdivision/county, lot acres+sqft, levels/rooms/fireplace, garage, utilities, construction, geo accuracy, vintage dates
    - Sale **amounts** and mortgage **amounts** stay hidden (buyer-first)
  - [`GET /property/expandedprofile`](https://api.developer.attomdata.com/docs) — County’s Fact extras
    - Architecture, roof shape, major improvements year, gross/ground-floor size, parking spaces
    - Municipality / tax code area / lot #, quitclaim & REO flags, last seller
    - Mortgage metadata only (lender, loan type, dates) — **amounts hidden**
  - [`GET /property/buildingpermits`](https://api.developer.attomdata.com/docs) — Building permits on County’s Fact
    - `effectiveDate`, `permitNumber`, `status`, `type` / `subType`, `description`, `projectName`, `fees`, `homeOwnerName`, `classifiers`
  - `GET /assessment/detail` — Tax History (tax year, assessed, land, improvement, annual tax, market value)
  - `GET /assessmenthistory/detail` — multi-year Tax History table (year / tax / assessment + land/improvement/market)
  - `GET /sale/detail` — latest transfer (date, deed type, document #; **sale amount hidden**)
  - `GET /saleshistory/expandedhistory` — Sales History deed chain
    - Transfer type, deed code (LW/QC/GD), buyer/seller, doc #, deed-in-lieu, seller carry-back
    - Title company + per-event lender / loan type / term / due date / loan doc # (**amounts hidden**)
  - [`GET /property/detailwithschools`](https://api.developer.attomdata.com/docs) (v4) — Schools CatchUp
    - District name/type + assigned campuses (name, letter rating, grades, public/private, distance, lat/lng)
    - Property block overlaps basicprofile — used only for `school` + `schoolDistrict`
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

## Step 3 — Schools (ATTOM detailwithschools)
- Bound via `GET /property/detailwithschools` (v4) on property lookup
- CatchUp surface uses assigned ES/MS/HS + district; verify boundaries with the district before deciding
- GreatSchools numeric (`GSTestRating`) may be empty on trial — letter `schoolRating` is preferred when present

## Step 4 — Real GPS Verify
- Compare device geolocation to `property.lat` / `property.lng` within ~100m
