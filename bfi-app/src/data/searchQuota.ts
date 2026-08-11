/**
 * Monthly search quota — 10 free unique addresses, then $4.99 unlimited
 * for the rest of the calendar month. Local entitlement until payments land.
 */

import { SEARCH_PLAN } from './authPolicy'
import { readScopedItem, writeScopedItem } from './ownerScope'

export const SEARCH_QUOTA_STORAGE_KEY = 'bfi.search-quota'

export type SearchQuotaState = {
  /** Calendar month `YYYY-MM` for free-search counting */
  monthKey: string
  /** Normalized addresses already counted this month */
  searchedAddresses: string[]
  /** If set to current month, unlimited is active for that month */
  unlimitedMonthKey: string | null
}

export type SearchAccess =
  | {
      ok: true
      remaining: number | 'unlimited'
      reason: 'free' | 'unlimited' | 'repeat'
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
    unlimitedMonthKey: null,
  }
}

function loadState(ownerId?: string): SearchQuotaState {
  const monthKey = currentMonthKey()
  try {
    const raw = readScopedItem(SEARCH_QUOTA_STORAGE_KEY, ownerId)
    if (!raw) return emptyState(monthKey)
    const parsed = JSON.parse(raw) as SearchQuotaState
    if (!parsed || typeof parsed !== 'object') return emptyState(monthKey)

    const unlimitedMonthKey =
      typeof parsed.unlimitedMonthKey === 'string' ? parsed.unlimitedMonthKey : null

    // Roll free-search counter into the new month; keep unlimited only if still this month
    if (parsed.monthKey !== monthKey) {
      return {
        monthKey,
        searchedAddresses: [],
        unlimitedMonthKey: unlimitedMonthKey === monthKey ? unlimitedMonthKey : null,
      }
    }

    return {
      monthKey,
      searchedAddresses: Array.isArray(parsed.searchedAddresses)
        ? parsed.searchedAddresses.filter((item) => typeof item === 'string')
        : [],
      unlimitedMonthKey,
    }
  } catch {
    return emptyState(monthKey)
  }
}

function persistState(state: SearchQuotaState, ownerId?: string) {
  writeScopedItem(SEARCH_QUOTA_STORAGE_KEY, JSON.stringify(state), ownerId)
}

export function isUnlimitedActive(ownerId?: string) {
  const state = loadState(ownerId)
  return state.unlimitedMonthKey === currentMonthKey()
}

export function getSearchQuotaSnapshot(ownerId?: string) {
  const state = loadState(ownerId)
  const unlimited = state.unlimitedMonthKey === state.monthKey
  const used = state.searchedAddresses.length
  const freeCap = SEARCH_PLAN.freeSearchesPerMonth
  const remaining = unlimited ? ('unlimited' as const) : Math.max(0, freeCap - used)

  return {
    monthKey: state.monthKey,
    monthLabel: monthLabel(state.monthKey),
    used,
    freeCap,
    remaining,
    unlimited,
    priceLabel: SEARCH_PLAN.currencyLabel,
    priceUsd: SEARCH_PLAN.unlimitedPriceUsd,
  }
}

export type SearchQuotaSnapshot = ReturnType<typeof getSearchQuotaSnapshot>

/**
 * Attempt to count a search. Repeating an address already counted this month
 * does not consume another free slot.
 */
export function tryConsumeSearch(address: string, ownerId?: string): SearchAccess {
  const normalized = normalizeSearchAddress(address)
  if (!normalized) {
    return { ok: false, remaining: 0, reason: 'quota_exceeded', used: 0 }
  }

  const state = loadState(ownerId)
  const used = state.searchedAddresses.length
  const freeCap = SEARCH_PLAN.freeSearchesPerMonth

  if (state.unlimitedMonthKey === state.monthKey) {
    return { ok: true, remaining: 'unlimited', reason: 'unlimited', used }
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

/** Local stand-in for a successful $4.99 monthly unlock. */
export function activateUnlimitedForCurrentMonth(ownerId?: string) {
  const state = loadState(ownerId)
  const monthKey = currentMonthKey()
  persistState(
    {
      ...state,
      monthKey,
      unlimitedMonthKey: monthKey,
    },
    ownerId,
  )
}
