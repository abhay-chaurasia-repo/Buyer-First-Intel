# Supabase setup

## Profiles + search quota
1. SQL Editor → run `migrations/001_profiles_search_quota.sql`
2. Confirm tables: `profiles`, `search_usage`

## Diligence cloud sync
1. SQL Editor → run `migrations/004_diligence_homes_notes.sql`
2. Phone login → star homes / add notes → rows appear in `diligence_homes` and `property_notes`
3. Sign out / in on another browser → Homes in Diligence should restore

## Stripe subscription
1. SQL Editor → run `migrations/002_stripe_subscription_fields.sql`
2. Follow **`STRIPE_SETUP.md`** (Stripe product, Edge Functions, webhook secrets)
3. Branding: Stripe → **Settings → Branding** (logo, saffron color, name Due Diligence)

## App behavior
- Phone login → quota/subscription in Supabase
- Subscribe button → Stripe Checkout (when functions + secrets are deployed)
- Quick / Apple / Facebook still local until those IdPs are wired

## Property data (address → ATTOM → schools → GPS)
1. Address search is live (Census + optional `/api/property-lookup` / Edge Function)
2. ATTOM county facts: set `ATTOM_API_KEY` in `.env.local` (dev) or Supabase secrets (prod) — see **`PROPERTY_DATA.md`**
3. Schools CatchUp: assigned via `/property/detailwithschools`, nearby via `/school/search` — confirm with the district
4. Real GPS Verify v1 is live (device location vs property pin, 100m / 2 weeks)
5. GreatSchools enrichment is deferred
