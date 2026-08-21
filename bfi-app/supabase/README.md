# Supabase setup

## Profiles + search quota
1. SQL Editor → run `migrations/001_profiles_search_quota.sql`
2. Confirm tables: `profiles`, `search_usage`

## Diligence cloud sync
1. SQL Editor → run `migrations/004_diligence_homes_notes.sql`
2. Phone login → star homes / add notes → rows appear in `diligence_homes` and `property_notes`
3. Sign out / in on another browser → Homes in Diligence should restore

## Buyer Community (presence + votes)
1. SQL Editor → run `migrations/005_community_presence_votes.sql`
2. Phone login → Confirm on site → row in `presence_events`
3. County’s Fact Gross living area upvote (no Confirm needed) or on-site Plus/Watch (needs Confirm) → `community_votes`
4. Another signed-in buyer on a different phone increases the same label count
5. Presence Confirmed list shows anonymous dates — no names or phones

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
2. ATTOM county facts: set `ATTOM_API_KEY` in `.env.local` (dev) or Supabase secrets (prod) — see **`PROPERTY_DATA.md`**. Search calls **`property/basicprofile`**. Tax / Sales / Schools each call their own package when that tile opens.
3. SQL Editor → run `migrations/007_attom_lookup_cache.sql`, then redeploy `property-lookup`. Same address searched by another user within 24 hours reuses the cached snapshot (ATTOM terms max without a bulk license)
4. Schools CatchUp: assigned via `/property/detailwithschools`, nearby via `/school/search` — confirm with the district
5. Presence Confirmed is live (dated log is permanent; labeling window is 2 weeks; ~100m of pin — not a tour)
6. GreatSchools enrichment is deferred
