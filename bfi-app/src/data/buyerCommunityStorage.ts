/** Local cache of this buyer's on-site observation. Contribution window is GPS-gated. */

import { loadGpsVerified, persistGpsVerified, readScopedItem, writeScopedItem } from './ownerScope'
import {
  emptyObservation,
  parseObservationAnswers,
  type ObservationAnswers,
} from './observationFields'

export const COMMUNITY_OBSERVATION_STORAGE_KEY = 'bfi.community-observations.v1'
/** @deprecated Replaced by COMMUNITY_OBSERVATION_STORAGE_KEY. Kept for owner-scope migration lists. */
export const BUYER_VOTES_STORAGE_KEY = 'bfi.buyer-community-votes.v2'
/** @deprecated Presence events live in `bfi.presenceEvents.*`. Kept for owner-scope migration lists. */
export const BUYER_VERIFIED_STORAGE_KEY = 'bfi.buyer-community-verified'

export type StoredObservation = {
  answers: ObservationAnswers
  submittedAt: string
}

type ObservationStore = Record<string, StoredObservation>

function readStore(): ObservationStore {
  try {
    const raw = readScopedItem(COMMUNITY_OBSERVATION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ObservationStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: ObservationStore) {
  writeScopedItem(COMMUNITY_OBSERVATION_STORAGE_KEY, JSON.stringify(store))
}

export function loadCommunityObservation(propertyId: string): StoredObservation | null {
  const entry = readStore()[propertyId]
  if (!entry || typeof entry !== 'object') return null
  const answers = parseObservationAnswers(entry.answers)
  if (!answers || typeof entry.submittedAt !== 'string') return null
  return { answers, submittedAt: entry.submittedAt }
}

export function persistCommunityObservation(propertyId: string, observation: StoredObservation) {
  const store = readStore()
  store[propertyId] = observation
  writeStore(store)
}

export function hasCommunityObservation(propertyId: string) {
  return loadCommunityObservation(propertyId) != null
}

export function defaultObservationDraft(propertyId: string): ObservationAnswers {
  return loadCommunityObservation(propertyId)?.answers ?? emptyObservation()
}

/** True while the 2-week on-site contribution window is open. */
export function loadBuyerVerified(propertyId: string): boolean {
  return loadGpsVerified(propertyId)
}

/** Prefer `appendPresenceEvent` from the property Confirm control. Kept for call-site compatibility. */
export function persistBuyerVerified(propertyId: string, verified: boolean) {
  persistGpsVerified(propertyId, verified)
}
