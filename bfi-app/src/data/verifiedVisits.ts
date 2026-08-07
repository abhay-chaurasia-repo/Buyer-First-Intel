import type { MockProperty } from './mockProperty'
import { BUYER_COMMUNITY_LABELS } from './buyerCommunityLabels'
import { loadBuyerVoteState, loadBuyerVerified } from './buyerCommunityStorage'

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
  /**
   * Buyer Community label ids this visitor upvoted.
   * Empty when they verified presence but did not label.
   */
  communityLabelIds: string[]
}

export type VisitPatternSignal = {
  id: string
  title: string
  detail: string
  tone: 'neutral' | 'positive' | 'caution'
}

export type VerifiedVisitsBundle = {
  propertyId: string
  radiusMeters: number
  visits: VerifiedVisit[]
  signals: VisitPatternSignal[]
}

function uniqueDays(visits: VerifiedVisit[]) {
  return new Set(visits.map((v) => v.visitedAt.slice(0, 10))).size
}

function uniqueVisitors(visits: VerifiedVisit[]) {
  return new Set(visits.map((v) => v.visitorLabel)).size
}

function buildSignals(visits: VerifiedVisit[]): VisitPatternSignal[] {
  const daySpan = uniqueDays(visits)
  const visitors = uniqueVisitors(visits)
  const withLabels = visits.filter((v) => v.communityLabelIds.length > 0).length
  const labelVisitors = new Set(
    visits.filter((v) => v.communityLabelIds.length > 0).map((v) => v.visitorLabel),
  ).size

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

  return [
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
    {
      id: 'vs-labels',
      title:
        labelVisitors > 0
          ? 'Community labels from visitors'
          : 'No community labels yet',
      detail:
        labelVisitors > 0
          ? `${labelVisitors} visitor(s) also upvoted Buyer Community labels on ${withLabels} visit row(s). Labels pull from the same community catalog.`
          : 'Verified presence alone is logged. Label votes appear here when a visitor upvotes in Buyer Community.',
      tone: labelVisitors > 0 ? 'positive' : 'neutral',
    },
  ]
}

const SEED_VISITS: VerifiedVisit[] = [
  {
    id: 'vv-1',
    visitedAt: '2026-07-14T10:22:00',
    visitorLabel: 'Visitor A',
    accuracyMeters: 8,
    distanceMeters: 24,
    withinRadius: true,
    platform: 'iOS',
    communityLabelIds: ['quiet-at-night', 'tight-driveway'],
  },
  {
    id: 'vv-2',
    visitedAt: '2026-07-18T16:05:00',
    visitorLabel: 'Visitor B',
    accuracyMeters: 12,
    distanceMeters: 41,
    withinRadius: true,
    platform: 'Android',
    communityLabelIds: ['mature-trees', 'easy-guest-parking', 'strong-curb-appeal'],
  },
  {
    id: 'vv-3',
    visitedAt: '2026-07-22T11:48:00',
    visitorLabel: 'Visitor C',
    accuracyMeters: 6,
    distanceMeters: 18,
    withinRadius: true,
    platform: 'iOS',
    communityLabelIds: ['finished-basement', 'updated-interior-feel', 'well-kept-exterior'],
  },
  {
    id: 'vv-4',
    visitedAt: '2026-07-22T11:51:00',
    visitorLabel: 'Visitor D',
    accuracyMeters: 15,
    distanceMeters: 62,
    withinRadius: true,
    platform: 'Android',
    communityLabelIds: [],
  },
  {
    id: 'vv-5',
    visitedAt: '2026-08-01T18:15:00',
    visitorLabel: 'Visitor A',
    accuracyMeters: 9,
    distanceMeters: 31,
    withinRadius: true,
    platform: 'iOS',
    communityLabelIds: ['quiet-at-night', 'roomy-driveway', 'fair-value-feel'],
  },
  {
    id: 'vv-6',
    visitedAt: '2026-08-05T09:03:00',
    visitorLabel: 'Visitor E',
    accuracyMeters: 11,
    distanceMeters: 47,
    withinRadius: true,
    platform: 'iOS',
    communityLabelIds: ['exterior-deferred-maintenance', 'drainage-concern', 'usable-backyard'],
  },
]

/**
 * Demo visit log. Date/time only — buyers compare to listing timing themselves.
 * Community labels mirror Buyer Community upvotes for that visitor.
 */
export function getVerifiedVisitsBundle(property: MockProperty): VerifiedVisitsBundle {
  const visits = mergeLiveCommunityLabels(property.id, SEED_VISITS)

  return {
    propertyId: property.id,
    radiusMeters: 100,
    visits,
    signals: buildSignals(visits),
  }
}

/**
 * Overlay the current user's Buyer Community upvotes onto a "You" visit row
 * when they have verified presence and labelled.
 */
function mergeLiveCommunityLabels(
  propertyId: string,
  seed: VerifiedVisit[],
): VerifiedVisit[] {
  if (typeof localStorage === 'undefined') return seed.map((v) => ({ ...v }))

  const verified = loadBuyerVerified(propertyId)
  const { myVotes } = loadBuyerVoteState(propertyId)
  const base = seed.map((v) => ({ ...v, communityLabelIds: [...v.communityLabelIds] }))

  if (!verified || myVotes.length === 0) return base

  const youIndex = base.findIndex((v) => v.visitorLabel === 'You')
  if (youIndex >= 0) {
    const existing = base[youIndex]!
    base[youIndex] = {
      ...existing,
      communityLabelIds: Array.from(new Set([...existing.communityLabelIds, ...myVotes])),
    }
    return base
  }

  return [
    {
      id: 'vv-you',
      visitedAt: new Date().toISOString(),
      visitorLabel: 'You',
      accuracyMeters: 10,
      distanceMeters: 20,
      withinRadius: true,
      platform: 'iOS',
      communityLabelIds: [...myVotes],
    },
    ...base,
  ]
}

export function labelTextById(labelId: string) {
  return BUYER_COMMUNITY_LABELS.find((label) => label.id === labelId)?.text ?? labelId
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

export function visitSummary(bundle: VerifiedVisitsBundle) {
  const withLabels = bundle.visits.filter((v) => v.communityLabelIds.length > 0).length
  return {
    total: bundle.visits.length,
    withLabels,
    distinctDays: uniqueDays(bundle.visits),
    distinctVisitors: uniqueVisitors(bundle.visits),
  }
}
