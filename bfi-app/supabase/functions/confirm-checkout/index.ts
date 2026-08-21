// Confirms a Checkout Session and activates the subscriber profile.
// Fallback when webhooks are delayed/misconfigured; also used after return from Stripe.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey || !supabaseUrl || !supabaseAnon || !serviceRole) {
      return new Response(JSON.stringify({ error: 'Billing not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body.session_id === 'string' ? body.session_id : null

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })
    const admin = createClient(supabaseUrl, serviceRole)

    let activated = false
    let status: string | null = null

    if (sessionId) {
      const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      })
      const refUser =
        checkout.client_reference_id ||
        (typeof checkout.metadata?.supabase_user_id === 'string'
          ? checkout.metadata.supabase_user_id
          : null)

      if (refUser && refUser !== user.id) {
        return new Response(JSON.stringify({ error: 'Checkout does not belong to this user' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (checkout.status === 'complete' && checkout.subscription) {
        const subscription =
          typeof checkout.subscription === 'string'
            ? await stripe.subscriptions.retrieve(checkout.subscription)
            : checkout.subscription
        const active = ['active', 'trialing'].includes(subscription.status)
        await admin.rpc('set_subscription_from_stripe', {
          p_user_id: user.id,
          p_customer_id: String(subscription.customer),
          p_subscription_id: subscription.id,
          p_status: subscription.status,
          p_active: active,
        })
        activated = active
        status = subscription.status
      }
    }

    // Also sync from existing Stripe customer on the profile (covers lost session_id)
    if (!activated) {
      const { data: profile } = await admin
        .from('profiles')
        .select('stripe_customer_id, subscription_active')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.subscription_active) {
        activated = true
        status = 'active'
      } else if (profile?.stripe_customer_id) {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'all',
          limit: 5,
        })
        const live = subs.data.find((sub) => ['active', 'trialing'].includes(sub.status))
        if (live) {
          await admin.rpc('set_subscription_from_stripe', {
            p_user_id: user.id,
            p_customer_id: String(live.customer),
            p_subscription_id: live.id,
            p_status: live.status,
            p_active: true,
          })
          activated = true
          status = live.status
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, activated, status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Confirm failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
