import type { MockProperty } from './mockProperty'
import { loadBuyerVerified } from './buyerCommunityStorage'
import { readScopedItem, writeScopedItem } from './ownerScope'

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

export function watchlistAddressKey(parts: { address: string; city?: string; state?: string }) {
  return [parts.address, parts.city, parts.state]
    .map((part) => (part || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
}

export function findWatchlistMatch(property: {
  id: string
  address: string
  city: string
  state: string
}): WatchlistItem | undefined {
  const items = loadWatchlist()
  const byId = items.find((item) => item.id === property.id)
  if (byId) return byId
  const key = watchlistAddressKey(property)
  if (!key) return undefined
  return items.find((item) => watchlistAddressKey(item) === key)
}

export function isPropertyOnWatchlist(property: {
  id: string
  address: string
  city: string
  state: string
}) {
  return Boolean(findWatchlistMatch(property))
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
    const raw = readScopedItem(WATCHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WatchlistItem[]
    if (!Array.isArray(parsed)) return []
    return sortWatchlist(parsed.map(normalizeItem))
  } catch {
    return []
  }
}

function persistWatchlist(items: WatchlistItem[]) {
  writeScopedItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items))
  void import('@/lib/diligenceSync')
    .then((mod) => mod.syncWatchlistAfterLocalChange(items))
    .catch(() => {
      // ignore sync failures in demo / offline
    })
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
  const existing = findWatchlistMatch(property)
  if (existing) {
    return alignWatchlistWithProperty(property)
  }

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

/** Point a saved home at the live property id after address lookup. */
export function alignWatchlistWithProperty(property: MockProperty): WatchlistItem[] {
  const match = findWatchlistMatch(property)
  if (!match) return loadWatchlist()
  const next = loadWatchlist().map((item) => {
    if (item.id !== match.id) return item
    return {
      ...item,
      id: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode || item.zipCode,
      bedrooms: property.bedrooms || item.bedrooms,
      bathrooms: property.bathrooms || item.bathrooms,
      sqft: property.sqft || item.sqft,
    }
  })
  persistWatchlist(sortWatchlist(next))
  return next
}

/** GPS Verify saves the home to Homes in Diligence and marks it visited. */
export function recordWatchlistVisitFromVerify(property: MockProperty): WatchlistItem[] {
  if (!findWatchlistMatch(property)) {
    addToWatchlist(property)
  } else {
    alignWatchlistWithProperty(property)
  }
  const match = findWatchlistMatch(property)
  if (!match) return loadWatchlist()
  if (match.visitedAt) return loadWatchlist()
  return markWatchlistVisited(match.id, true)
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
  const match = findWatchlistMatch(property)
  if (match) {
    return { starred: false, items: removeFromWatchlist(match.id) }
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
