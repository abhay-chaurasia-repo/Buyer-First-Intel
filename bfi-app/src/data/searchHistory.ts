/**
 * Searched-address history for the Search home screen.
 * Built from quota usage (local + Supabase search_usage).
 */

import type { HistoryAddress } from '@/data/mockProperty'
import { loadNotePad } from '@/data/propertyNotesStorage'
import { currentMonthKey, getSearchedAddresses } from '@/data/searchQuota'
import { loadWatchlist } from '@/data/watchlistStorage'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { isSupabaseOwnerId } from '@/lib/searchQuotaApi'

function titleCaseToken(token: string) {
  if (!token) return token
  if (/^[NSEW]$/i.test(token)) return token.toUpperCase()
  if (/^(NE|NW|SE|SW)$/i.test(token)) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

function titleCaseWords(raw: string) {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ')
}

/** Parse a free-form searched address string into a history row. */
export function parseSearchedAddress(raw: string, index = 0): HistoryAddress {
  const trimmed = raw.trim()
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean)
  const street = titleCaseWords(parts[0] || trimmed)

  let city = ''
  let state = ''
  let zipCode = ''

  if (parts.length >= 2) {
    city = titleCaseWords(parts[1]!)
  }
  if (parts.length >= 3) {
    const rest = parts.slice(2).join(' ')
    const match = rest.match(/^([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?/i)
    if (match) {
      state = match[1]!.toUpperCase()
      zipCode = match[2] || ''
    } else {
      city = titleCaseWords([parts[1], parts[2]].filter(Boolean).join(', '))
    }
  }

  const watchlist = loadWatchlist()
  const streetLower = street.toLowerCase()
  const savedItem = watchlist.find(
    (item) =>
      item.address.toLowerCase() === streetLower ||
      `${item.address}, ${item.city}, ${item.state}`.toLowerCase() === trimmed.toLowerCase(),
  )
  const propertyKey = savedItem?.id || `lookup-${encodeURIComponent(trimmed.toLowerCase()).slice(0, 48)}`
  const hasPrivateNotes = Boolean(loadNotePad(propertyKey).trim())

  return {
    id: `hist-${index}-${streetLower.replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    address: street,
    city: city || savedItem?.city || '',
    state: state || savedItem?.state || '',
    zipCode: zipCode || savedItem?.zipCode || '',
    saved: Boolean(savedItem),
    hasPrivateNotes,
    lastViewed: 'This month',
  }
}

export function historyRowsFromAddresses(addresses: string[]): HistoryAddress[] {
  // newest first — local list is append-order
  return [...addresses]
    .reverse()
    .map((address, index) => parseSearchedAddress(address, index))
}

async function fetchRemoteSearchHistory(ownerId?: string): Promise<string[] | null> {
  if (!isSupabaseConfigured() || !isSupabaseOwnerId(ownerId)) return null
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('search_usage')
      .select('address_normalized, searched_at')
      .eq('month_key', currentMonthKey())
      .order('searched_at', { ascending: false })
      .limit(40)

    if (error || !Array.isArray(data)) return null
    return data
      .map((row) => (typeof row.address_normalized === 'string' ? row.address_normalized : ''))
      .filter(Boolean)
  } catch {
    return null
  }
}

/** Load this month’s searched addresses for the Search page. */
export async function loadSearchHistory(ownerId?: string): Promise<HistoryAddress[]> {
  const remote = await fetchRemoteSearchHistory(ownerId)
  if (remote && remote.length > 0) {
    return historyRowsFromAddresses(remote)
  }
  return historyRowsFromAddresses(getSearchedAddresses(ownerId))
}

export function historyFullAddress(item: HistoryAddress) {
  const bits = [item.address]
  if (item.city) bits.push(item.city)
  if (item.state || item.zipCode) {
    bits.push([item.state, item.zipCode].filter(Boolean).join(' '))
  }
  return bits.join(', ')
}
