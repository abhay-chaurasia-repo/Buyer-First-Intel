import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  Crosshair,
  FileText,
  History,
  Receipt,
  School,
  ShieldCheck,
  StickyNote,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CatchUpFlow, type CatchUpSurface } from '@/components/catchup/CatchUpFlow'
import { fetchSurfaceApi } from '@/data/catchUpApi'
import {
  DEMO_PROPERTY,
  SEARCH_HISTORY,
  getMetricCards,
  resolvePropertyFromQuery,
  type HistoryAddress,
  type MetricCard,
} from '@/data/mockProperty'
import { notesCount } from '@/data/propertyNotesStorage'
import { isOnWatchlist, toggleWatchlist } from '@/data/watchlistStorage'
import { cn } from '@/lib/utils'

const metricIcons: Record<MetricCard['accent'], LucideIcon> = {
  'county-facts': FileText,
  'sales-history': History,
  'tax-history': Receipt,
  'verified-visits': ShieldCheck,
  'buyer-insights': Users,
  schools: School,
}

const metricIconWrap: Record<MetricCard['accent'], string> = {
  'county-facts': 'bg-saffron/25 text-saffron-glow',
  'sales-history': 'bg-saffron-bright/25 text-saffron-glow',
  'tax-history': 'bg-saffron/20 text-saffron-glow',
  'verified-visits': 'bg-night-ink/15 text-saffron-glow',
  'buyer-insights': 'bg-saffron/25 text-saffron-glow',
  schools: 'bg-saffron-bright/20 text-saffron-glow',
}

const metricToSurface: Record<MetricCard['id'], CatchUpSurface> = {
  'county-facts': 'county-facts',
  'sales-history': 'sales-history',
  'tax-history': 'tax-history',
  'verified-visits': 'verified-visits',
  'buyer-insights': 'buyer-insights',
  schools: 'schools',
}

function truncateAddress(address: string, max = 22) {
  if (address.length <= max) return address
  return `${address.slice(0, max - 1)}…`
}

function HistoryRow({
  item,
  onSelect,
}: {
  item: HistoryAddress
  onSelect: (item: HistoryAddress) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-night-ink/10 touch-manipulation"
      data-testid={`history-${item.id}`}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-night-ink">
        {item.address}
        <span className="text-night-faint">
          {' '}
          · {item.city}, {item.state}
        </span>
      </span>
      {item.hasPrivateNotes ? (
        <StickyNote
          className="h-3.5 w-3.5 shrink-0 text-saffron-bright"
          aria-label="Has private notes"
          data-testid={`history-notes-${item.id}`}
        />
      ) : null}
      {item.saved ? (
        <span className="shrink-0 text-[10px] font-semibold tracking-wide text-saffron-glow uppercase">
          Saved
        </span>
      ) : null}
    </button>
  )
}

