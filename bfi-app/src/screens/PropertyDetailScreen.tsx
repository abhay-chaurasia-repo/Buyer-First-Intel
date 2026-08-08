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
  'county-facts': 'bg-saffron/30 text-saffron-glow shadow-[0_6px_16px_rgb(232_145_58/0.35)]',
  'sales-history':
    'bg-saffron-bright/30 text-saffron-glow shadow-[0_6px_16px_rgb(245_166_35/0.32)]',
  'tax-history': 'bg-saffron/25 text-saffron-glow shadow-[0_6px_16px_rgb(232_145_58/0.3)]',
  'verified-visits':
    'bg-saffron/30 text-saffron-glow shadow-[0_6px_16px_rgb(232_145_58/0.32)]',
  'buyer-insights':
    'bg-saffron-bright/28 text-saffron-glow shadow-[0_6px_16px_rgb(245_166_35/0.3)]',
  schools: 'bg-saffron/28 text-saffron-glow shadow-[0_6px_16px_rgb(232_145_58/0.3)]',
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
  const [verified, setVerified] = useState(() => {
    try {
      return localStorage.getItem(`bfi.gpsVerified.${property.id}`) === '1'
    } catch {
      return false
    }
  })
  const [historyOpen, setHistoryOpen] = useState(true)
  const [activeSurface, setActiveSurface] = useState<CatchUpSurface | null>(null)

  useEffect(() => {
    setStarred(isOnWatchlist(property.id) || property.starred)
    try {
      setVerified(localStorage.getItem(`bfi.gpsVerified.${property.id}`) === '1')
    } catch {
      setVerified(false)
    }
  }, [propertyKey, property.id, property.starred])

  const metrics = useMemo(() => getMetricCards(property), [property])
  const truncated = truncateAddress(property.address)

  function handleToggleStar() {
    const result = toggleWatchlist(property)
    setStarred(result.starred)
  }

  function handleToggleVerify() {
    setVerified((prev) => {
      const next = !prev
      try {
        localStorage.setItem(`bfi.gpsVerified.${property.id}`, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  function openHistoryAddress(item: HistoryAddress) {
    const full = `${item.address}, ${item.city}, ${item.state}`
    navigate(`/property/${encodeURIComponent(full)}`)
    setActiveSurface(null)
  }

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  return (
    <AppShell
      scene="property"
      sceneIntensity="soft"
      contentClassName="relative min-h-0 overflow-y-auto overscroll-contain text-night-ink"
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
            className="animate-bfi-fade relative z-20 shrink-0 bfi-status-pad"
            data-testid="property-top-bar"
          >
            <div
              className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 pb-1 pt-2"
              data-testid="page-title-open"
            >
              <button
                type="button"
                onClick={handleToggleStar}
                className={cn(
                  'inline-flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent px-2 py-1.5 text-[10px] font-bold tracking-wide transition-[border-color,background-color,color,box-shadow] touch-manipulation',
                  'hover:border-saffron/45 hover:bg-saffron/15 focus-visible:border-saffron/45 focus-visible:bg-saffron/15 active:border-saffron/45',
                  starred
                    ? 'text-saffron-glow shadow-[0_0_18px_rgb(232_145_58/0.25)]'
                    : 'text-night-ink',
                )}
                aria-label={starred ? 'Remove from watchlist' : 'Save to watchlist'}
                aria-pressed={starred}
                data-testid="button-star-property"
              >
                <Star
                  className={cn('h-4 w-4', starred && 'fill-saffron-glow')}
                  strokeWidth={starred ? 0 : 2.25}
                />
                <span>{starred ? 'Saved' : 'Save'}</span>
              </button>

              <div
                className="min-w-0 rounded-xl border border-transparent px-2.5 py-1.5 text-center transition-[border-color,background-color,box-shadow] hover:border-saffron/40 hover:bg-saffron/10 hover:shadow-[0_0_20px_rgb(232_145_58/0.18)] focus-within:border-saffron/40"
                data-testid="property-address-box"
                title={fullAddress}
              >
                <h1
                  className="truncate font-display text-[1.15rem] font-extrabold tracking-tight"
                  data-testid="text-truncated-address"
                >
                  <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
                    {truncated}
                  </span>
                </h1>
              </div>

              <button
                type="button"
                onClick={handleToggleVerify}
                className={cn(
                  'inline-flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent px-2 py-1.5 text-[10px] font-bold tracking-wide transition-[border-color,background-color,color,box-shadow] touch-manipulation',
                  'hover:border-saffron/45 hover:bg-saffron/15 focus-visible:border-saffron/45 focus-visible:bg-saffron/15 active:border-saffron/45',
                  verified
                    ? 'text-saffron-glow shadow-[0_0_18px_rgb(232_145_58/0.25)]'
                    : 'text-night-ink',
                )}
                aria-label={verified ? 'Clear GPS verification' : 'GPS Verify'}
                aria-pressed={verified}
                data-testid="badge-gps-verify"
              >
                <Crosshair className="h-4 w-4" strokeWidth={2.25} />
                <span>{verified ? 'Verified' : 'Verify'}</span>
              </button>
            </div>

            <p className="animate-bfi-rise px-5 pb-2 text-center text-[0.82rem] leading-relaxed text-white/80">
              County records first — visits, taxes, and buyer labels for this address.
            </p>
          </header>

          <div className="flex-1 pb-4">
            <section
              className="animate-bfi-rise px-3 pt-3"
              style={{ animationDelay: '80ms' }}
              aria-label="Quick actions"
              data-testid="metric-cards"
            >
              <p className="mb-3 px-1 font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                Dig in here
              </p>
              <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-0.5">
                {metrics.map((card, index) => {
                  const Icon = metricIcons[card.accent]
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveSurface(metricToSurface[card.id])}
                      className="animate-bfi-rise relative flex w-full flex-col items-center gap-1.5 rounded-2xl bg-transparent px-1 py-1 text-center transition-transform active:scale-[0.97] touch-manipulation"
                      style={{ animationDelay: `${120 + index * 45}ms` }}
                      aria-label={card.title}
                      data-testid={`metric-${card.id}`}
                    >
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-saffron/35 bg-transparent">
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-[14px]',
                            metricIconWrap[card.accent],
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.25} />
                        </span>
                      </span>
                      <span className="w-full text-[11px] font-semibold leading-tight text-night-ink">
                        {card.title}
                      </span>
                      <span className="w-full text-[10px] leading-tight text-white/70">
                        {card.subtitle}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section
              className="animate-bfi-rise mt-5 px-3"
              style={{ animationDelay: '280ms' }}
              data-testid="history-section"
            >
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
                <span className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                  Searched History
                </span>
                <span className="ml-auto rounded-md border border-saffron/40 bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
                  {SEARCH_HISTORY.length}
                </span>
              </button>

              {historyOpen ? (
                <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-saffron/30 bg-transparent p-2">
                  <p className="px-2 pb-1 text-[11px] text-white/70">
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
