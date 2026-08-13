import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Crosshair,
  FileText,
  History,
  Receipt,
  School,
  ShieldCheck,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CatchUpFlow, type CatchUpSurface } from '@/components/catchup/CatchUpFlow'
import { plusWatchChipClass } from '@/components/PlusWatchLegend'
import { useAuth } from '@/auth/AuthProvider'
import { fetchSurfaceApi } from '@/data/catchUpApi'
import {
  PLUS_LABEL_SHORT,
  WATCH_LABEL_SHORT,
} from '@/data/buyerCommunityLabels'
import {
  DEMO_PROPERTY,
  getMetricCards,
  resolvePropertyFromQuery,
  type MetricCard,
  type MockProperty,
} from '@/data/mockProperty'
import { loadGpsVerified, persistGpsVerified } from '@/data/ownerScope'
import { isOnWatchlist, toggleWatchlist } from '@/data/watchlistStorage'
import {
  loadPropertyFromQuery,
  type PropertyLookupStatus,
} from '@/lib/propertyLookup'
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

export function PropertyDetailScreen() {
  const { ownerId } = useAuth()
  const { address = '' } = useParams<{ address: string }>()
  const decoded = decodeURIComponent(address)
  const query = decoded || DEMO_PROPERTY.address

  const [property, setProperty] = useState<MockProperty>(() => resolvePropertyFromQuery(query))
  const [lookupStatus, setLookupStatus] = useState<PropertyLookupStatus | null>(null)
  const [lookupBusy, setLookupBusy] = useState(true)
  const propertyKey = property.id

  const [starred, setStarred] = useState(() => isOnWatchlist(property.id) || property.starred)
  const [verified, setVerified] = useState(() => loadGpsVerified(property.id))
  const [activeSurface, setActiveSurface] = useState<CatchUpSurface | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    setLookupBusy(true)
    setProperty(resolvePropertyFromQuery(query))
    setLookupStatus(null)

    void loadPropertyFromQuery(query).then((result) => {
      if (cancelled) return
      setProperty(result.property)
      setLookupStatus(result.status)
      setLookupBusy(false)
    })

    return () => {
      cancelled = true
    }
  }, [query, ownerId])

  useEffect(() => {
    setStarred(isOnWatchlist(property.id) || property.starred)
    setVerified(loadGpsVerified(property.id))
  }, [propertyKey, property.id, property.starred, ownerId])

  useEffect(() => {
    const catchup = searchParams.get('catchup')
    if (!catchup) return
    const allowed: CatchUpSurface[] = [
      'county-facts',
      'sales-history',
      'tax-history',
      'verified-visits',
      'buyer-insights',
      'schools',
    ]
    if (allowed.includes(catchup as CatchUpSurface)) {
      setActiveSurface(catchup as CatchUpSurface)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('catchup')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const metrics = useMemo(() => getMetricCards(property), [property])
  const truncated = truncateAddress(property.address)

  function handleToggleStar() {
    const result = toggleWatchlist(property)
    setStarred(result.starred)
  }

  function handleToggleVerify() {
    setVerified((prev) => {
      const next = !prev
      persistGpsVerified(property.id, next)
      return next
    })
  }

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  return (
    <AppShell scene="property" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
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
            className="relative z-20 shrink-0 bfi-status-pad"
            data-testid="property-top-bar"
          >
            <div
              className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 pb-2 pt-2"
              data-testid="page-title-open"
            >
              <button
                type="button"
                onClick={handleToggleStar}
                className={cn(
                  'inline-flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent px-2 py-1.5 text-[10px] font-bold tracking-wide transition-[border-color,background-color,color] touch-manipulation',
                  'hover:border-white/35 hover:bg-white/8 focus-visible:border-white/35 focus-visible:bg-white/8 active:border-white/35',
                  starred ? 'text-saffron-glow' : 'text-night-ink',
                )}
                aria-label={starred ? 'Remove from Homes in Diligence' : 'Save to Homes in Diligence'}
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
                className="min-w-0 rounded-xl border border-transparent px-2.5 py-1.5 text-center transition-[border-color,background-color] hover:border-white/35 hover:bg-white/8 focus-within:border-white/35"
                data-testid="property-address-box"
                title={fullAddress}
              >
                <h1
                  className="truncate font-display text-[1.05rem] font-semibold tracking-tight"
                  data-testid="text-truncated-address"
                >
                  <span className="bg-gradient-to-br from-saffron-glow via-saffron-bright to-saffron bg-clip-text text-transparent">
                    {truncated}
                  </span>
                </h1>
              </div>

              <button
                type="button"
                onClick={handleToggleVerify}
                className={cn(
                  'inline-flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent px-2 py-1.5 text-[10px] font-bold tracking-wide transition-[border-color,background-color,color] touch-manipulation',
                  'hover:border-white/35 hover:bg-white/8 focus-visible:border-white/35 focus-visible:bg-white/8 active:border-white/35',
                  verified ? 'text-saffron-glow' : 'text-night-ink',
                )}
                aria-label={verified ? 'Clear GPS verification' : 'GPS Verify'}
                aria-pressed={verified}
                data-testid="badge-gps-verify"
              >
                <Crosshair className="h-4 w-4" strokeWidth={2.25} />
                <span>{verified ? 'Verified' : 'Verify'}</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-4">
            {lookupBusy || lookupStatus?.warning ? (
              <div className="px-3 pt-2" data-testid="property-lookup-status">
                <p
                  className={cn(
                    'rounded-xl border px-3 py-2 text-[11px] leading-snug',
                    lookupStatus?.warning
                      ? 'border-watch/40 bg-watch-soft text-watch-glow'
                      : 'border-white/20 bg-night/25 text-night-faint',
                  )}
                >
                  {lookupBusy ? 'Matching address…' : lookupStatus?.warning}
                </p>
              </div>
            ) : null}

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
                      aria-label={card.title}
                      data-testid={`metric-${card.id}`}
                    >
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/25 bg-transparent">
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-[14px]',
                            metricIconWrap[card.accent],
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.25} />
                        </span>
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

            <section
              className="px-3 pt-5 pb-2"
              aria-label="How diligence voting works"
              data-testid="buyer-community-promo"
            >
              <div className="rounded-2xl border border-white/20 bg-night-elevated/45 px-3.5 py-3.5">
                {/* 1 — County's Fact remote path */}
                <div data-testid="promo-county-fact">
                  <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                    County&apos;s Fact
                  </p>
                  <p className="mt-1.5 text-[12px] leading-snug text-night-ink">
                    Living-area labels can be voted <span className="font-semibold">remotely</span>{' '}
                    — no GPS visit required. Compare county sqft to the published listing size,
                    then upvote whether it matches or looks overstated.
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-snug text-night-faint">
                    <li>Open County&apos;s Fact and read grossSizeAdjusted.</li>
                    <li>Check the published size on Zillow or Redfin.</li>
                    <li>Upvote Match or Overstated in the remote insight panel.</li>
                  </ol>
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-night-faint">
                    <Crosshair
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-glow"
                      strokeWidth={2.25}
                    />
                    <span>
                      GPS Verify is <span className="font-semibold text-night-ink">not needed</span>{' '}
                      for this size check — it&apos;s the one remote exception.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSurface('county-facts')}
                    className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.04] px-3 text-[12px] font-semibold text-saffron-glow transition-colors hover:border-saffron/40 touch-manipulation"
                    data-testid="button-promo-open-county-facts"
                  >
                    <FileText className="h-3.5 w-3.5" strokeWidth={2.25} />
                    Open County&apos;s Fact
                  </button>
                </div>

                <div className="my-3.5 border-t border-white/12" />

                {/* 2 — Community insights + GPS + Plus/Watch */}
                <div data-testid="promo-community-insights">
                  <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                    Buyer Community Insights
                  </p>
                  <p className="mt-1.5 text-[12px] leading-snug text-night-ink">
                    Everything else is visit-backed. Structured Plus/Watch labels from buyers who
                    showed up — not listing hype.
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-night-faint">
                    <Crosshair
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-glow"
                      strokeWidth={2.25}
                    />
                    <span>
                      <span className="font-semibold text-night-ink">GPS verification:</span> tap
                      Verify on this header while at the home to unlock on-site community upvotes.
                    </span>
                  </p>

                  <div
                    className="mt-3 space-y-2 rounded-xl border border-white/12 bg-black/20 px-3 py-2.5"
                    data-testid="promo-plus-watch"
                  >
                    <div className="grid items-start gap-x-3" style={{ gridTemplateColumns: '3.6rem 1fr' }}>
                      <span className={cn('justify-self-start', plusWatchChipClass('plus'))}>
                        Plus
                      </span>
                      <p className="min-w-0 text-[11px] leading-snug text-night-ink">
                        <span className="font-semibold text-plus-glow">Upsides</span>
                        <span className="text-night-faint"> — {PLUS_LABEL_SHORT}.</span>
                      </p>
                    </div>
                    <div className="grid items-start gap-x-3" style={{ gridTemplateColumns: '3.6rem 1fr' }}>
                      <span className={cn('justify-self-start', plusWatchChipClass('watch'))}>
                        Watch
                      </span>
                      <p className="min-w-0 text-[11px] leading-snug text-night-ink">
                        <span className="font-semibold text-watch-glow">Watch-outs</span>
                        <span className="text-night-faint"> — {WATCH_LABEL_SHORT}.</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSurface('buyer-insights')}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-saffron/45 bg-saffron/15 px-4 text-[12px] font-semibold text-saffron-glow transition-colors hover:bg-saffron/25 touch-manipulation"
                    data-testid="button-open-buyer-community"
                  >
                    <Users className="h-4 w-4" strokeWidth={2.25} />
                    Open Buyer Community
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  )
}
