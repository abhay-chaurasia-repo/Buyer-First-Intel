/** Shared Buyer Community vote persistence. On-site unlock is the 2-week contribution window. */

import { loadGpsVerified, persistGpsVerified, readScopedItem, writeScopedItem } from './ownerScope'

export const BUYER_VOTES_STORAGE_KEY = 'bfi.buyer-community-votes.v2'
/** @deprecated Presence events live in `bfi.presenceEvents.*`. Kept for owner-scope migration lists. */
export const BUYER_VERIFIED_STORAGE_KEY = 'bfi.buyer-community-verified'

export type BuyerVoteState = {
  myVotes: string[]
  localBoosts: Record<string, number>
}

export function emptyBuyerVoteState(): BuyerVoteState {
  return { myVotes: [], localBoosts: {} }
}

export function loadBuyerVoteState(propertyId: string): BuyerVoteState {
  try {
    const raw = readScopedItem(BUYER_VOTES_STORAGE_KEY)
    if (!raw) return emptyBuyerVoteState()
    const all = JSON.parse(raw) as Record<string, BuyerVoteState>
    const entry = all[propertyId]
    if (!entry || !Array.isArray(entry.myVotes)) return emptyBuyerVoteState()
    return {
      myVotes: entry.myVotes,
      localBoosts: entry.localBoosts ?? {},
    }
  } catch {
    return emptyBuyerVoteState()
  }
}

export function persistBuyerVoteState(propertyId: string, state: BuyerVoteState) {
  try {
    const raw = readScopedItem(BUYER_VOTES_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, BuyerVoteState>) : {}
    all[propertyId] = state
    writeScopedItem(BUYER_VOTES_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage failures in demo shell
  }
}

/** True while the 2-week on-site contribution window is open. */
export function loadBuyerVerified(propertyId: string): boolean {
  return loadGpsVerified(propertyId)
}

/** Prefer `appendPresenceEvent` from the property Confirm control. Kept for call-site compatibility. */
export function persistBuyerVerified(propertyId: string, verified: boolean) {
  persistGpsVerified(propertyId, verified)
}
