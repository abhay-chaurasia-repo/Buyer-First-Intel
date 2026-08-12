# Property data plan (address → ATTOM → schools → GPS)

## Step 1 — Address search (implemented)
- Client: `src/lib/addressSearch.ts`, `src/lib/propertyLookup.ts`
- Providers:
  - **Census Bureau Geocoder** (primary, no key) — normalize US street + city + state + ZIP + lat/lng
  - **Nominatim** — suggestions when Census returns nothing on partial queries
  - Optional Edge Function **`property-lookup`** when deployed (auth required)
- Home search suggests matches; submit navigates with the matched formatted address
- Property detail loads the resolved shell; county facts stay **pending** until ATTOM

### Deploy Edge Function (optional but recommended)
```bash
supabase functions deploy property-lookup
```
Phone-authenticated users hit this first; others fall back to browser Census/Nominatim.

## Step 2 — ATTOM (next)
1. Get an ATTOM API key (Property Detail / Expanded Profile)
2. Set secret: `supabase secrets set ATTOM_API_KEY=...`
3. Implement `fetchAttomFacts` in `supabase/functions/property-lookup/index.ts`
4. Map into `MockProperty` fields already shown: sqft, beds, baths, yearBuilt, lot, APN, zoning, owner, sale, tax
5. Set `factsStatus: 'live'` when mapping succeeds

## Step 3 — GreatSchools
- Bind `fetchSchoolsApi` / schools CatchUp surface to GreatSchools using lat/lng from the resolved address

## Step 4 — Real GPS Verify
- Compare device geolocation to `property.lat` / `property.lng` within ~100m
- Replace the property-header Verify toggle with a real presence check
