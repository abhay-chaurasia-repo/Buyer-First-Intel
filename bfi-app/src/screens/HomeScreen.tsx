import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
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
    <AppShell contentClassName="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bfi-grid-wash opacity-80" aria-hidden />

      <div className="relative flex flex-1 flex-col px-5 pb-6 pt-10 sm:px-8">
        <header className="animate-bfi-fade flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.35)]">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <span className="font-display text-sm font-semibold tracking-[0.14em] text-ink-muted uppercase">
              BFI
            </span>
          </div>
          <span className="rounded-full border border-saffron/25 bg-saffron-soft/90 px-3 py-1 text-xs font-medium text-saffron-deep">
            Buyer-only
          </span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <div className="animate-bfi-rise w-full max-w-md text-center">
            <p className="font-display text-[2.65rem] leading-none font-extrabold tracking-tight text-ink sm:text-5xl">
              <span className="bg-gradient-to-br from-saffron-deep via-saffron to-saffron-bright bg-clip-text text-transparent">
                BFI
              </span>
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
              Due Diligence
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[0.95rem] leading-relaxed text-ink-muted">
              Paste a property address. Verify public-record truth before you commit.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="animate-bfi-rise mt-10 w-full max-w-md"
            style={{ animationDelay: '80ms' }}
          >
            <label htmlFor={inputId} className="sr-only">
              Property address
            </label>
            <div
              className={cn(
                'flex items-center gap-2 rounded-2xl border bg-paper-elevated px-3 py-2 shadow-search transition-[border-color,box-shadow]',
                isFocused
                  ? 'border-saffron ring-4 ring-saffron-soft'
                  : 'border-line-strong hover:border-saffron/50',
              )}
            >
              <Search className="ml-1 h-5 w-5 shrink-0 text-saffron" aria-hidden />
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
                className="min-w-0 flex-1 bg-transparent py-3 text-[1.05rem] text-ink outline-none placeholder:text-ink-faint"
                data-testid="input-address-search"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className={cn(
                  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors touch-manipulation',
                  query.trim()
                    ? 'bg-saffron text-white hover:bg-saffron-deep shadow-[0_6px_14px_rgb(232_145_58/0.35)]'
                    : 'bg-line text-ink-faint',
                )}
                aria-label="Search address"
                data-testid="button-address-search"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>

          <p
            className="animate-bfi-rise mt-6 text-center text-sm text-ink-faint"
            style={{ animationDelay: '140ms' }}
          >
            No MLS. No prices. County records first.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
