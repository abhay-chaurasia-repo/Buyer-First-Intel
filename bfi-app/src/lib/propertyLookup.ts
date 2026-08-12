/**
 * Load a property shell from a searched address.
 * Selected suggestion addresses are sticky — we do not let Census rematch
 * change the house number the buyer tapped.
 */

import type { ResolvedAddress } from '@/data/addressTypes'
import { DEMO_PROPERTY, type MockProperty } from '@/data/mockProperty'
import { isHouseNumberOnlyQuery, resolveAddress, searchAddresses } from '@/lib/addressSearch'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'

const LOOKUP_CACHE_KEY = 'bfi.propertyLookupCache.v3'
const SELECTED_ADDRESS_KEY = 'bfi.selectedAddress.v1'
const RECENT_ADDRESSES_KEY = 'bfi.recentAddressSuggestions.v1'

try {
  sessionStorage.removeItem('bfi.propertyLookupCache')
  sessionStorage.removeItem('bfi.propertyLookupCache.v2')
} catch {
  // ignore
}

export type PropertyLookupStatus = {
  addressMatched: boolean
  factsStatus: 'demo' | 'live' | 'pending'
  sourceLabel: string
  warning?: string
}

export type PropertyLookupResult = {
  property: MockProperty
  resolved: ResolvedAddress | null
  status: PropertyLookupStatus
}

type CacheEntry = {
  query: string
  result: PropertyLookupResult
  savedAt: number
}

type LookupPayload = {
  match?: ResolvedAddress | null
  matches?: ResolvedAddress[]
  property?: Partial<MockProperty> | null
  factsStatus?: 'demo' | 'live' | 'pending'
  attomError?: string | null
  error?: string
}

/** Remember the exact suggestion the buyer tapped before navigation. */
export function rememberSelectedAddress(match: ResolvedAddress) {
  try {
    sessionStorage.setItem(
      SELECTED_ADDRESS_KEY,
      JSON.stringify({ match, savedAt: Date.now() }),
    )
  } catch {
    // ignore
  }
  rememberRecentAddress(match)
}

/** Keep recent picks so typing a house number alone can still surface options. */
export function rememberRecentAddress(match: ResolvedAddress) {
  try {
    const raw = localStorage.getItem(RECENT_ADDRESSES_KEY)
    const parsed = raw ? (JSON.parse(raw) as ResolvedAddress[]) : []
    const list = Array.isArray(parsed) ? parsed : []
    const next = [match, ...list.filter((item) => item.id !== match.id)].slice(0, 24)
    localStorage.setItem(RECENT_ADDRESSES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function recentAddressesMatching(query: string): ResolvedAddress[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  try {
    const raw = localStorage.getItem(RECENT_ADDRESSES_KEY)
    const parsed = raw ? (JSON.parse(raw) as ResolvedAddress[]) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => {
        if (!item?.street || !item?.formatted) return false
        const street = item.street.toLowerCase()
        const formatted = item.formatted.toLowerCase()
        return street.startsWith(trimmed) || formatted.startsWith(trimmed)
      })
      .slice(0, 6)
  } catch {
    return []
  }
}

function consumeSelectedAddress(query: string): ResolvedAddress | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_ADDRESS_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as { match?: ResolvedAddress; savedAt?: number }
    sessionStorage.removeItem(SELECTED_ADDRESS_KEY)
    if (!entry.match) return null
    if (entry.savedAt && Date.now() - entry.savedAt > 5 * 60 * 1000) return null

    const q = query.trim().toLowerCase()
    const formatted = entry.match.formatted.trim().toLowerCase()
    const street = entry.match.street.trim().toLowerCase()
    if (q === formatted || q.startsWith(street) || formatted.startsWith(q.split(',')[0]!.trim())) {
      return entry.match
    }
    return null
  } catch {
    return null
  }
}