export function PropertyDetailScreen() {
  const navigate = useNavigate()
  const { address = '' } = useParams<{ address: string }>()
  const decoded = decodeURIComponent(address)
  const property = useMemo(
    () => resolvePropertyFromQuery(decoded || DEMO_PROPERTY.address),
    [decoded],
  )
  const propertyKey = property.id

  const [starred, setStarred] = useState(() => isOnWatchlist(property.id) || property.starred)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [activeSurface, setActiveSurface] = useState<CatchUpSurface | null>(null)

  useEffect(() => {
    setStarred(isOnWatchlist(property.id) || property.starred)
  }, [propertyKey, property.id, property.starred])

  const metrics = useMemo(() => getMetricCards(property), [property])
  const truncated = truncateAddress(property.address)
  const savedNoteCount = notesCount(property.id)

  function handleToggleStar() {
    const result = toggleWatchlist(property)
    setStarred(result.starred)
  }

  function openHistoryAddress(item: HistoryAddress) {
    const full = `${item.address}, ${item.city}, ${item.state}`
    navigate(`/property/${encodeURIComponent(full)}`)
    setActiveSurface(null)
  }

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  return (
    <AppShell
      className="bfi-night-wash"
      contentClassName="min-h-0 bfi-night-wash text-night-ink"
    >
      {activeSurface ? (
        <CatchUpFlow
          key={activeSurface}
          surface={activeSurface}
          response={fetchSurfaceApi(activeSurface, property)}
          address={fullAddress}
          propertyId={property.id}
          property={property}
          onClose={() => setActiveSurface(null)}
        />
      ) : (
        <>
          <header
            className="sticky top-0 z-20 border-b border-white/15 bg-coastal/90 backdrop-blur-md"
            data-testid="property-top-bar"
          >
            <div className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={handleToggleStar}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-night-ink/10 hover:text-saffron-glow touch-manipulation"
                aria-label={starred ? 'Remove from watchlist' : 'Save to watchlist'}
                aria-pressed={starred}
                data-testid="button-star-property"
              >
                <Star
                  className={cn('h-5 w-5', starred && 'fill-saffron-bright text-saffron-bright')}
                  strokeWidth={starred ? 0 : 2}
                />
              </button>

              <h1
                className="truncate text-center font-display text-[15px] font-semibold tracking-tight text-saffron-glow"
                title={fullAddress}
                data-testid="text-truncated-address"
              >
                {truncated}
              </h1>

              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-saffron/45 bg-saffron/20 px-3 text-xs font-bold tracking-wide text-saffron-glow transition-colors hover:bg-saffron/30 touch-manipulation"
                aria-label="GPS Verify"
                data-testid="badge-gps-verify"
              >
                <Crosshair className="h-3.5 w-3.5" />
                Verify
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-4">
            <section className="px-3 pt-4" aria-label="Quick actions" data-testid="metric-cards">
              <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-0.5">
                {metrics.map((card) => {
                  const Icon = metricIcons[card.accent]
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveSurface(metricToSurface[card.id])}
                      className="relative flex w-full flex-col items-center gap-1.5 rounded-2xl bg-transparent px-1 py-1 text-center transition-opacity active:opacity-70 touch-manipulation"
                      aria-label={`${card.title}. ${card.subtitle}`}
                      title={card.detail}
                      data-testid={`metric-${card.id}`}
                    >
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-coastal-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(255_248_247/0.12)]">
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-[14px]',
                            metricIconWrap[card.accent],
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.25} />
                        </span>
                        {card.badge ? (
                          <span className="absolute -top-1 -right-1 max-w-[2.75rem] truncate rounded-full bg-saffron px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_4px_10px_rgb(232_145_58/0.35)]">
                            {card.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="w-full text-[11px] font-medium leading-tight text-night-ink">
                        {card.title}
                      </span>
                      <span className="w-full text-[10px] leading-tight text-night-faint">
                        {card.subtitle}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mt-5 px-3" data-testid="notes-moved-hint">
              <button
                type="button"
                onClick={() => {
                  if (!starred) handleToggleStar()
                  navigate('/watchlist')
                }}
                className="flex w-full min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-coastal/90 px-3 py-2.5 text-left touch-manipulation"
                data-testid="button-open-watchlist-notes"
              >
                <StickyNote className="h-4 w-4 shrink-0 text-saffron-bright" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[11px] font-bold tracking-[0.14em] text-night-muted uppercase">
                    Notes live on Watchlist
                  </span>
                  <span className="mt-0.5 block text-[12px] text-night-faint">
                    {starred
                      ? savedNoteCount > 0
                        ? `${savedNoteCount} note${savedNoteCount === 1 ? '' : 's'} on this saved property`
                        : 'Open Watchlist to add private notes'
                      : 'Star to save, then add private notes on Watchlist'}
                  </span>
                </span>
                {savedNoteCount > 0 ? (
                  <span className="rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
                    {savedNoteCount}
                  </span>
                ) : null}
              </button>
            </section>

            <section className="mt-4 px-3" data-testid="history-section">
              <button
                type="button"
                onClick={() => setHistoryOpen((open) => !open)}
                className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
                aria-expanded={historyOpen}
                data-testid="button-toggle-history"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-saffron-glow transition-transform',
                    !historyOpen && '-rotate-90',
                  )}
                />
                <span className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
                  Searched History
                </span>
                <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
                  {SEARCH_HISTORY.length}
                </span>
              </button>

              {historyOpen ? (
                <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-white/25 bg-coastal/90 p-2 shadow-sm backdrop-blur-sm">
                  <p className="px-2 pb-1 text-[11px] text-night-faint">
                    Previously searched and saved addresses
                  </p>
                  {SEARCH_HISTORY.map((item) => (
                    <HistoryRow key={item.id} item={item} onSelect={openHistoryAddress} />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </AppShell>
  )
}
