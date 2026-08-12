import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, MapPin, Search } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { AppShell } from '@/components/layout/AppShell'
import { SearchHistoryPanel } from '@/components/SearchHistoryPanel'
import { SearchPaywall, SearchQuotaBar } from '@/components/SearchQuotaPanel'
import type { ResolvedAddress } from '@/data/addressTypes'
import { authMethodLabel } from '@/data/authSession'
import { APP_NAME } from '@/data/brand'
import type { HistoryAddress } from '@/data/mockProperty'
import { historyFullAddress, loadSearchHistory } from '@/data/searchHistory'
import { isHouseNumberOnlyQuery } from '@/lib/addressSearch'
import { suggestAddresses, rememberSelectedAddress } from '@/lib/propertyLookup'
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
  const [suggestions, setSuggestions] = useState<ResolvedAddress[]>([])
  const [suggestBusy, setSuggestBusy] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryAddress[]>([])
  const paywallRef = useRef<HTMLDivElement>(null)
  const suggestSeq = useRef(0)
  const suggesting = showSuggestions && query.trim().length > 0
  const houseOnly = isHouseNumberOnlyQuery(query)

  async function refreshQuota() {
    const next = await fetchSearchQuotaSnapshot(ownerId)
    setSnapshot(next)
    setShowPaywall(!next.subscribed && next.remaining === 0)
  }

  async function refreshHistory() {
    const items = await loadSearchHistory(ownerId)
    setHistoryItems(items)
  }

  useEffect(() => {
    if (!showPaywall) return
    const node = paywallRef.current
    if (!node) return
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [showPaywall])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await ensureRemoteProfile()
      await confirmStripeCheckout(null)
      if (cancelled) return
      const next = await fetchSearchQuotaSnapshot(ownerId)
      if (cancelled) return
      setSnapshot(next)
      setShowPaywall(!next.subscribed && next.remaining === 0)
      const items = await loadSearchHistory(ownerId)
      if (cancelled) return
      setHistoryItems(items)
    })()
    return () => {
      cancelled = true
    }
  }, [ownerId])

  useEffect(() => {
    const trimmed = query.trim()
    setSearchError(null)

    if (trimmed.length === 0) {
      setSuggestions([])
      setSuggestError(null)
      setSuggestBusy(false)
      setShowSuggestions(false)
      return
    }

    setShowSuggestions(true)

    const seq = ++suggestSeq.current
    setSuggestBusy(true)
    const timer = window.setTimeout(() => {
      void suggestAddresses(trimmed).then((result) => {
        if (seq !== suggestSeq.current) return
        setSuggestBusy(false)
        if (!result.ok) {
          setSuggestError(result.error)
          setSuggestions([])
          return
        }
        setSuggestError(null)
        setSuggestions(result.matches)
      })
    }, houseOnly ? 80 : 160)

    return () => window.clearTimeout(timer)
  }, [query, houseOnly])

  async function goToAddress(formatted: string, selected?: ResolvedAddress) {
    if (selected) rememberSelectedAddress(selected)
    setQuotaBusy(true)
    setSearchError(null)
    const access = await consumeSearch(formatted, ownerId)
    await refreshQuota()
    await refreshHistory()
    setQuotaBusy(false)

    if (!access.ok) {
      setShowPaywall(true)
      return
    }

    setShowSuggestions(false)
    navigate(`/property/${encodeURIComponent(formatted)}`)
  }

  async function handleHistorySelect(item: HistoryAddress) {
    const full = historyFullAddress(item)
    setQuery(full)
    await goToAddress(full)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = query.trim()
    if (!address || quotaBusy) return

    if (houseOnly) {
      setSearchError('Add the street name to match a US property (example: 3147 Swallow Dr).')
      setShowSuggestions(true)
      return
    }

    setQuotaBusy(true)
    setSearchError(null)
    const result = await suggestAddresses(address)
    if (!result.ok) {
      setQuotaBusy(false)
      setSearchError(result.error)
      return
    }

    const match = result.matches[0]
    if (!match) {
      setQuotaBusy(false)
      setSearchError(
        'No US address match found. Add a street name, city, and state (example: 3147 Swallow Dr, Marietta, GA).',
      )
      setShowSuggestions(true)
      return
    }

    setQuery(match.formatted)
    setSuggestions(result.matches)
    setQuotaBusy(false)
    await goToAddress(match.formatted, match)
  }

  async function handlePickSuggestion(match: ResolvedAddress) {
    setQuery(match.formatted)
    setShowSuggestions(false)
    await goToAddress(match.formatted, match)
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
        sessionStorage.setItem('bfi.checkoutStartedAt', String(Date.now()))
      } catch {
        // ignore
      }
      window.location.assign(result.url)
      return
    }

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

        <div className="flex flex-1 flex-col items-center py-3">
          <div className="animate-bfi-rise w-full text-center">
            <h1 className="font-display text-[1.85rem] leading-none font-extrabold tracking-tight">
              <span className="bg-gradient-to-br from-saffron-glow via-saffron-bright to-saffron bg-clip-text text-transparent">
                {APP_NAME}
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-[20rem] text-[0.88rem] leading-snug text-night-muted">
              Search a US property address. Match public records before you commit — and before you
              talk to an agent.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="animate-bfi-rise mt-4 w-full"
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
                onChange={(event) => {
                  setQuery(event.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => {
                  setIsFocused(true)
                  setShowSuggestions(true)
                }}
                onBlur={() => {
                  setIsFocused(false)
                  window.setTimeout(() => setShowSuggestions(false), 150)
                }}
                placeholder="Search property for diligence"
                autoComplete="off"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent py-3 text-[1.05rem] text-night-ink outline-none placeholder:text-night-faint"
                data-testid="input-address-search"
                aria-autocomplete="list"
                aria-controls="address-suggestions"
                aria-expanded={suggesting}
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

            {suggesting ? (
              <div
                id="address-suggestions"
                role="listbox"
                className="relative z-40 mt-2 max-h-[min(18rem,42vh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/25 bg-[#2a1f20] shadow-[0_16px_40px_rgb(0_0_0/0.55)]"
                data-testid="address-suggestions"
              >
                {suggestBusy ? (
                  <p className="px-3 py-3 text-[12px] text-night-faint">
                    Matching addresses for diligence…
                  </p>
                ) : null}
                {suggestError ? (
                  <p className="px-3 py-3 text-[12px] text-red-300">{suggestError}</p>
                ) : null}
                {!suggestBusy && !suggestError && suggestions.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-night-faint">
                    {houseOnly
                      ? 'Keep going — type the street (e.g. 3147 Swallow) and options appear.'
                      : query.trim().length < 3
                        ? 'Keep typing the street name — options appear as the address takes shape.'
                        : 'Still looking — try adding city and state for a stronger match.'}
                  </p>
                ) : null}
                {suggestions.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    role="option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handlePickSuggestion(match)}
                    className="flex w-full items-start gap-2 border-t border-white/10 bg-[#2a1f20] px-3 py-2.5 text-left first:border-t-0 hover:bg-[#3a2a2b] touch-manipulation"
                    data-testid={`address-suggestion-${match.id}`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-night-ink">
                        {match.street}
                      </span>
                      <span className="block text-[11px] text-night-faint">
                        {match.city}, {match.state} {match.zipCode}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>

          {searchError ? (
            <p
              className="mt-2 w-full text-center text-[12px] text-red-300"
              data-testid="address-search-error"
            >
              {searchError}
            </p>
          ) : null}

          {!suggesting ? (
            <div
              ref={paywallRef}
              className="animate-bfi-rise mt-2 w-full scroll-mt-3"
              style={{ animationDelay: '110ms' }}
            >
              {snapshot ? (
                <SearchQuotaBar snapshot={snapshot} />
              ) : (
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
          ) : null}

          {!suggesting ? (
            <div className="mt-3 flex w-full flex-col gap-3">
              <section
                className="animate-bfi-rise w-full"
                style={{ animationDelay: '130ms' }}
                aria-label="How due diligence works"
                data-testid="home-diligence-section"
              >
                <div className="rounded-2xl border border-white/25 bg-transparent px-3.5 py-2.5">
                  <p className="font-display text-[10px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                    Start here
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-night-muted">
                    <span className="font-semibold text-night-ink">Search</span>
                    {' · '}
                    <span className="font-semibold text-night-ink">star</span> for visits & notes
                    {' · '}
                    <span className="font-semibold text-night-ink">follow</span> Prepare → Diligence →
                    Offer → Close.
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-night-faint">
                    No MLS. No prices. County records first.
                  </p>
                </div>
              </section>

              <div className="animate-bfi-rise w-full" style={{ animationDelay: '150ms' }}>
                <SearchHistoryPanel
                  items={historyItems}
                  onSelect={(item) => void handleHistorySelect(item)}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}
