import type { MockProperty } from './mockProperty'

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
}

export function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WatchlistItem[]
    return Array.isArray(parsed) ? parsed : []
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

export function isOnWatchlist(propertyId: string): boolean {
  return loadWatchlist().some((item) => item.id === propertyId)
}

export function addToWatchlist(property: MockProperty): WatchlistItem[] {
  const current = loadWatchlist()
  if (current.some((item) => item.id === property.id)) return current

  const next: WatchlistItem[] = [
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
    },
    ...current,
  ]
  persistWatchlist(next)
  return next
}

export function removeFromWatchlist(propertyId: string): WatchlistItem[] {
  const next = loadWatchlist().filter((item) => item.id !== propertyId)
  persistWatchlist(next)
  return next
}

export function toggleWatchlist(property: MockProperty): { starred: boolean; items: WatchlistItem[] } {
  if (isOnWatchlist(property.id)) {
    return { starred: false, items: removeFromWatchlist(property.id) }
  }
  return { starred: true, items: addToWatchlist(property) }
}

export function propertyPath(item: Pick<WatchlistItem, 'address' | 'city' | 'state'>) {
  const full = `${item.address}, ${item.city}, ${item.state}`
  return `/property/${encodeURIComponent(full)}`
}
