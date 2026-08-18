import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { SEARCH_PLAN } from '@/data/authPolicy'
import { fetchSearchQuotaSnapshot } from '@/lib/searchQuotaApi'
import { confirmStripeCheckout, PENDING_CHECKOUT_SESSION_KEY } from '@/lib/stripeCheckout'

export function BillingSuccessScreen() {
  const { ownerId, authReady, isSignedIn } = useAuth()
  const [params] = useSearchParams()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [status, setStatus] = useState('Confirming your subscription…')

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (sessionId) {
      try {
        sessionStorage.setItem(PENDING_CHECKOUT_SESSION_KEY, sessionId)
      } catch {
        // ignore
      }
    }
  }, [params])

  useEffect(() => {
    if (!authReady || !isSignedIn) return

    let cancelled = false
    let tries = 0

    const run = async () => {
      const sessionId = params.get('session_id')
      setStatus('Activating unlimited searches…')
      const confirmed = await confirmStripeCheckout(sessionId)
      if (cancelled) return

      if (!confirmed.ok) {
        setStatus(confirmed.error)
      }

      const snap = await fetchSearchQuotaSnapshot(ownerId)
      if (cancelled) return
      setSubscribed(snap.subscribed)

      if (!snap.subscribed && tries < 6) {
        tries += 1
        window.setTimeout(() => {
          void run()
        }, 1600)
      } else if (snap.subscribed) {
        setStatus('You’re subscribed')
      } else {
        setStatus('Payment received — subscription still syncing. Open Search again in a moment.')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [authReady, isSignedIn, ownerId, params])

  return (
    <AppShell scene="search" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-saffron/20">
          <Check className="h-7 w-7 text-saffron-glow" strokeWidth={2.5} />
        </span>
        <h1 className="mt-4 font-display text-[1.6rem] font-bold tracking-tight text-night-ink">
          {subscribed ? 'You’re subscribed' : 'Payment received'}
        </h1>
        <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-night-muted">
          {subscribed
            ? `Unlimited searches are on for ${SEARCH_PLAN.priceLabel}. Keep digging until you find the right home.`
            : status}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-saffron px-5 text-sm font-semibold text-white touch-manipulation"
          data-testid="button-billing-success-home"
        >
          Back to search
        </Link>
      </div>
    </AppShell>
  )
}

export function BillingCancelScreen() {
  return (
    <AppShell scene="search" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <h1 className="font-display text-[1.6rem] font-bold tracking-tight text-night-ink">Checkout canceled</h1>
        <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-night-muted">
          No charge was made. You can keep using your free searches or subscribe anytime.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-saffron px-5 text-sm font-semibold text-white touch-manipulation"
          data-testid="button-billing-cancel-home"
        >
          Back to search
        </Link>
      </div>
    </AppShell>
  )
}
