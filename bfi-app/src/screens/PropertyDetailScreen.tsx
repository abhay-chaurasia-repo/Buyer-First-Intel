import { Capacitor } from '@capacitor/core'
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
import {
  loadNearbyNudgeEnabled,
  persistNearbyNudgeEnabled,
} from '@/data/gpsSettings'
import { isOnWatchlist, toggleWatchlist } from '@/data/watchlistStorage'
import {
  attemptGpsVerify,
  GPS_NEARBY_NUDGE_METERS,
  GPS_VERIFY_RADIUS_METERS,
  locationPermissionGranted,
  watchNearbyProperty,
} from '@/lib/gpsVerify'
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
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<{
    tone: 'ok' | 'warn'
    text: string
  } | null>(null)
  const [nearbyNudgeEnabled, setNearbyNudgeEnabled] = useState(() =>
    loadNearbyNudgeEnabled(),
  )
  const [nearby, setNearby] = useState(false)
  const [nearbyDistanceM, setNearbyDistanceM] = useState<number | null>(null)
  const [locationPrimerOpen, setLocationPrimerOpen] = useState(false)
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
    setNearbyNudgeEnabled(loadNearbyNudgeEnabled())
    setNearby(false)
    setNearbyDistanceM(null)
    setVerifyMessage(null)
    setVerifyBusy(false)
    setLocationPrimerOpen(false)
  }, [propertyKey, property.id, property.starred, ownerId])

  useEffect(() => {
    if (!nearbyNudgeEnabled || verified || activeSurface) {
      setNearby(false)
      setNearbyDistanceM(null)
      return
    }
    if (property.lat == null || property.lng == null) return

    return watchNearbyProperty(property, (update) => {
      setNearby(update.nearby)
      setNearbyDistanceM(update.distanceMeters)
    })
  }, [
    nearbyNudgeEnabled,
    verified,
    activeSurface,
    property.lat,
    property.lng,
    property.id,
  ])

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
  const nudgeVerify = nearbyNudgeEnabled && nearby && !verified && !verifyBusy

  function handleToggleStar() {
    const result = toggleWatchlist(property)
    setStarred(result.starred)
  }

  function handleToggleNearbyNudge() {
    setNearbyNudgeEnabled((prev) => {
      const next = !prev
      persistNearbyNudgeEnabled(next)
      if (!next) {
        setNearby(false)
        setNearbyDistanceM(null)
      }
      return next
    })
  }

  async function runGpsVerify() {
    setVerifyBusy(true)
    setVerifyMessage({
      tone: 'ok',
      text: 'Checking your location… allow location if prompted.',
    })

    const result = await attemptGpsVerify(property)
    if (result.ok) {
      persistGpsVerified(property.id, true, undefined, {
        distanceMeters: result.distanceMeters,
        accuracyMeters: result.accuracyMeters,
      })
      setVerified(true)
      setVerifyMessage({
        tone: 'ok',
        text: `Verified within ${GPS_VERIFY_RADIUS_METERS}m (${result.distanceMeters}m away, ±${result.accuracyMeters}m). On-site labels unlocked for 48 hours.`,
      })
    } else {
      setVerified(false)
      setVerifyMessage({ tone: 'warn', text: result.message })
    }
    setVerifyBusy(false)
  }

  async function handleToggleVerify() {
    if (verifyBusy) return

    if (verified) {
      persistGpsVerified(property.id, false)
      setVerified(false)
      setVerifyMessage({
        tone: 'ok',
        text: 'GPS verification cleared. On-site Buyer Community votes are locked again.',
      })
      return
    }

    if (Capacitor.isNativePlatform()) {
      const granted = await locationPermissionGranted()
      if (!granted) {
        setLocationPrimerOpen(true)
        return
      }
    }

    await runGpsVerify()
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
                onClick={() => void handleToggleVerify()}
                disabled={verifyBusy}
                className={cn(
                  'inline-flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 text-[10px] font-bold tracking-wide transition-[border-color,background-color,color,box-shadow,transform] touch-manipulation',
                  nudgeVerify
                    ? 'animate-bfi-verify-pulse border-saffron/70 bg-saffron/25 text-saffron-glow'
                    : 'border-transparent hover:border-white/35 hover:bg-white/8 focus-visible:border-white/35 focus-visible:bg-white/8 active:border-white/35',
                  verified ? 'text-saffron-glow' : !nudgeVerify && 'text-night-ink',
                  verifyBusy && 'opacity-60',
                )}
                aria-label={
                  verified
                    ? 'Clear GPS verification'
                    : nudgeVerify
                      ? 'You are near this home — GPS Verify now'
                      : 'GPS Verify on site'
                }
                aria-pressed={verified}
                aria-busy={verifyBusy}
                data-testid="badge-gps-verify"
                data-nearby={nudgeVerify ? 'true' : 'false'}
              >
                <Crosshair className="h-4 w-4" strokeWidth={2.25} />
                <span>
                  {verifyBusy ? '…' : verified ? 'Verified' : nudgeVerify ? 'Tap Verify' : 'Verify'}
                </span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-4">
            {lookupBusy || lookupStatus?.warning || verifyMessage || nudgeVerify ? (
              <div className="space-y-2 px-3 pt-2" data-testid="property-status-banners">
                {lookupBusy || lookupStatus?.warning ? (
                  <div data-testid="property-lookup-status">
                    <p
                      className={cn(
                        'rounded-xl border px-3 py-2 text-[11px] leading-snug',
                        lookupStatus?.warning
                          ? 'border-watch/40 bg-watch-soft text-watch-glow'
                          : 'border-white/20 bg-night/25 text-night-faint',
                      )}
                    >
                      {lookupBusy ? 'Looking up this address…' : lookupStatus?.warning}
                    </p>
                  </div>
                ) : null}
                {nudgeVerify ? (
                  <button
                    type="button"
                    onClick={() => void handleToggleVerify()}
                    className="flex w-full items-start gap-2 rounded-xl border border-saffron/50 bg-saffron/15 px-3 py-2.5 text-left touch-manipulation"
                    data-testid="gps-nearby-nudge"
                  >
                    <Crosshair
                      className="mt-0.5 h-4 w-4 shrink-0 animate-bfi-verify-pulse text-saffron-glow"
                      strokeWidth={2.25}
                    />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-saffron-glow">
                        You&apos;re near this home
                        {nearbyDistanceM != null ? ` · ~${nearbyDistanceM}m` : ''}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-night-ink">
                        Tap Verify (within {GPS_VERIFY_RADIUS_METERS}m) to unlock on-site Buyer
                        Community labels. Nudge zone is {GPS_NEARBY_NUDGE_METERS}m.
                      </span>
                    </span>
                  </button>
                ) : null}
                {verifyMessage ? (
                  <p
                    className={cn(
                      'rounded-xl border px-3 py-2 text-[11px] leading-snug',
                      verifyMessage.tone === 'warn'
                        ? 'border-watch/40 bg-watch-soft text-watch-glow'
                        : 'border-saffron/35 bg-saffron/10 text-saffron-glow',
                    )}
                    data-testid="gps-verify-status"
                    role="status"
                  >
                    {verifyMessage.text}
                  </p>
                ) : null}
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
                    — no GPS visit required. Compare county gross living area to the published listing size,
                    then upvote whether it matches or looks overstated.
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-snug text-night-faint">
                    <li>Open County&apos;s Fact and read Gross living area.</li>
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
                    className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-saffron/45 bg-saffron/15 px-3 text-[12px] font-semibold text-saffron-glow transition-colors hover:bg-saffron/25 touch-manipulation"
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

                  <label
                    className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-black/15 px-3 py-2.5 touch-manipulation"
                    data-testid="setting-nearby-nudge"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-saffron)]"
                      checked={nearbyNudgeEnabled}
                      onChange={handleToggleNearbyNudge}
                      data-testid="checkbox-nearby-nudge"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-night-ink">
                        Nudge me when I&apos;m near this home
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-night-faint">
                        Within ~{GPS_NEARBY_NUDGE_METERS}m, Verify pulses so you remember to confirm
                        presence. Uses location only while this property page is open.
                      </span>
                    </span>
                  </label>

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

      {locationPrimerOpen ? (
        <div
          className="absolute inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center"
          data-testid="location-permission-primer"
        >
          <div className="w-full max-w-md rounded-2xl border border-saffron/35 bg-[#2a1f20] p-4 shadow-[0_20px_48px_rgb(0_0_0/0.55)]">
            <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
              On-site verify
            </p>
            <h2 className="mt-1.5 font-display text-[1.15rem] font-semibold text-night-ink">
              Allow location for Due Diligence
            </h2>
            <p className="mt-2 text-[13px] leading-snug text-night-muted">
              We compare your phone GPS to this home&apos;s pin so on-site Buyer Community labels stay
              visit-backed. Location is used only while you Verify — not in the background.
            </p>
            <p className="mt-2 text-[11px] leading-snug text-night-faint">
              The next sheet is from iOS/Android and cannot use this app&apos;s colors. Choose{' '}
              <span className="font-semibold text-night-ink">Allow while using the app</span>.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setLocationPrimerOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/20 px-3 text-[13px] font-semibold text-night-ink touch-manipulation"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationPrimerOpen(false)
                  void runGpsVerify()
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-saffron/50 bg-saffron/20 px-3 text-[13px] font-semibold text-saffron-glow touch-manipulation"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
