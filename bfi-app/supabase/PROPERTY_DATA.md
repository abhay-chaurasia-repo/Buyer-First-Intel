# Property data plan (address → ATTOM → schools → GPS)

## Step 1 — Address search (Google Places New + fallbacks)
- Client: `src/lib/addressSearch.ts`, `src/lib/propertyLookup.ts`
- **Primary:** Google Places API (New) Autocomplete + Place Details via Vite `/api/property-lookup` or Edge Function
  - Env: `GOOGLE_MAPS_API_KEY` (server-only, never `VITE_*`)
  - Then Geocoding API, then Address Validation API, for complete typed addresses the Autocomplete miss
  - Key must allow server calls: Application restriction **None** (or IP), **not Websites**
  - Enable: **Places API (New)**, **Geocoding API**, **Address Validation API**
  - Billing required on the Google Cloud project
- Fallbacks: Census Geocoder, ATTOM address, then a typed US street + city + state
- After an address is chosen, Step 2 (ATTOM) still loads County’s Fact / tax / sales

## Step 2 — ATTOM county facts + tax + sales (done in code)
- Mapper: `src/lib/attomMap.ts`
- Parallel packages on resolve:
- [`GET /property/basicprofile`](https://api.developer.attomdata.com/docs#!/Property32V1/propertyBasicProfile) — County’s Fact
    - Core: `yearBuilt`, `grossSizeAdjusted`, `beds`, `bathsFull` / `bathsPartial` / `bathsTotal`, `assessment.owner`
    - High-value: property type, legal/subdivision/county, lot acres+sqft, levels/rooms/fireplace, garage, utilities, construction, geo accuracy, vintage dates
    - Sale amounts shown when published; mortgage **amounts** stay hidden (buyer-first)
  - [`GET /property/expandedprofile`](https://api.developer.attomdata.com/docs) — County’s Fact extras
    - Architecture, roof shape, major improvements year, gross/ground-floor size, parking spaces
    - Municipality / tax code area / lot #, quitclaim & REO flags, last seller
    - Mortgage metadata only (lender, loan type, dates) — **amounts hidden**
  - [`GET /property/buildingpermits`](https://api.developer.attomdata.com/docs) — Building permits on County’s Fact
    - `effectiveDate`, `permitNumber`, `status`, `type` / `subType`, `description`, `projectName`, `fees`, `homeOwnerName`, `classifiers`
  - `GET /assessment/detail` — Tax History (tax year, assessed, land, improvement, annual tax, market value)
  - `GET /assessmenthistory/detail` — multi-year Tax History table (year / tax / assessment + land/improvement/market)
  - `GET /sale/detail` — latest transfer (date, deed type, document #, **sale amount** when published)
  - `GET /saleshistory/expandedhistory` — Sales History deed chain
    - Transfer type, deed code (LW/QC/GD), buyer/seller, doc #, deed-in-lieu, seller carry-back, **sale amount**
    - Title company + per-event lender / loan type / term / due date / loan doc # (mortgage **amounts hidden**)
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
cd bfi-app
npx supabase secrets set ATTOM_API_KEY=your_attom_key
npx supabase secrets set GOOGLE_MAPS_API_KEY=your_maps_platform_key
npx supabase functions deploy property-lookup
```

If the iOS/Android property banner says **`ATTOM_API_KEY not set`**, the Edge Function is reachable but this secret was never stored. From `bfi-app` (uses the same key as web `.env.local`):

```bash
set -a && source .env.local && set +a
npx supabase secrets set "ATTOM_API_KEY=$ATTOM_API_KEY"
npx supabase functions deploy property-lookup
```

Then search the address again — no app rebuild needed for the secret.

Native iOS/Android send the app anon key (or the buyer’s phone JWT). The function allows either so Simulator county facts load without a phone-OTP session. Redeploy after pulling this change or iOS will keep showing pending (HTTP 401).

### Try these sample addresses (known to return ATTOM data on Free Trial)
- `3147 Swallow Dr NE, Marietta, GA 30066`
- `4529 Winona Court, Denver, CO`
- `901 W Mary St, Austin, TX`
- `100 Congress Ave, Austin, TX`
- `1600 Pennsylvania Ave NW, Washington, DC`

Some residential streets may return `SuccessWithoutResult` on the trial plan — address match still works; facts stay pending with a note.

## Step 3 — Schools (ATTOM detailwithschools + nearby search)
- Assigned campuses via `GET /property/detailwithschools` (v4)
- CatchUp shows assigned ES/MS/HS + district when ATTOM publishes them
- If assigned campuses are missing, the card says so and still shows district when present
- Nearby campuses via `GET /school/search` (v4, 5-mile radius) — labeled **Nearby**, never assigned
- Buyers are told to confirm zoning with the district before writing an offer
- Ratings stay hidden in the Schools tile
- GreatSchools enrichment is deferred

## Step 4 — Presence Confirmed (v1 done)
- Property page **Confirm** uses `navigator.geolocation` vs `property.lat` / `property.lng`
- Pass when distance ≤ ~100m and accuracy ≤ ~80m
- Proves the device was near the pin — not that the buyer entered the home or completed a tour
- **Permanent log:** each Confirm appends a dated presence event locally and, when signed in, in Supabase `presence_events`
- **2-week contribution window:** on-site Plus/Watch votes stay available for 2 weeks from the latest Confirm
- **Remote GLA:** Gross living area match/overstated votes do **not** need Confirm; they write to `community_votes` like other labels
- **Counts:** signed-in buyers only (`get_community_summary`) — no demo seed totals
- Failures: no pin, permission denied, timeout, too far, poor accuracy
- **Nearby nudge (setting, default on):** while the property page is open, watch location; within ~300m and not yet confirmed, pulse the Confirm control + banner to push the tap
- Mapper: `src/lib/gpsVerify.ts` · local: `bfi.presenceEvents.{owner}.{propertyId}` · cloud: `src/lib/communityApi.ts` · SQL: `migrations/005_community_presence_votes.sql`
- Live Presence Confirmed rows come from the server log when signed in, otherwise local “You” events only
