import type { MockProperty } from './mockProperty'

/** One GPS-verified presence confirmation at a property. */
export type VerifiedVisit = {
  id: string
  /** ISO timestamp of the visit (local display derived in UI) */
  visitedAt: string
  /** Anonymized visitor token — not a real identity */
  visitorLabel: string
  /** Reported GPS accuracy in meters */
  accuracyMeters: number
  /** Distance from pin when verified */
  distanceMeters: number
  withinRadius: boolean
  /** Coarse platform hint only */
  platform: 'iOS' | 'Android'
}

export type VisitPatternSignal = {
  id: string
  title: string
  detail: string
  tone: 'neutral' | 'positive' | 'caution'
}

export type VerifiedVisitsBundle = {
  propertyId: string
  listingPostedAt: string
  radiusMeters: number
  visits: VerifiedVisit[]
  signals: VisitPatternSignal[]
}

function daysBetween(aIso: string, bIso: string) {
  const a = new Date(aIso)
  const b = new Date(bIso)
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function uniqueDays(visits: VerifiedVisit[]) {
  return new Set(visits.map((v) => v.visitedAt.slice(0, 10))).size
}

function uniqueVisitors(visits: VerifiedVisit[]) {
  return new Set(visits.map((v) => v.visitorLabel)).size
}

function buildSignals(
  listingPostedAt: string,
  visits: VerifiedVisit[],
): VisitPatternSignal[] {
  const postListing = visits.filter((v) => new Date(v.visitedAt) >= new Date(listingPostedAt))
  const preListing = visits.length - postListing.length
  const daySpan = uniqueDays(visits)
  const visitors = uniqueVisitors(visits)

  const sorted = [...visits].sort(
    (a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime(),
  )
  let tightPairs = 0
  for (let i = 1; i < sorted.length; i++) {
    const gapMin =
      (new Date(sorted[i]!.visitedAt).getTime() - new Date(sorted[i - 1]!.visitedAt).getTime()) /
      60_000
    if (gapMin <= 5) tightPairs += 1
  }

  const daytime = visits.filter((v) => {
    const hour = new Date(v.visitedAt).getHours()
    return hour >= 8 && hour <= 20
  }).length

  const signals: VisitPatternSignal[] = [
    {
      id: 'vs-listing',
      title: preListing === 0 ? 'All visits after listing' : 'Some visits before listing',
      detail:
        preListing === 0
          ? `${postListing.length} of ${visits.length} confirmations landed on or after the sale posting date.`
          : `${preListing} visit(s) timestamped before the listing post — review those dates carefully.`,
      tone: preListing === 0 ? 'positive' : 'caution',
    },
    {
      id: 'vs-spread',
      title: 'Calendar spread',
      detail: `${daySpan} distinct day(s) · ${visitors} anonymized visitor(s). Spread across days is harder to manufacture than a same-hour burst.`,
      tone: daySpan >= 3 && visitors >= 2 ? 'positive' : 'neutral',
    },
    {
      id: 'vs-cluster',
      title: tightPairs > 0 ? 'Tight time clusters' : 'No ultra-tight clusters',
      detail:
        tightPairs > 0
          ? `${tightPairs} pair(s) of visits within 5 minutes. Could be legitimate (two buyers overlapping) — or worth a second look.`
          : 'No visits within 5 minutes of each other in this log.',
      tone: tightPairs > 0 ? 'caution' : 'positive',
    },
    {
      id: 'vs-daytime',
      title: 'Time-of-day mix',
      detail: `${daytime} of ${visits.length} during typical showing hours (8am–8pm local). Odd-hour-only patterns can look less natural.`,
      tone: daytime >= Math.ceil(visits.length * 0.6) ? 'positive' : 'neutral',
    },
  ]

  return signals
}

/**
 * Demo visit log for a property. Dates are absolute so buyers can compare
 * against listing post time and judge whether the pattern looks natural.
 */
export function getVerifiedVisitsBundle(property: MockProperty): VerifiedVisitsBundle {
  const listingPostedAt = property.listingPostedAt

  const visits: VerifiedVisit[] = [
    {
      id: 'vv-1',
      visitedAt: '2026-07-14T10:22:00',
      visitorLabel: 'Visitor A',
      accuracyMeters: 8,
      distanceMeters: 24,
      withinRadius: true,
      platform: 'iOS',
    },
    {
      id: 'vv-2',
      visitedAt: '2026-07-18T16:05:00',
      visitorLabel: 'Visitor B',
      accuracyMeters: 12,
      distanceMeters: 41,
      withinRadius: true,
      platform: 'Android',
    },
    {
      id: 'vv-3',
      visitedAt: '2026-07-22T11:48:00',
      visitorLabel: 'Visitor C',
      accuracyMeters: 6,
      distanceMeters: 18,
      withinRadius: true,
      platform: 'iOS',
    },
    {
      id: 'vv-4',
      visitedAt: '2026-07-22T11:51:00',
      visitorLabel: 'Visitor D',
      accuracyMeters: 15,
      distanceMeters: 62,
      withinRadius: true,
      platform: 'Android',
    },
    {
      id: 'vv-5',
      visitedAt: '2026-08-01T18:15:00',
      visitorLabel: 'Visitor A',
      accuracyMeters: 9,
      distanceMeters: 31,
      withinRadius: true,
      platform: 'iOS',
    },
    {
      id: 'vv-6',
      visitedAt: '2026-08-05T09:03:00',
      visitorLabel: 'Visitor E',
      accuracyMeters: 11,
      distanceMeters: 47,
      withinRadius: true,
      platform: 'iOS',
    },
  ]

  return {
    propertyId: property.id,
    listingPostedAt,
    radiusMeters: 100,
    visits,
    signals: buildSignals(listingPostedAt, visits),
  }
}

export function formatVisitDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatVisitTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function relativeToListing(visitedAt: string, listingPostedAt: string) {
  const days = daysBetween(listingPostedAt, visitedAt)
  if (days === 0) return 'Same day as listing post'
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} after listing`
  const before = Math.abs(days)
  return `${before} day${before === 1 ? '' : 's'} before listing`
}

export function visitSummary(bundle: VerifiedVisitsBundle) {
  const postListing = bundle.visits.filter(
    (v) => new Date(v.visitedAt) >= new Date(bundle.listingPostedAt),
  ).length
  return {
    total: bundle.visits.length,
    postListing,
    preListing: bundle.visits.length - postListing,
    distinctDays: uniqueDays(bundle.visits),
    distinctVisitors: uniqueVisitors(bundle.visits),
  }
}
