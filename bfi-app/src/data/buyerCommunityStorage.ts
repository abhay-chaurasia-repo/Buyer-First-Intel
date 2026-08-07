/** Shared Buyer Community vote / verify persistence for cross-surface reads. */

export const BUYER_VOTES_STORAGE_KEY = 'bfi.buyer-community-votes'
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
    const raw = localStorage.getItem(BUYER_VOTES_STORAGE_KEY)
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
    const raw = localStorage.getItem(BUYER_VOTES_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, BuyerVoteState>) : {}
    all[propertyId] = state
    localStorage.setItem(BUYER_VOTES_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage failures in demo shell
  }
}

export function loadBuyerVerified(propertyId: string): boolean {
  try {
    const raw = localStorage.getItem(BUYER_VERIFIED_STORAGE_KEY)
    if (!raw) return false
    const all = JSON.parse(raw) as Record<string, boolean>
    return Boolean(all[propertyId])
  } catch {
    return false
  }
}

export function persistBuyerVerified(propertyId: string, verified: boolean) {
  try {
    const raw = localStorage.getItem(BUYER_VERIFIED_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    all[propertyId] = verified
    localStorage.setItem(BUYER_VERIFIED_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage failures in demo shell
  }
}
