# Property data plan (address → ATTOM → schools → GPS)

## Step 1 — Address search (done)
- Client: `src/lib/addressSearch.ts`, `src/lib/propertyLookup.ts`
- Providers: Census Geocoder + Nominatim fallback + `/api/property-lookup` (dev) / Edge Function

## Step 2 — ATTOM county facts (done in code)
- Mapper: `src/lib/attomMap.ts`
- Endpoint (interactive docs): [`GET /property/detail`](https://api.developer.attomdata.com/docs#!/Property32V1/propertyDetails)
- Query (either form works):
  - `address1` + `address2` (street + city/state/ZIP) — preferred for search → County’s Fact
  - `attomid` when we already have an ATTOM id
- Headers: `apikey`, `Accept: application/json`
- Fields mapped into County’s Fact: living area, beds/baths, year built, lot, APN, zoning, lat/lng, absentee/owner-occupied
- Dev proxy: Vite middleware `POST /api/property-lookup` reads **`ATTOM_API_KEY`** from `.env.local` (not `VITE_*`)
- Production: Supabase Edge Function `property-lookup` + secret `ATTOM_API_KEY`
- Sale **prices stay hidden** (buyer-first). Tax / deed / sales history need sibling ATTOM resources (`/assessment`, `/sale`, `/saleshistory`) — not part of `/property/detail`.
- Related packages on the same docs page (not wired yet):
  - `/property/detailowner` — owner of record
  - `/property/detailwithschools` — schools near property
  - `/property/expandedprofile` — richer profile including assessment/sale snippets
- Status chip on property page: **Live county facts · ATTOM** when matched

### Local setup
```bash
# in bfi-app/.env.local (gitignored)
ATTOM_API_KEY=your_attom_key
```

### Deploy Edge Function
```bash
supabase functions deploy property-lookup
supabase secrets set ATTOM_API_KEY=your_attom_key
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
