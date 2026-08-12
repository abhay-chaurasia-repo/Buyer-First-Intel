import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  LogOut,
  Search,
  Star,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { AppShell } from '@/components/layout/AppShell'
import { SearchPaywall, SearchQuotaBar } from '@/components/SearchQuotaPanel'
import { authMethodLabel } from '@/data/authSession'
import { APP_NAME } from '@/data/brand'
import {
  activateRemoteSearchSubscription,
  consumeSearch,
  ensureRemoteProfile,
  fetchSearchQuotaSnapshot,
} from '@/lib/searchQuotaApi'
import { confirmStripeCheckout, isStripeCheckoutEnabled, startStripeCheckout } from '@/lib/stripeCheckout'
import type { SearchQuotaSnapshot } from '@/data/searchQuota'
import { cn } from '@/lib/utils'

export function HomeScreen() {
  const navigate = useNavigate()
  const { session, isSignedIn, signOut, ownerId } = useAuth()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [snapshot, setSnapshot] = useState<SearchQuotaSnapshot | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [quotaBusy, setQuotaBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const paywallRef = useRef<HTMLDivElement>(null)

  async function refreshQuota() {
    const next = await fetchSearchQuotaSnapshot(ownerId)
    setSnapshot(next)
    setShowPaywall(!next.subscribed && next.remaining === 0)
  }

  useEffect(() => {
    if (!showPaywall) return
    const node = paywallRef.current
    if (!node) return
    // Bring paywall into the scroll area above the bottom nav (do not cover it).
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [showPaywall])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await ensureRemoteProfile()
      // If user already paid but webhook missed, sync from Stripe customer
      await confirmStripeCheckout(null)
      if (cancelled) return
      const next = await fetchSearchQuotaSnapshot(ownerId)
      if (cancelled) return
      setSnapshot(next)
      setShowPaywall(!next.subscribed && next.remaining === 0)
    })()
    return () => {
      cancelled = true
    }
  }, [ownerId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = query.trim()
    if (!address || quotaBusy) return

    setQuotaBusy(true)
    const access = await consumeSearch(address, ownerId)
    await refreshQuota()
    setQuotaBusy(false)

    if (!access.ok) {
      setShowPaywall(true)
      return
    }

    navigate(`/property/${encodeURIComponent(address)}`)
  }

  async function handleSubscribe() {
    setBillingError(null)
    setQuotaBusy(true)

    if (isStripeCheckoutEnabled(ownerId)) {
      const result = await startStripeCheckout()
      setQuotaBusy(false)
      if (!result.ok) {
        setBillingError(result.error)
        return
      }
      try {
        // Stash that checkout started; success page also stores session_id from Stripe return URL
        sessionStorage.setItem('bfi.checkoutStartedAt', String(Date.now()))
      } catch {
        // ignore
      }
      window.location.assign(result.url)
      return
    }

    // Local / demo path when Stripe Edge Function is not configured yet
    await activateRemoteSearchSubscription(ownerId)
    await refreshQuota()
    setQuotaBusy(false)
    setShowPaywall(false)
  }

  return (
    <AppShell
      scene="search"
      sceneIntensity="medium"
      contentClassName="relative min-h-0 overflow-y-auto overscroll-contain scroll-pt-4 text-night-ink"
    >
      <div
        className={cn(
          'relative flex flex-1 flex-col px-5 pt-[max(0.5rem,calc(var(--bfi-status-pad)+0.35rem))]',
          // Extra scroll room so the subscribe box clears the fixed bottom nav
          showPaywall ? 'pb-10' : 'pb-4',
        )}
      >
        <header className="animate-bfi-fade flex items-center justify-between gap-3">
          <BrandLogo size={36} />
          {isSignedIn && session ? (
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 text-right" data-testid="home-auth-session">
                <p className="truncate text-[11px] font-semibold text-saffron-glow">
                  {session.displayName}
                </p>
                <p className="truncate text-[10px] text-night-faint">
                  via {authMethodLabel(session.method)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => navigate('/login'))
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 text-night-muted transition-colors hover:border-saffron/40 hover:text-saffron-glow touch-manipulation"
                aria-label="Sign out"
                data-testid="button-home-sign-out"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="shrink-0 rounded-full border border-saffron/40 bg-saffron/20 px-3 py-1 text-xs font-medium text-saffron-glow touch-manipulation"
              data-testid="button-home-log-in"
            >
              Log in
            </button>
          )}
        </header>

        <div className="flex flex-1 flex-col items-center py-5">
          <div className="animate-bfi-rise w-full text-center">
            <h1 className="font-display text-[1.85rem] leading-none font-extrabold tracking-tight">
              <span className="bg-gradient-to-br from-saffron-glow via-saffron-bright to-saffron bg-clip-text text-transparent">
                {APP_NAME}
              </span>
            </h1>
            <p className="mx-auto mt-10 max-w-[20rem] text-[0.9rem] leading-relaxed text-night-muted">
              Paste a property address. Verify public-record truth before you commit — and before you
              talk to an agent.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="animate-bfi-rise mt-6 w-full"
            style={{ animationDelay: '80ms' }}
          >
            <label htmlFor={inputId} className="sr-only">
              Property address
            </label>
            <div
              className={cn(
                'flex items-center gap-2 rounded-[1.25rem] border bg-transparent px-3 py-2 transition-[border-color,box-shadow]',
                isFocused
                  ? 'border-saffron ring-4 ring-saffron/25'
                  : 'border-white/25 hover:border-saffron/50',
              )}
            >
              <Search className="ml-1 h-5 w-5 shrink-0 text-saffron-glow" aria-hidden />
              <input
                id={inputId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Paste property address"
                autoComplete="street-address"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent py-3 text-[1.05rem] text-night-ink outline-none placeholder:text-night-faint"
                data-testid="input-address-search"
              />
              <button
                type="submit"
                disabled={!query.trim() || quotaBusy}
                className={cn(
                  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl transition-colors touch-manipulation',
                  query.trim()
                    ? 'bg-saffron text-white hover:bg-saffron-deep shadow-[0_6px_14px_rgb(232_145_58/0.35)]'
                    : 'bg-transparent text-night-faint',
                )}
                aria-label="Search address"
                data-testid="button-address-search"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>

          <div
            ref={paywallRef}
            className="animate-bfi-rise mt-3 w-full scroll-mt-3"
            style={{ animationDelay: '110ms' }}
          >
            {snapshot ? <SearchQuotaBar snapshot={snapshot} /> : (
              <p className="text-center text-[12px] text-night-faint">Loading search plan…</p>
            )}
            {snapshot && showPaywall ? (
              <SearchPaywall
                snapshot={snapshot}
                onSubscribe={() => void handleSubscribe()}
                busy={quotaBusy}
                error={billingError}
              />
            ) : null}
          </div>

          <p
            className="animate-bfi-rise mt-5 text-center text-sm text-night-faint"
            style={{ animationDelay: '140ms' }}
          >
            No MLS. No prices. County records first.
          </p>

          <section
            className="animate-bfi-rise mt-7 w-full"
            style={{ animationDelay: '200ms' }}
            aria-label="How due diligence works"
            data-testid="home-diligence-section"
          >
            <div className="rounded-[1.25rem] border border-white/25 bg-transparent p-4">
              <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                Start here
              </p>
              <ul className="mt-3 space-y-3.5">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-saffron/20">
                    <FileSearch className="h-4 w-4 text-saffron-glow" aria-hidden />
                  </span>
                  <p className="text-[13px] leading-relaxed text-night-muted">
                    <span className="font-semibold text-night-ink">Search an address</span> to compare
                    county living area, tax and sales history, schools, and community labels.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-saffron/20">
                    <Star className="h-4 w-4 text-saffron-glow" aria-hidden />
                  </span>
                  <p className="text-[13px] leading-relaxed text-night-muted">
                    <span className="font-semibold text-night-ink">Star homes into Homes in Diligence</span>{' '}
                    for visit planning and private notes.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-saffron/20">
                    <ClipboardCheck className="h-4 w-4 text-saffron-glow" aria-hidden />
                  </span>
                  <p className="text-[13px] leading-relaxed text-night-muted">
                    <span className="font-semibold text-night-ink">Follow your path</span> from Prepare →
                    Diligence → Offer → Close.
                  </p>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
