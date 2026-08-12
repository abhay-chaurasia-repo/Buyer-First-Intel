# Supabase setup

## Profiles + search quota
1. SQL Editor → run `migrations/001_profiles_search_quota.sql`
2. Confirm tables: `profiles`, `search_usage`

## Stripe subscription
1. SQL Editor → run `migrations/002_stripe_subscription_fields.sql`
2. Follow **`STRIPE_SETUP.md`** (Stripe product, Edge Functions, webhook secrets)

## App behavior
- Phone login → quota/subscription in Supabase
- Subscribe button → Stripe Checkout (when functions + secrets are deployed)
- Quick / Apple / Facebook still local until those IdPs are wired
