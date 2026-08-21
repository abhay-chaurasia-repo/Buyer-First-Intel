# Stripe billing setup

## A. Stripe Dashboard
1. Create account at https://dashboard.stripe.com
2. Start in **Test mode**
3. **Product catalog** → Add product
   - Name: `Due Diligence Unlimited Searches`
   - Pricing: **Recurring** · **$4.99** · **Monthly**
4. Copy the **Price ID** (`price_...`)

## B. Supabase SQL
Run `migrations/002_stripe_subscription_fields.sql` in **SQL Editor**.

## C. Deploy Edge Functions
Install CLI: https://supabase.com/docs/guides/cli

```bash
cd bfi-app
npx supabase login
npx supabase link --project-ref ajphceimzoibdnitvlod
npx supabase functions deploy create-checkout
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` is required for the Stripe webhook (Stripe cannot send a Supabase user JWT).

## D. Set function secrets
```bash
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRICE_ID=price_... \
  SITE_URL=http://localhost:5173
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are usually provided automatically to Edge Functions.

## E. Stripe webhook
1. Stripe → **Developers → Webhooks → Add endpoint**
2. Endpoint URL:
   `https://ajphceimzoibdnitvlod.supabase.co/functions/v1/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy **Signing secret** (`whsec_...`)
5. Set secret:
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## F. Test
1. Phone-login in the app
2. Use 10 free searches (or temporarily lower free cap for testing)
3. Tap **Subscribe · $4.99/mo**
4. Pay with Stripe test card `4242 4242 4242 4242`
5. Land on `/billing/success`
6. `profiles.subscription_active` becomes `true`

## Branding Stripe Checkout (optional)
Stripe Hosted Checkout is Stripe’s page (not your React UI).
To make it closer to Due Diligence:
1. Stripe Dashboard → **Settings → Branding**
2. Upload logo, set brand color closer to saffron/orange
3. Set public business name to **Due Diligence**

Embedded/in-app checkout can come later; Hosted Checkout is the reliable first path.
