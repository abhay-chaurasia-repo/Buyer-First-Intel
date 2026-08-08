import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
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
      scene="search"
      sceneIntensity="soft"
      contentClassName="relative min-h-0 overflow-y-auto overscroll-contain text-night-ink"
    >
      <div className="relative flex flex-1 flex-col px-5 pb-4 pt-6">
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
          <div className="animate-bfi-rise w-full text-center">
            <p className="font-display text-[2.2rem] leading-none font-extrabold tracking-tight text-night-ink">
              <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
                BFI
              </span>
            </p>
            <h1 className="mt-2 font-display text-[1.15rem] font-semibold tracking-tight text-saffron-glow">
              Due Diligence
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[0.9rem] leading-relaxed text-white/80">
              Paste a property address. Verify public-record truth before you commit — and before you
              talk to an agent.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="animate-bfi-rise mt-7 w-full"
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
            className="animate-bfi-rise mt-8 w-full space-y-3"
            style={{ animationDelay: '200ms' }}
            aria-label="How due diligence works"
            data-testid="home-diligence-section"
          >
            <div className="rounded-2xl border border-white/25 bg-coastal/90 p-4 shadow-[0_16px_40px_rgb(42_31_32/0.35)] backdrop-blur-md">
              <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                Start here
              </p>
              <ul className="mt-3 space-y-3">
                <li className="flex gap-3">
                  <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                  <p className="text-[13px] leading-relaxed text-night-muted">
                    <span className="font-semibold text-night-ink">Search an address</span> to compare
                    county living area, tax and sales history, schools, and community labels.
                  </p>
                </li>
                <li className="flex gap-3">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                  <p className="text-[13px] leading-relaxed text-night-muted">
                    <span className="font-semibold text-night-ink">Star homes</span> into Watchlist for
                    visit planning and private notes.
                  </p>
                </li>
                <li className="flex gap-3">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
                  <p className="text-[13px] leading-relaxed text-night-muted">
                    <span className="font-semibold text-night-ink">Follow Journey</span> from Prepare →
                    Diligence → Offer so you stay on your path.
                  </p>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1">
              <Link
                to="/watchlist"
                className="inline-flex min-h-10 items-center text-[13px] font-semibold text-saffron-glow underline-offset-2 hover:underline touch-manipulation"
                data-testid="link-home-watchlist"
              >
                Open Watchlist
              </Link>
              <Link
                to="/journey"
                className="inline-flex min-h-10 items-center text-[13px] font-semibold text-saffron-glow underline-offset-2 hover:underline touch-manipulation"
                data-testid="link-home-journey"
              >
                Open Journey
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
