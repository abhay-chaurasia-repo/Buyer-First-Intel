import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { fetchSearchQuotaSnapshot } from '@/lib/searchQuotaApi'
import { SEARCH_PLAN } from '@/data/authPolicy'

export function BillingSuccessScreen() {
  const { ownerId } = useAuth()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    let tries = 0

    const poll = async () => {
      const snap = await fetchSearchQuotaSnapshot(ownerId)
      if (cancelled) return
      setSubscribed(snap.subscribed)
      if (!snap.subscribed && tries < 8) {
        tries += 1
        window.setTimeout(() => {
          void poll()
        }, 1500)
      }
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [ownerId])

  return (
    <AppShell scene="search" sceneIntensity="soft" contentClassName="min-h-0 text-night-ink">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-saffron/20">
          <Check className="h-7 w-7 text-saffron-glow" strokeWidth={2.5} />
        </span>
        <h1 className="mt-4 font-display text-[1.6rem] font-bold tracking-tight">
          {subscribed ? 'You’re subscribed' : 'Payment received'}
        </h1>
        <p className="mt-2 max-w-[18rem] text-[0.95rem] leading-relaxed text-night-muted">
          {subscribed
            ? `Unlimited searches are on for ${SEARCH_PLAN.priceLabel}. Keep digging until you find the right home.`
            : 'Confirming your subscription with Stripe — this usually takes a few seconds.'}
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
    <AppShell scene="search" sceneIntensity="soft" contentClassName="min-h-0 text-night-ink">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <h1 className="font-display text-[1.6rem] font-bold tracking-tight">Checkout canceled</h1>
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
