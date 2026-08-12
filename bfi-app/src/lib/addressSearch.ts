/**
 * US address search / normalize.
 * Primary: Census Bureau Geocoder (no key).
 * Suggestions: Nominatim for partial queries when Census returns nothing.
 * Optional: Supabase Edge Function `property-lookup` when deployed.
 */

import type { AddressSearchResult, ResolvedAddress } from '@/data/addressTypes'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'

const CENSUS_BASE = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'DueDiligenceBuyerApp/1.0 (home-buyer due diligence)'

function titleCaseToken(token: string) {
  if (!token) return token
  if (/^[NSEW]$/i.test(token)) return token.toUpperCase()
  if (/^(NE|NW|SE|SW)$/i.test(token)) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

export function titleCaseStreet(raw: string) {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ')
}

function stableAddressId(parts: {
  street: string
  city: string
  state: string
  zipCode: string
}) {
  const key = [
    parts.street,
    parts.city,
    parts.state,
    parts.zipCode,
  ]
    .map((p) => p.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
    .join('--')
  return `addr-${key}`.slice(0, 96)
}

function buildStreetFromCensusComponents(c: {
  fromAddress?: string
  preDirection?: string
  preType?: string
  streetName?: string
  suffixType?: string
  suffixDirection?: string
}) {
  const bits = [
    c.fromAddress,
    c.preDirection,
    c.preType,
    c.streetName,
    c.suffixType,
    c.suffixDirection,
  ]
    .map((v) => (v || '').trim())
    .filter(Boolean)
  return titleCaseStreet(bits.join(' '))
}

type CensusMatch = {
  matchedAddress?: string
  coordinates?: { x?: number; y?: number }
  addressComponents?: {
    zip?: string
    streetName?: string
    city?: string
    state?: string
    fromAddress?: string
    preDirection?: string
    preType?: string
    suffixType?: string
    suffixDirection?: string
  }
}

function censusMatchToResolved(match: CensusMatch): ResolvedAddress | null {
  const c = match.addressComponents
  const lat = match.coordinates?.y
  const lng = match.coordinates?.x
  if (!c?.city || !c.state || lat == null || lng == null) return null

  const street = buildStreetFromCensusComponents(c)
  const city = titleCaseStreet(c.city)
  const state = c.state.toUpperCase()
  const zipCode = (c.zip || '').trim()
  if (!street) return null

  const formatted = zipCode
    ? `${street}, ${city}, ${state} ${zipCode}`
    : `${street}, ${city}, ${state}`

  return {
    id: stableAddressId({ street, city, state, zipCode }),
    formatted,
    street,
    city,
    state,
    zipCode,
    lat,
    lng,
    source: 'census',
    matchedAddress: match.matchedAddress,
  }
}

async function searchCensus(query: string, limit = 6): Promise<ResolvedAddress[]> {
  const url = new URL(CENSUS_BASE)
  url.searchParams.set('address', query)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Census geocoder failed (${res.status})`)
  const data = (await res.json()) as {
    result?: { addressMatches?: CensusMatch[] }
  }
  const matches = data.result?.addressMatches ?? []
  const resolved: ResolvedAddress[] = []
  for (const match of matches) {
    const item = censusMatchToResolved(match)
    if (item) resolved.push(item)
    if (resolved.length >= limit) break
  }
  return resolved
}

type NominatimHit = {
  lat?: string
  lon?: string
  display_name?: string
  address?: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    hamlet?: string
    state?: string
    postcode?: string
  }
}

const US_STATE_ABBR: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
}

function stateToAbbr(state: string) {
  const trimmed = state.trim()
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return US_STATE_ABBR[trimmed.toLowerCase()] ?? trimmed.toUpperCase().slice(0, 2)
}

function nominatimToResolved(hit: NominatimHit): ResolvedAddress | null {
  const a = hit.address
  const lat = Number(hit.lat)
  const lng = Number(hit.lon)
  if (!a || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const road = a.road
  if (!road || !a.house_number) return null

  const street = titleCaseStreet(`${a.house_number} ${road}`)
  const cityName = a.city || a.town || a.village || a.hamlet
  if (!cityName || !a.state) return null

  const city = titleCaseStreet(cityName)
  const state = stateToAbbr(a.state)
  const zipCode = (a.postcode || '').split('-')[0]!.trim()
  const formatted = zipCode
    ? `${street}, ${city}, ${state} ${zipCode}`
    : `${street}, ${city}, ${state}`

  return {
    id: stableAddressId({ street, city, state, zipCode }),
    formatted,
    street,
    city,
    state,
    zipCode,
    lat,
    lng,
    source: 'nominatim',
    matchedAddress: hit.display_name,
  }
}

async function searchNominatim(query: string, limit = 5): Promise<ResolvedAddress[]> {
  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('countrycodes', 'us')
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })
  if (!res.ok) throw new Error(`Address suggestions failed (${res.status})`)
  const data = (await res.json()) as NominatimHit[]
  if (!Array.isArray(data)) return []

  const resolved: ResolvedAddress[] = []
  for (const hit of data) {
    const item = nominatimToResolved(hit)
    if (item) resolved.push(item)
  }
  return resolved
}

async function searchViaEdge(query: string): Promise<ResolvedAddress[] | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.functions.invoke('property-lookup', {
      method: 'POST',
      body: { query, mode: 'search' },
    })
    if (error) return null
    const payload = data as {
      error?: string
      matches?: ResolvedAddress[]
    } | null
    if (!payload || payload.error || !Array.isArray(payload.matches)) return null
    return payload.matches.map((m) => ({ ...m, source: 'edge' as const }))
  } catch {
    return null
  }
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

/** Suggest / resolve US addresses for the search box. */
export async function searchAddresses(query: string): Promise<AddressSearchResult> {
  const trimmed = query.trim()
  if (trimmed.length < 4) {
    return { ok: true, matches: [] }
  }

  try {
    const edge = await searchViaEdge(trimmed)
    if (edge && edge.length > 0) {
      return { ok: true, matches: dedupeMatches(edge).slice(0, 6) }
    }

    let matches = await searchCensus(trimmed)
    if (matches.length === 0) {
      matches = await searchNominatim(trimmed)
    }
    return { ok: true, matches: dedupeMatches(matches).slice(0, 6) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Address search failed',
      matches: [],
    }
  }
}

/** Best single match for a pasted / submitted address. */
export async function resolveAddress(query: string): Promise<ResolvedAddress | null> {
  const result = await searchAddresses(query)
  if (!result.ok || result.matches.length === 0) return null
  return result.matches[0]!
}
