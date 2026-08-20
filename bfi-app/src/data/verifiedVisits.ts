import type { MockProperty } from './mockProperty'
import {
  loadCommunityObservation,
} from './buyerCommunityStorage'
import {
  parseObservationAnswers,
  type ObservationAnswers,
} from './observationFields'
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
   * This buyer's structured observation, attached only to their latest "You" log.
   * Other buyers' answers stay in property-level tallies, not on the presence list.
   */
  observation: ObservationAnswers | null
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
  const withObservation = visits.filter((v) => v.observation).length

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
      id: 'vs-observation',
      title: withObservation > 0 ? 'Observation on your log' : 'No observation on this log yet',
      detail:
        withObservation > 0
          ? 'Your structured observation is attached to your latest Confirm. Other buyers see tallies in Buyer Community, not this list.'
          : 'Presence is logged on its own. Submit the observation form in Buyer Community after Confirm.',
      tone: withObservation > 0 ? 'positive' : 'neutral',
    },
  ]
}

/**
 * Presence log. Local "You" events always show. Signed-in buyers also see
 * anonymous dated events from the server. No demo visitors.
 */
export function getVerifiedVisitsBundle(property: MockProperty): VerifiedVisitsBundle {
  const visits = mergeLiveObservation(property.id, [])

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
    observation: ObservationAnswers | null
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
    observation:
      event.isYou && event.id === latestYouId
        ? parseObservationAnswers(event.observation)
        : null,
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
 * The observation attaches to the latest You row. Events stay after the 2-week window ends.
 */
function mergeLiveObservation(
  propertyId: string,
  seed: VerifiedVisit[],
): VerifiedVisit[] {
  if (typeof localStorage === 'undefined') return seed.map((v) => ({ ...v }))

  const stored = loadCommunityObservation(propertyId)
  const events = loadPresenceEvents(propertyId)
  const base = seed.map((v) => ({ ...v, observation: v.observation }))

  const youVisits: VerifiedVisit[] = events.map((event) => ({
    id: event.id,
    visitedAt: event.confirmedAt,
    visitorLabel: 'You',
    accuracyMeters: event.accuracyMeters ?? 10,
    distanceMeters: event.distanceMeters ?? 0,
    withinRadius: true,
    platform: 'iOS',
    observation: null,
  }))

  if (youVisits.length > 0 && stored) {
    const latestYou = youVisits[youVisits.length - 1]!
    latestYou.observation = stored.answers
  }

  return [...youVisits, ...base]
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
  const withObservation = bundle.visits.filter((v) => v.observation).length
  return {
    total: bundle.visits.length,
    withObservation,
    withLabels: withObservation,
    distinctDays: uniqueDays(bundle.visits),
    distinctVisitors: uniqueVisitors(bundle.visits),
  }
}
