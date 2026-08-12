import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { isSupabaseOwnerId } from '@/lib/searchQuotaApi'

export function isStripeCheckoutEnabled(ownerId?: string) {
  return (
    isSupabaseConfigured() &&
    isSupabaseOwnerId(ownerId) &&
    import.meta.env.VITE_STRIPE_CHECKOUT_ENABLED !== 'false'
  )
}

/**
 * Asks the create-checkout Edge Function for a Stripe Checkout URL.
 */
export async function startStripeCheckout(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, error: 'Supabase is not configured.' }
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    method: 'POST',
    body: {},
  })

  if (error) {
    return { ok: false, error: error.message || 'Could not start checkout.' }
  }

  const url = (data as { url?: string; error?: string } | null)?.url
  const remoteError = (data as { error?: string } | null)?.error
  if (remoteError) {
    return { ok: false, error: remoteError }
  }
  if (!url) {
    return { ok: false, error: 'Checkout URL missing. Deploy create-checkout and set Stripe secrets.' }
  }

  return { ok: true, url }
}