function readCache(query: string): PropertyLookupResult | null {
  try {
    const raw = sessionStorage.getItem(LOOKUP_CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (entry.query !== query.trim().toLowerCase()) return null
    if (Date.now() - entry.savedAt > 30 * 60 * 1000) return null
    return entry.result
  } catch {
    return null
  }
}

function writeCache(query: string, result: PropertyLookupResult) {
  try {
    const entry: CacheEntry = {
      query: query.trim().toLowerCase(),
      result,
      savedAt: Date.now(),
    }
    sessionStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore
  }
}

function houseNumber(text: string) {
  return text.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
}

/**
 * If the buyer typed/selected house N, never let a rematch swap it to another number.
 */
export function lockHouseNumberToQuery(query: string, resolved: ResolvedAddress): ResolvedAddress {
  const wanted = houseNumber(query)
  if (!wanted) return resolved
  const got = houseNumber(resolved.street)
  if (!got || got === wanted) return resolved

  const streetRest = resolved.street.replace(/^\d+[A-Za-z]?\s*/, '').trim()
  const street = `${wanted} ${streetRest}`.trim()
  const formatted = resolved.zipCode
    ? `${street}, ${resolved.city}, ${resolved.state} ${resolved.zipCode}`
    : `${street}, ${resolved.city}, ${resolved.state}`
  const idKey = [street, resolved.city, resolved.state, resolved.zipCode]
    .map((p) => p.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
    .join('--')

  return {
    ...resolved,
    id: `addr-${idKey}`.slice(0, 96),
    street,
    formatted,
  }
}

function identityFromAttomExtras(
  base: ResolvedAddress,
  extras?: Partial<MockProperty> | null,
): ResolvedAddress {
  if (!extras?.address) return base
  const wanted = houseNumber(base.street)
  const attomHouse = houseNumber(extras.address)
  // Only adopt ATTOM's street line when the house number still matches.
  if (wanted && attomHouse && wanted !== attomHouse) return base

  const street = extras.address
  const city = extras.city || base.city
  const state = extras.state || base.state
  const zipCode = extras.zipCode || base.zipCode
  const formatted = zipCode ? `${street}, ${city}, ${state} ${zipCode}` : `${street}, ${city}, ${state}`
  const idKey = [street, city, state, zipCode]
    .map((p) => p.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
    .join('--')

  return {
    ...base,
    id: `addr-${idKey}`.slice(0, 96),
    street,
    city,
    state,
    zipCode,
    formatted,
    lat: extras.lat ?? base.lat,
    lng: extras.lng ?? base.lng,
  }
}

export function propertyFromResolvedAddress(
  resolved: ResolvedAddress,
  extras?: Partial<MockProperty>,
): MockProperty {
  return {
    ...DEMO_PROPERTY,
    ...extras,
    id: resolved.id,
    address: resolved.street,
    city: resolved.city,
    state: resolved.state,
    zipCode: resolved.zipCode,
    lat: extras?.lat ?? resolved.lat,
    lng: extras?.lng ?? resolved.lng,
    addressSource: extras?.addressSource ?? resolved.source,
    factsStatus: extras?.factsStatus ?? 'pending',
    starred: false,
    claimedSqft: extras?.claimedSqft,
  }
}

/** Sync fallback used before async lookup finishes (or when geocode fails). */
export function propertyFromUnresolvedQuery(query: string): MockProperty {
  const trimmed = query.trim()
  if (!trimmed) return { ...DEMO_PROPERTY, factsStatus: 'demo', addressSource: 'demo' }

  const street = trimmed.includes(',') ? trimmed.split(',')[0]!.trim() : trimmed
  return {
    ...DEMO_PROPERTY,
    id: `lookup-${encodeURIComponent(trimmed.toLowerCase()).slice(0, 48)}`,
    address: street,
    addressSource: 'unresolved',
    factsStatus: 'pending',
    starred: false,
  }
}

function statusFor(property: MockProperty, warning?: string): PropertyLookupStatus {
  if (property.factsStatus === 'live') {
    return {
      addressMatched: true,
      factsStatus: 'live',
      sourceLabel: 'Live county facts · ATTOM',
      warning,
    }
  }
  return {
    addressMatched: true,
    factsStatus: property.factsStatus ?? 'pending',
    sourceLabel: warning
      ? 'Address matched · county facts unavailable'
      : 'Address matched · county facts pending ATTOM',
    warning,
  }
}

function resultFromPayload(
  query: string,
  payload: LookupPayload,
  preferred?: ResolvedAddress | null,
): PropertyLookupResult | null {
  const base = preferred || payload.match
  if (!base) return null
  const locked = lockHouseNumberToQuery(query, base)
  const withAttom = identityFromAttomExtras(locked, payload.property)
  const finalIdentity = lockHouseNumberToQuery(query, withAttom)
  const factsStatus = payload.factsStatus ?? (payload.property ? 'live' : 'pending')
  const property = propertyFromResolvedAddress(finalIdentity, {
    ...payload.property,
    // Never let vendor payloads overwrite the locked street identity
    address: finalIdentity.street,
    city: finalIdentity.city,
    state: finalIdentity.state,
    zipCode: finalIdentity.zipCode,
    factsStatus,
  })
  return {
    property,
    resolved: finalIdentity,
    status: statusFor(
      property,
      payload.attomError
        ? `ATTOM: ${payload.attomError}. Showing matched address; county facts stay illustrative.`
        : undefined,
    ),
  }
}

async function lookupViaLocalApi(query: string, mode: 'search' | 'resolve') {
  try {
    const res = await fetch('/api/property-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode }),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    return (await res.json()) as LookupPayload
  } catch {
    return null
  }
}

async function lookupViaEdge(query: string, mode: 'search' | 'resolve') {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('property-lookup', {
      method: 'POST',
      body: { query, mode },
    })
    if (error) return null
    return data as LookupPayload
  } catch {
    return null
  }
}

export async function loadPropertyFromQuery(query: string): Promise<PropertyLookupResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      property: { ...DEMO_PROPERTY, factsStatus: 'demo', addressSource: 'demo' },
      resolved: null,
      status: {
        addressMatched: true,
        factsStatus: 'demo',
        sourceLabel: 'Demo property',
      },
    }
  }

  const selected = consumeSelectedAddress(trimmed)

  const cached = readCache(trimmed)
  if (cached && !selected) {
    const locked = cached.resolved ? lockHouseNumberToQuery(trimmed, cached.resolved) : null
    if (locked && cached.resolved && locked.street !== cached.resolved.street) {
      const property = propertyFromResolvedAddress(locked, {
        ...cached.property,
        address: locked.street,
        factsStatus: cached.property.factsStatus,
      })
      return { property, resolved: locked, status: statusFor(property) }
    }
    // Drop stale cache entries that still carry a swapped house number vs the URL.
    if (cached.resolved && houseNumber(trimmed) && houseNumber(cached.resolved.street)) {
      if (houseNumber(trimmed) !== houseNumber(cached.resolved.street)) {
        // fall through to live lookup
      } else {
        return cached
      }
    } else {
      return cached
    }
  }

  // Prefer the exact suggestion the buyer tapped; still try ATTOM enrichment.
  if (selected) {
    const local = await lookupViaLocalApi(selected.formatted, 'resolve')
    if (local && !local.error) {
      const fromLocal = resultFromPayload(trimmed, local, selected)
      if (fromLocal) {
        writeCache(trimmed, fromLocal)
        return fromLocal
      }
    }
    const edge = await lookupViaEdge(selected.formatted, 'resolve')
    if (edge && !edge.error) {
      const fromEdge = resultFromPayload(trimmed, edge, selected)
      if (fromEdge) {
        writeCache(trimmed, fromEdge)
        return fromEdge
      }
    }
    const property = propertyFromResolvedAddress(selected)
    const result: PropertyLookupResult = {
      property,
      resolved: selected,
      status: statusFor(property),
    }
    writeCache(trimmed, result)
    return result
  }

  const local = await lookupViaLocalApi(trimmed, 'resolve')
  if (local && !local.error) {
    const fromLocal = resultFromPayload(trimmed, local)
    if (fromLocal) {
      writeCache(trimmed, fromLocal)
      return fromLocal
    }
  }

  const edge = await lookupViaEdge(trimmed, 'resolve')
  if (edge && !edge.error) {
    const fromEdge = resultFromPayload(trimmed, edge)
    if (fromEdge) {
      writeCache(trimmed, fromEdge)
      return fromEdge
    }
  }

  const resolvedRaw = await resolveAddress(trimmed)
  if (!resolvedRaw) {
    const result: PropertyLookupResult = {
      property: propertyFromUnresolvedQuery(trimmed),
      resolved: null,
      status: {
        addressMatched: false,
        factsStatus: 'pending',
        sourceLabel: 'Address not matched',
        warning:
          'No US address match found. Try a fuller street + city + state. County facts stay illustrative until matched.',
      },
    }
    writeCache(trimmed, result)
    return result
  }

  const resolved = lockHouseNumberToQuery(trimmed, resolvedRaw)
  const property = propertyFromResolvedAddress(resolved)
  const result: PropertyLookupResult = {
    property,
    resolved,
    status: statusFor(property),
  }
  writeCache(trimmed, result)
  return result
}

