/**
 * Search quota + subscription entitlement.
 * 10 free unique addresses / month, then $4.99/mo unlimited while subscribed.
 * Local demo entitlement until real billing lands.
 */

import { SEARCH_PLAN } from './authPolicy'
import { readScopedItem, writeScopedItem } from './ownerScope'

export const SEARCH_QUOTA_STORAGE_KEY = 'bfi.search-quota'

export type SearchQuotaState = {
  /** Calendar month `YYYY-MM` for free-search counting */
  monthKey: string
  /** Normalized addresses already counted this month */
  searchedAddresses: string[]
  /** Recurring unlimited-search subscription (demo local) */
  subscriptionActive: boolean
  /** When the demo subscription was started */
  subscribedAt: string | null
}

export type SearchAccess =
  | {
      ok: true
      remaining: number | 'unlimited'
      reason: 'free' | 'subscribed' | 'repeat'
      used: number
    }
  | {
      ok: false
      remaining: 0
      reason: 'quota_exceeded'
      used: number
    }

export function currentMonthKey(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function normalizeSearchAddress(address: string) {
  return address.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function monthLabel(monthKey = currentMonthKey()) {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function emptyState(monthKey = currentMonthKey()): SearchQuotaState {
  return {
    monthKey,
    searchedAddresses: [],
    subscriptionActive: false,
    subscribedAt: null,
  }
}

type LegacyQuotaState = SearchQuotaState & {
  unlimitedMonthKey?: string | null
}

function loadState(ownerId?: string): SearchQuotaState {
  const monthKey = currentMonthKey()
  try {
    const raw = readScopedItem(SEARCH_QUOTA_STORAGE_KEY, ownerId)
    if (!raw) return emptyState(monthKey)
    const parsed = JSON.parse(raw) as LegacyQuotaState
    if (!parsed || typeof parsed !== 'object') return emptyState(monthKey)

    const legacyUnlimited =
      typeof parsed.unlimitedMonthKey === 'string' ? parsed.unlimitedMonthKey : null
    const subscriptionActive =
      Boolean(parsed.subscriptionActive) || legacyUnlimited === monthKey

    const subscribedAt =
      typeof parsed.subscribedAt === 'string'
        ? parsed.subscribedAt
        : subscriptionActive
          ? new Date().toISOString()
          : null

    if (parsed.monthKey !== monthKey) {
      return {
        monthKey,
        searchedAddresses: [],
        subscriptionActive,
        subscribedAt,
      }
    }

    return {
      monthKey,
      searchedAddresses: Array.isArray(parsed.searchedAddresses)
        ? parsed.searchedAddresses.filter((item) => typeof item === 'string')
        : [],
      subscriptionActive,
      subscribedAt,
    }
  } catch {
    return emptyState(monthKey)
  }
}

function persistState(state: SearchQuotaState, ownerId?: string) {
  writeScopedItem(SEARCH_QUOTA_STORAGE_KEY, JSON.stringify(state), ownerId)
}

export function isSearchSubscribed(ownerId?: string) {
  return loadState(ownerId).subscriptionActive
}

export function getSearchQuotaSnapshot(ownerId?: string) {
  const state = loadState(ownerId)
  const subscribed = state.subscriptionActive
  const used = state.searchedAddresses.length
  const freeCap = SEARCH_PLAN.freeSearchesPerMonth
  const remaining = subscribed ? ('unlimited' as const) : Math.max(0, freeCap - used)

  return {
    monthKey: state.monthKey,
    monthLabel: monthLabel(state.monthKey),
    used,
    freeCap,
    remaining,
    subscribed,
    /** @deprecated use subscribed — kept for older UI checks */
    unlimited: subscribed,
    priceLabel: SEARCH_PLAN.priceLabel,
    priceUsd: SEARCH_PLAN.subscriptionPriceUsd,
  }
}

export type SearchQuotaSnapshot = ReturnType<typeof getSearchQuotaSnapshot>

/**
 * Attempt to count a search. Repeating an address already counted this month
 * does not consume another free slot. Subscribers are unlimited.
 */
export function tryConsumeSearch(address: string, ownerId?: string): SearchAccess {
  const normalized = normalizeSearchAddress(address)
  if (!normalized) {
    return { ok: false, remaining: 0, reason: 'quota_exceeded', used: 0 }
  }

  const state = loadState(ownerId)
  const used = state.searchedAddresses.length
  const freeCap = SEARCH_PLAN.freeSearchesPerMonth

  if (state.subscriptionActive) {
    return { ok: true, remaining: 'unlimited', reason: 'subscribed', used }
  }

  if (state.searchedAddresses.includes(normalized)) {
    return {
      ok: true,
      remaining: Math.max(0, freeCap - used),
      reason: 'repeat',
      used,
    }
  }

  if (used >= freeCap) {
    return { ok: false, remaining: 0, reason: 'quota_exceeded', used }
  }

  const next: SearchQuotaState = {
    ...state,
    searchedAddresses: [...state.searchedAddresses, normalized],
  }
  persistState(next, ownerId)
  const nextUsed = next.searchedAddresses.length
  return {
    ok: true,
    remaining: Math.max(0, freeCap - nextUsed),
    reason: 'free',
    used: nextUsed,
  }
}

/** Local stand-in for starting the $4.99/mo search subscription. */
export function activateSearchSubscription(ownerId?: string) {
  const state = loadState(ownerId)
  persistState(
    {
      ...state,
      monthKey: currentMonthKey(),
      subscriptionActive: true,
      subscribedAt: state.subscribedAt ?? new Date().toISOString(),
    },
    ownerId,
  )
}

/** @deprecated use activateSearchSubscription */
export function activateUnlimitedForCurrentMonth(ownerId?: string) {
  activateSearchSubscription(ownerId)
}

export function cancelSearchSubscription(ownerId?: string) {
  const state = loadState(ownerId)
  persistState(
    {
      ...state,
      subscriptionActive: false,
      subscribedAt: null,
    },
    ownerId,
  )
}
