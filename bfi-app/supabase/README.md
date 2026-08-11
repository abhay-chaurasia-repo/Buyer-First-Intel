# Supabase setup — profiles + search quota

## 1. Run the migration
1. Open Supabase → **SQL Editor** → New query
2. Paste contents of `supabase/migrations/001_profiles_search_quota.sql`
3. Click **Run**

## 2. Confirm tables
**Table Editor** should show:
- `profiles`
- `search_usage`

## 3. App behavior
- Phone-login users: quota + subscription flag live in Supabase
- Quick / Apple / Facebook local sessions: still use localStorage until those IdPs are real

## 4. Test
1. Sign in with phone OTP
2. Search addresses — count drops in UI
3. In Table Editor → `search_usage` rows appear for your user
4. After 10 unique addresses, Subscribe sets `profiles.subscription_active = true`
