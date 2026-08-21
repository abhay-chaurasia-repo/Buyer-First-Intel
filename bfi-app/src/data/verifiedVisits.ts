import type { MockProperty } from './mockProperty'
import { BUYER_COMMUNITY_LABELS } from './buyerCommunityLabels'
import { loadBuyerVoteState } from './buyerCommunityStorage'
import { loadPresenceEvents } from './ownerScope'

/** One Presence Confirmed log: device within ~100m of the pin (not a tour). */
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
      detail: `${daySpan} distinct day(s) · ${visits.length} visits. Spread across days is harder to manufacture than a same-hour burst.`,
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
      title: withLabels > 0 ? 'Community labels on visits' : 'No community labels yet',
      detail:
        withLabels > 0
          ? `${withLabels} visit(s) also have Buyer Community labels. Labels pull from the same community catalog.`
          : 'Verified presence alone is logged. Label votes appear here when upvoted in Buyer Community.',
      tone: withLabels > 0 ? 'positive' : 'neutral',
    },
  ]
}

/**
 * Presence log. Local "You" events always show. Signed-in buyers also see
 * anonymous dated events from the server. No demo visitors.
 */
export function getVerifiedVisitsBundle(property: MockProperty): VerifiedVisitsBundle {
  const visits = mergeLiveCommunityLabels(property.id, [])

  return {
    propertyId: property.id,
    radiusMeters: 100,
    visits,
    signals: buildSignals(visits),
  }
}

export function bundleFromPresenceLog(
  propertyId: string,
  events: Array<{
    id: string
    confirmedAt: string
    distanceMeters: number
    accuracyMeters: number
    isYou: boolean
    communityLabelIds: string[]
  }>,
): VerifiedVisitsBundle {
  const sortedYou = [...events].filter((event) => event.isYou)
  const latestYouId = sortedYou.sort(
    (a, b) => Date.parse(b.confirmedAt) - Date.parse(a.confirmedAt),
  )[0]?.id

  const visits: VerifiedVisit[] = events.map((event) => ({
    id: event.id,
    visitedAt: event.confirmedAt,
    visitorLabel: event.isYou ? 'You' : `anon-${event.id}`,
    accuracyMeters: event.accuracyMeters,
    distanceMeters: event.distanceMeters,
    withinRadius: event.distanceMeters <= 100,
    platform: 'iOS',
    communityLabelIds:
      event.isYou && event.id === latestYouId ? [...event.communityLabelIds] : [],
  }))

  return {
    propertyId,
    radiusMeters: 100,
    visits,
    signals: buildSignals(visits),
  }
}

/**
 * Overlay the current user's presence events as "You" rows.
 * Votes attach to the latest You row. Events stay even after the 2-week window ends.
 */
function mergeLiveCommunityLabels(
  propertyId: string,
  seed: VerifiedVisit[],
): VerifiedVisit[] {
  if (typeof localStorage === 'undefined') return seed.map((v) => ({ ...v }))

  const { myVotes } = loadBuyerVoteState(propertyId)
  const events = loadPresenceEvents(propertyId)
  const base = seed.map((v) => ({ ...v, communityLabelIds: [...v.communityLabelIds] }))

  const youVisits: VerifiedVisit[] = events.map((event) => ({
    id: event.id,
    visitedAt: event.confirmedAt,
    visitorLabel: 'You',
    accuracyMeters: event.accuracyMeters ?? 10,
    distanceMeters: event.distanceMeters ?? 0,
    withinRadius: true,
    platform: 'iOS',
    communityLabelIds: [],
  }))

  if (youVisits.length > 0 && myVotes.length > 0) {
    const latestYou = youVisits[youVisits.length - 1]!
    latestYou.communityLabelIds = [...myVotes]
  }

  return [...youVisits, ...base]
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
