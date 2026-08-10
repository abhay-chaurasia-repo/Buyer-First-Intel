import type { MockProperty } from './mockProperty'
import { loadBuyerVerified } from './buyerCommunityStorage'

export const WATCHLIST_STORAGE_KEY = 'bfi.watchlist'

export type WatchlistItem = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  bedrooms: number
  bathrooms: number
  sqft: number
  starredAt: string
  /** When the buyer marked (or synced) a completed visit */
  visitedAt?: string | null
  /** Planned on-site visit date/time (local ISO-ish from datetime-local) */
  plannedVisitAt?: string | null
  /** Buyer opted into a local reminder for the planned visit */
  reminderEnabled?: boolean
}

export type VisitPlanStatus = 'visited' | 'planned' | 'unplanned'

export function visitPlanStatus(item: WatchlistItem): VisitPlanStatus {
  if (item.visitedAt) return 'visited'
  if (item.plannedVisitAt) return 'planned'
  return 'unplanned'
}

function normalizeItem(raw: WatchlistItem): WatchlistItem {
  const plannedVisitAt = raw.plannedVisitAt || null
  return {
    ...raw,
    visitedAt: raw.visitedAt || null,
    plannedVisitAt,
    // Plans always have a default reminder unless explicitly disabled
    reminderEnabled: Boolean(plannedVisitAt) && raw.reminderEnabled !== false,
  }
}

export function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WatchlistItem[]
    if (!Array.isArray(parsed)) return []
    return sortWatchlist(parsed.map(normalizeItem))
  } catch {
    return []
  }
}

function persistWatchlist(items: WatchlistItem[]) {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage failures in demo shell
  }
}

/** Planned soonest first, then unplanned, then already visited. */
export function sortWatchlist(items: WatchlistItem[]) {
  return [...items].sort((a, b) => {
    const rank = (item: WatchlistItem) => {
      const status = visitPlanStatus(item)
      if (status === 'planned') return 0
      if (status === 'unplanned') return 1
      return 2
    }
    const rankDiff = rank(a) - rank(b)
    if (rankDiff !== 0) return rankDiff
    if (a.plannedVisitAt && b.plannedVisitAt) {
      return new Date(a.plannedVisitAt).getTime() - new Date(b.plannedVisitAt).getTime()
    }
    return new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime()
  })
}

export function isOnWatchlist(propertyId: string): boolean {
  return loadWatchlist().some((item) => item.id === propertyId)
}

export function addToWatchlist(property: MockProperty): WatchlistItem[] {
  const current = loadWatchlist()
  if (current.some((item) => item.id === property.id)) return current

  const visitedAt = loadBuyerVerified(property.id) ? new Date().toISOString() : null

  const next: WatchlistItem[] = sortWatchlist([
    {
      id: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.sqft,
      starredAt: new Date().toISOString(),
      visitedAt,
      plannedVisitAt: null,
      reminderEnabled: false,
    },
    ...current,
  ])
  persistWatchlist(next)
  return next
}

export function removeFromWatchlist(propertyId: string): WatchlistItem[] {
  const next = loadWatchlist().filter((item) => item.id !== propertyId)
  persistWatchlist(next)
  return next
}

export function updateWatchlistItem(
  propertyId: string,
  patch: Partial<Pick<WatchlistItem, 'visitedAt' | 'plannedVisitAt' | 'reminderEnabled'>>,
): WatchlistItem[] {
  const next = sortWatchlist(
    loadWatchlist().map((item) => (item.id === propertyId ? { ...item, ...patch } : item)),
  )
  persistWatchlist(next)
  return next
}

export function markWatchlistVisited(propertyId: string, visited = true): WatchlistItem[] {
  return updateWatchlistItem(propertyId, {
    visitedAt: visited ? new Date().toISOString() : null,
    // Keep plannedVisitAt so the planned date stays visible after a visit
  })
}

export function setWatchlistPlannedVisit(
  propertyId: string,
  plannedVisitAt: string | null,
): WatchlistItem[] {
  return updateWatchlistItem(propertyId, {
    plannedVisitAt,
    // Planning always carries a default reminder; clearing the plan clears it
    reminderEnabled: Boolean(plannedVisitAt),
  })
}

export function toggleWatchlist(property: MockProperty): { starred: boolean; items: WatchlistItem[] } {
  if (isOnWatchlist(property.id)) {
    return { starred: false, items: removeFromWatchlist(property.id) }
  }
  return { starred: true, items: addToWatchlist(property) }
}

export function propertyPath(
  item: Pick<WatchlistItem, 'address' | 'city' | 'state'>,
  options?: { catchup?: string },
) {
  const full = `${item.address}, ${item.city}, ${item.state}`
  const base = `/property/${encodeURIComponent(full)}`
  if (options?.catchup) return `${base}?catchup=${encodeURIComponent(options.catchup)}`
  return base
}

/** datetime-local value ↔ ISO helpers */
export function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
