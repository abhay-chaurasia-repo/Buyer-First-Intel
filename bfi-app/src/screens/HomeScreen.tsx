import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  Handshake,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { NAR_SETTLEMENT_URL, inAppBrowsePath } from '@/data/nrecGuidance'
import { cn } from '@/lib/utils'

export function HomeScreen() {
  const navigate = useNavigate()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = query.trim()
    if (!address) return
    navigate(`/property/${encodeURIComponent(address)}`)
  }

  return (
    <AppShell
      className="bfi-ink-wash"
      contentClassName="relative min-h-0 overflow-y-auto overscroll-contain bfi-ink-wash text-night-ink"
    >
      <div className="pointer-events-none absolute inset-0 bfi-grid-wash opacity-70" aria-hidden />

      <div className="relative flex flex-1 flex-col px-5 pb-4 pt-6 sm:px-6">
        <header className="animate-bfi-fade flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.35)]">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <span className="font-display text-sm font-semibold tracking-[0.14em] text-night-muted uppercase">
              BFI
            </span>
          </div>
          <span className="rounded-full border border-saffron/40 bg-saffron/20 px-3 py-1 text-xs font-medium text-saffron-glow">
            Buyer-only
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center py-6">
          <div className="animate-bfi-rise w-full max-w-md text-center">
            <p className="font-display text-[2.2rem] leading-none font-extrabold tracking-tight text-night-ink sm:text-5xl">
              <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
                BFI
              </span>
            </p>
            <h1 className="mt-2 font-display text-[1.15rem] font-semibold tracking-tight text-saffron-glow sm:text-xl">
              Due Diligence
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[0.9rem] leading-relaxed text-white/80">
              Paste a property address. Verify public-record truth before you commit — and before you
              talk to an agent.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="animate-bfi-rise mt-7 w-full max-w-md"
            style={{ animationDelay: '80ms' }}
          >
            <label htmlFor={inputId} className="sr-only">
              Property address
            </label>
            <div
              className={cn(
                'flex items-center gap-2 rounded-2xl border bg-coastal/90 px-3 py-2 shadow-search backdrop-blur-md transition-[border-color,box-shadow]',
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
                disabled={!query.trim()}
                className={cn(
                  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors touch-manipulation',
                  query.trim()
                    ? 'bg-saffron text-white hover:bg-saffron-deep shadow-[0_6px_14px_rgb(232_145_58/0.35)]'
                    : 'bg-coastal-deep/70 text-night-faint',
                )}
                aria-label="Search address"
                data-testid="button-address-search"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>

          <p
            className="animate-bfi-rise mt-6 text-center text-sm text-night-faint"
            style={{ animationDelay: '140ms' }}
          >
            No MLS. No prices. County records first.
          </p>

          <section
            className="animate-bfi-rise mt-8 w-full max-w-md space-y-4 text-left"
            style={{ animationDelay: '200ms' }}
            aria-label="Commission settlement guidance for buyers"
            data-testid="home-settlement-section"
          >
            <div className="flex items-center gap-2 px-0.5">
              <Scale className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
              <p className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
                Broker commission settlements
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/25 bg-coastal/90 p-4 shadow-[0_16px_40px_rgb(42_31_32/0.35)] backdrop-blur-md">
              <p className="text-[13px] font-semibold leading-snug text-night-ink">
                Know the rules before you hire an agent or write an offer
              </p>
              <p className="text-[13px] leading-relaxed text-night-muted">
                Lawsuits alleged anticompetitive commission practices that inflated what sellers
                paid. Settlements with NAR, HomeServices, and other defendants are valued at over $1
                billion in public materials. Court approval came November 27, 2024 — appeals can delay
                final benefits. For buyers, the lasting shift is how compensation is disclosed and
                negotiated.
              </p>
              <ul className="space-y-2 text-[13px] leading-relaxed text-night-muted">
                <li>
                  <span className="font-semibold text-night-ink">MLS:</span> offers of buyer-broker
                  compensation are no longer allowed on the MLS.
                </li>
                <li>
                  <span className="font-semibold text-night-ink">Before touring:</span> expect a
                  written buyer agreement with clear, negotiable pay terms — not open-ended.
                </li>
                <li>
                  <span className="font-semibold text-night-ink">Your leverage:</span> commissions are
                  not set by law. Diligence the house first, then decide what help you want to buy.
                </li>
              </ul>
              <Link
                to={inAppBrowsePath(NAR_SETTLEMENT_URL)}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-saffron-glow underline-offset-2 hover:underline touch-manipulation"
                data-testid="link-nar-settlement-site"
              >
                Open official settlement site in app
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <ul className="space-y-3">
              <li className="flex gap-3 px-0.5">
                <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                <p className="text-[13px] leading-relaxed text-night-muted">
                  <span className="font-semibold text-night-ink">Before any offer:</span> compare
                  county living area to listing claims, tax and sales history, schools, and community
                  labels.
                </p>
              </li>
              <li className="flex gap-3 px-0.5">
                <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                <p className="text-[13px] leading-relaxed text-night-muted">
                  <span className="font-semibold text-night-ink">Before an agent:</span> know what you
                  will pay for representation. Sign only objective compensation — flat fee, percent,
                  or hourly.
                </p>
              </li>
              <li className="flex gap-3 px-0.5">
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                <p className="text-[13px] leading-relaxed text-night-muted">
                  <span className="font-semibold text-night-ink">Stay on your path:</span> star
                  Watchlist homes and track Prepare → Diligence → Offer in Journey.
                </p>
              </li>
            </ul>

            <div className="flex flex-wrap gap-x-4 gap-y-2 px-0.5 pt-1">
              <Link
                to="/guidance/buyer-commission-brief"
                className="inline-flex min-h-10 items-center text-[13px] font-semibold text-saffron-glow underline-offset-2 hover:underline touch-manipulation"
                data-testid="link-buyer-commission-brief"
              >
                Buyer settlement brief
              </Link>
              <Link
                to="/guidance/before-you-talk-to-an-agent"
                className="inline-flex min-h-10 items-center text-[13px] font-semibold text-saffron-glow underline-offset-2 hover:underline touch-manipulation"
                data-testid="link-before-agent"
              >
                Before you talk to an agent
              </Link>
              <Link
                to="/journey"
                className="inline-flex min-h-10 items-center text-[13px] font-semibold text-saffron-glow underline-offset-2 hover:underline touch-manipulation"
                data-testid="link-home-journey"
              >
                Journey checklist
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
