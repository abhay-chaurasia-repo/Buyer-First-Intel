import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  loadWatchlist,
  propertyPath,
  removeFromWatchlist,
  type WatchlistItem,
} from '@/data/watchlistStorage'

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function WatchlistScreen() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItem[]>(() => loadWatchlist())

  useEffect(() => {
    const refresh = () => setItems(loadWatchlist())
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  function handleRemove(id: string) {
    setItems(removeFromWatchlist(id))
  }

  return (
    <AppShell
      className="bfi-night-wash"
      contentClassName="min-h-0 bfi-night-wash text-night-ink"
    >
      <header
        className="sticky top-0 z-20 border-b border-night-line bg-coastal/90 backdrop-blur-md"
        data-testid="watchlist-top-bar"
      >
        <div className="px-4 py-3">
          <p className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
            Watchlist
          </p>
          <h1 className="mt-0.5 font-display text-[17px] font-semibold tracking-tight text-night-ink">
            Saved properties
          </h1>
          <p className="mt-1 text-[12px] text-night-faint">
            Star a property on its page and it lands here automatically.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 pb-4">
        {items.length === 0 ? (
          <div
            className="rounded-2xl border border-night-line bg-coastal-deep/55 p-5 text-center shadow-sm backdrop-blur-sm"
            data-testid="watchlist-empty"
          >
            <Star className="mx-auto h-8 w-8 text-saffron-glow" strokeWidth={1.75} />
            <p className="mt-3 text-sm font-semibold text-night-ink">No saved properties yet</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-night-muted">
              Open an address from Search, then tap the star in the top bar to save it.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-saffron px-4 text-sm font-semibold text-white touch-manipulation"
              data-testid="button-watchlist-go-search"
            >
              Go to Search
            </button>
          </div>
        ) : (
          <section className="space-y-2" data-testid="watchlist-list">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
                Starred
              </span>
              <span className="rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
                {items.length}
              </span>
            </div>

            <ul className="space-y-2 rounded-2xl border border-night-line bg-coastal-deep/55 p-2 shadow-sm backdrop-blur-sm">
              {items.map((item) => (
                <li key={item.id} data-testid={`watchlist-item-${item.id}`}>
                  <div className="flex items-stretch gap-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => navigate(propertyPath(item))}
                      className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-night-ink/10 touch-manipulation"
                    >
                      <p className="truncate text-sm font-semibold text-night-ink">{item.address}</p>
                      <p className="mt-0.5 truncate text-[12px] text-night-muted">
                        {item.city}, {item.state} {item.zipCode}
                      </p>
                      <p className="mt-1 text-[11px] text-night-faint">
                        {item.bedrooms} bed · {item.bathrooms} bath ·{' '}
                        {item.sqft.toLocaleString()} sqft
                        <span className="text-night-faint"> · Saved {formatSavedAt(item.starredAt)}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-night-faint transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
                      aria-label={`Remove ${item.address} from watchlist`}
                      data-testid={`button-remove-watchlist-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  )
}