function dedupeMatches(matches: ResolvedAddress[]) {
  const seen = new Set<string>()
  const out: ResolvedAddress[] = []
  for (const match of matches) {
    if (seen.has(match.id)) continue
    seen.add(match.id)
    out.push(match)
  }
  return out
}

export async function suggestAddresses(query: string) {
  const trimmed = query.trim()
  const recent = recentAddressesMatching(trimmed).map((m) => lockHouseNumberToQuery(trimmed, m))

  // House number alone: free geocoders rarely return homes — surface recents immediately.
  if (isHouseNumberOnlyQuery(trimmed)) {
    return { ok: true as const, matches: recent.slice(0, 6) }
  }

  if (trimmed.length < 3) {
    return { ok: true as const, matches: recent.slice(0, 6) }
  }

  const local = await lookupViaLocalApi(trimmed, 'search')
  if (local?.matches && local.matches.length > 0) {
    return {
      ok: true as const,
      matches: dedupeMatches([
        ...recent,
        ...local.matches.map((m) => lockHouseNumberToQuery(trimmed, m)),
      ]).slice(0, 6),
    }
  }

  const edge = await lookupViaEdge(trimmed, 'search')
  if (edge?.matches && edge.matches.length > 0) {
    return {
      ok: true as const,
      matches: dedupeMatches([
        ...recent,
        ...edge.matches.map((m) => lockHouseNumberToQuery(trimmed, m)),
      ]).slice(0, 6),
    }
  }

  const result = await searchAddresses(trimmed)
  if (!result.ok) {
    if (recent.length > 0) return { ok: true as const, matches: recent.slice(0, 6) }
    return result
  }
  return {
    ok: true as const,
    matches: dedupeMatches([
      ...recent,
      ...result.matches.map((m) => lockHouseNumberToQuery(trimmed, m)),
    ]).slice(0, 6),
  }
}
