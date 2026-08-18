import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  MapPin,
  Search,
  Star,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { AppShell } from '@/components/layout/AppShell'
import { SearchPaywall, SearchQuotaBar } from '@/components/SearchQuotaPanel'
import type { ResolvedAddress } from '@/data/addressTypes'
import { APP_NAME } from '@/data/brand'
import { isHouseNumberOnlyQuery } from '@/lib/addressSearch'
import { parseTypedUsAddress } from '@/lib/expandAddressQuery'
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
  const { isSignedIn, signOut, ownerId } = useAuth()
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
  const [googleHint, setGoogleHint] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const paywallRef = useRef<HTMLDivElement>(null)
  const suggestSeq = useRef(0)
  const suggesting = showSuggestions && query.trim().length > 0
  const houseOnly = isHouseNumberOnlyQuery(query)
  const typed = parseTypedUsAddress(query)
  const typedMatch = typed
    ? {
        id: `typed-${typed.formatted.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        formatted: typed.formatted,
        street: typed.street,
        city: typed.city,
        state: typed.state,
        zipCode: typed.zipCode,
        lat: 0,
        lng: 0,
        source: 'typed' as const,
      }
    : null
  const visibleSuggestions =
    typedMatch && !suggestions.some((match) => match.formatted === typedMatch.formatted)
      ? [typedMatch, ...suggestions]
      : suggestions

  async function refreshQuota() {
    const next = await fetchSearchQuotaSnapshot(ownerId)
    setSnapshot(next)
    setShowPaywall(!next.subscribed && next.remaining === 0)
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
      setGoogleHint(null)
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
          setGoogleHint(null)
          setSuggestions([])
          return
        }
        setSuggestError(null)
        setGoogleHint(result.googleHint ?? null)
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
    setQuotaBusy(false)

    if (!access.ok) {
      setShowPaywall(true)
      return
    }

    setShowSuggestions(false)
    navigate(`/property/${encodeURIComponent(formatted)}`)
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
        result.googleHint ||
          'No US address match found. Add city and state, and spell out the street (example: 2212 Fern Park Dr, Chamblee, GA).',
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
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate('/login'))
              }}
              className="shrink-0 rounded-full border border-saffron/40 bg-saffron/20 px-3 py-1 text-xs font-medium text-saffron-glow touch-manipulation"
              data-testid="button-home-sign-out"
            >
              Log out
            </button>
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
            <h1 className="font-display text-[1.85rem] leading-none font-extrabold tracking-tight text-night-ink">
              {APP_NAME}
            </h1>
            <p className="mx-auto mt-10 max-w-[20rem] text-[0.9rem] leading-relaxed text-night-muted">
              Search a US property address. Match public records before you commit — and before you
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
                {!suggestBusy && !suggestError && googleHint ? (
                  <p className="px-3 py-3 text-[12px] text-saffron-glow">{googleHint}</p>
                ) : null}
                {!suggestBusy && !suggestError && !googleHint && visibleSuggestions.length === 0 ? (
                  <p className="px-3 py-3 text-[12px] text-night-faint">
                    {houseOnly
                      ? 'Keep going — type the street (e.g. 3147 Swallow) and options appear.'
                      : query.trim().length < 3
                        ? 'Keep typing the street name — options appear as the address takes shape.'
                        : 'No match yet. Add the state (e.g. GA) and spell out the street (Park, not Pk).'}
                  </p>
                ) : null}
                {visibleSuggestions.map((match) => (
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
                        {match.source === 'typed' ? ' · open this address' : ''}
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
              className="animate-bfi-rise mt-3 w-full scroll-mt-3"
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
            <>
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
                        <span className="font-semibold text-night-ink">Search an address</span> to
                        compare county living area, tax and sales history, schools, and community
                        labels.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-saffron/20">
                        <Star className="h-4 w-4 text-saffron-glow" aria-hidden />
                      </span>
                      <p className="text-[13px] leading-relaxed text-night-muted">
                        <span className="font-semibold text-night-ink">
                          Star homes into Homes in Diligence
                        </span>{' '}
                        for visit planning and private notes.
                      </p>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-saffron/20">
                        <ClipboardCheck className="h-4 w-4 text-saffron-glow" aria-hidden />
                      </span>
                      <p className="text-[13px] leading-relaxed text-night-muted">
                        <span className="font-semibold text-night-ink">Follow your path</span> from
                        Prepare → Diligence → Offer → Close.
                      </p>
                    </li>
                  </ul>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}
