// Supabase Edge Function: Stripe webhook → update profiles.subscription_*
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!signature || !webhookSecret || !supabaseUrl || !serviceRole) {
    return new Response('Webhook not configured', { status: 500 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature'
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceRole)

  async function activateFromSubscription(subscription: Stripe.Subscription, userId?: string | null) {
    const uid =
      userId ||
      (typeof subscription.metadata?.supabase_user_id === 'string'
        ? subscription.metadata.supabase_user_id
        : null)

    if (!uid) return

    const active = ['active', 'trialing'].includes(subscription.status)
    await admin.rpc('set_subscription_from_stripe', {
      p_user_id: uid,
      p_customer_id: String(subscription.customer),
      p_subscription_id: subscription.id,
      p_status: subscription.status,
      p_active: active,
    })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId =
          session.client_reference_id ||
          (typeof session.metadata?.supabase_user_id === 'string'
            ? session.metadata.supabase_user_id
            : null)

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription))
          await activateFromSubscription(subscription, userId)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await activateFromSubscription(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const uid =
          typeof subscription.metadata?.supabase_user_id === 'string'
            ? subscription.metadata.supabase_user_id
            : null
        if (uid) {
          await admin.rpc('set_subscription_from_stripe', {
            p_user_id: uid,
            p_customer_id: String(subscription.customer),
            p_subscription_id: subscription.id,
            p_status: 'canceled',
            p_active: false,
          })
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Handler failed'
    return new Response(`Handler Error: ${message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
