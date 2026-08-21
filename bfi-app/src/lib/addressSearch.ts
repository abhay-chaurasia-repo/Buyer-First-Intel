/**
 * US address search / normalize.
 *
 * Browser-safe order:
 * 1) Edge Function / Vite `/api/property-lookup` (Google Places when keyed, else Census)
 * 2) Nominatim / Photon (CORS-friendly fallback)
 * 3) Census Geocoder (no CORS in browsers — only succeeds via same-origin proxy)
 */

import type { AddressSearchResult, ResolvedAddress } from '@/data/addressTypes'
import { addressQueryVariants, parseTypedUsAddress } from '@/lib/expandAddressQuery'
import { invokePropertyLookup } from '@/lib/propertyLookupClient'

const CENSUS_BASE = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const PHOTON_BASE = 'https://photon.komoot.io/api/'
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
  const key = [parts.street, parts.city, parts.state, parts.zipCode]
    .map((p) => p.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
    .join('--')
  return `addr-${key}`.slice(0, 96)
}

function houseNumberFromMatchedAddress(matchedAddress?: string) {
  if (!matchedAddress) return undefined
  const streetLine = matchedAddress.split(',')[0]?.trim() ?? ''
  const match = streetLine.match(/^(\d+[A-Za-z]?)\b/)
  return match?.[1]
}

function buildStreetFromCensusComponents(
  c: {
    fromAddress?: string
    preDirection?: string
    preType?: string
    streetName?: string
    suffixType?: string
    suffixDirection?: string
  },
  matchedAddress?: string,
) {
  // Census fromAddress/toAddress are the TIGER range ends — NOT the matched house number.
  const house = houseNumberFromMatchedAddress(matchedAddress) || c.fromAddress
  const bits = [house, c.preDirection, c.preType, c.streetName, c.suffixType, c.suffixDirection]
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

  const street = buildStreetFromCensusComponents(c, match.matchedAddress)
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
  const queryHouse = query.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
  const resolved: ResolvedAddress[] = []
  for (const match of matches) {
    const item = censusMatchToResolved(match)
    if (!item) continue
    resolved.push(queryHouse ? lockStreetHouse(item, queryHouse) : item)
    if (resolved.length >= limit) break
  }
  return resolved
}

function lockStreetHouse(resolved: ResolvedAddress, wanted: string): ResolvedAddress {
  const got = resolved.street.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
  if (!got || got === wanted) return resolved
  const streetRest = resolved.street.replace(/^\d+[A-Za-z]?\s*/, '').trim()
  const street = `${wanted} ${streetRest}`.trim()
  const formatted = resolved.zipCode
    ? `${street}, ${resolved.city}, ${resolved.state} ${resolved.zipCode}`
    : `${street}, ${resolved.city}, ${resolved.state}`
  return {
    ...resolved,
    id: stableAddressId({
      street,
      city: resolved.city,
      state: resolved.state,
      zipCode: resolved.zipCode,
    }),
    street,
    formatted,
  }
}

/** Census has no browser CORS — ignore network failures and fall through. */
async function searchCensusSafe(query: string, limit = 6): Promise<ResolvedAddress[]> {
  try {
    return await searchCensus(query, limit)
  } catch {
    return []
  }
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
    municipality?: string
    suburb?: string
    neighbourhood?: string
    county?: string
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
  // Many US OSM hits put the place in neighbourhood/suburb/county, not city.
  const cityName =
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.municipality ||
    a.suburb ||
    a.neighbourhood ||
    a.county
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

async function searchNominatimSafe(query: string, limit = 5): Promise<ResolvedAddress[]> {
  try {
    return await searchNominatim(query, limit)
  } catch {
    return []
  }
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    housenumber?: string
    street?: string
    name?: string
    city?: string
    town?: string
    village?: string
    locality?: string
    district?: string
    county?: string
    state?: string
    postcode?: string
    countrycode?: string
    type?: string
  }
}

function photonToResolved(feature: PhotonFeature): ResolvedAddress | null {
  const p = feature.properties
  const coords = feature.geometry?.coordinates
  if (!p || !coords || p.countrycode?.toLowerCase() !== 'us') return null

  const house = p.housenumber
  const road = p.street || (p.type === 'house' ? p.name : undefined)
  if (!house || !road) return null

  const cityName = p.city || p.town || p.village || p.locality || p.district || p.county
  if (!cityName || !p.state) return null

  const street = titleCaseStreet(`${house} ${road}`)
  const city = titleCaseStreet(cityName)
  const state = stateToAbbr(p.state)
  const zipCode = (p.postcode || '').split('-')[0]!.trim()
  const lat = coords[1]
  const lng = coords[0]
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

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
    matchedAddress: formatted,
  }
}

async function searchPhotonSafe(query: string, limit = 5): Promise<ResolvedAddress[]> {
  try {
    const url = new URL(PHOTON_BASE)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('lang', 'en')
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as { features?: PhotonFeature[] }
    const resolved: ResolvedAddress[] = []
    for (const feature of data.features ?? []) {
      const item = photonToResolved(feature)
      if (item) resolved.push(item)
    }
    return resolved
  } catch {
    return []
  }
}

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL(NOMINATIM_BASE)
    url.searchParams.set('q', `${city}, ${state}, USA`)
    url.searchParams.set('countrycodes', 'us')
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>
    const lat = Number(data[0]?.lat)
    const lng = Number(data[0]?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

export async function typedAddressMatch(query: string): Promise<ResolvedAddress | null> {
  const typed = parseTypedUsAddress(query)
  if (!typed) return null
  const pin = await geocodeCity(typed.city, typed.state)
  return {
    id: stableAddressId(typed),
    formatted: typed.formatted,
    street: typed.street,
    city: typed.city,
    state: typed.state,
    zipCode: typed.zipCode,
    lat: pin?.lat ?? 0,
    lng: pin?.lng ?? 0,
    source: 'typed',
    matchedAddress: typed.formatted,
  }
}

async function searchViaEdge(query: string): Promise<ResolvedAddress[] | null> {
  try {
    const payload = await invokePropertyLookup({ query, mode: 'search' })
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

function friendlySearchError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Address search failed'
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Could not reach the address service. Check your connection and try again with city and state.'
  }
  return message
}

/** True when the buyer has only typed a house number so far. */
export function isHouseNumberOnlyQuery(query: string) {
  return /^\d+[A-Za-z]?\s*$/i.test(query.trim())
}

/** Suggest / resolve US addresses for the search box. */
export async function searchAddresses(query: string): Promise<AddressSearchResult> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return { ok: true, matches: [] }
  }

  try {
    for (const variant of addressQueryVariants(trimmed)) {
      const edge = await searchViaEdge(variant)
      if (edge && edge.length > 0) {
        return { ok: true, matches: dedupeMatches(edge).slice(0, 6) }
      }
    }

    // Photon first — better partial-street autocomplete than Nominatim.
    // Census has no browser CORS headers, so keep it last / safe.
    let matches: ResolvedAddress[] = []
    for (const variant of addressQueryVariants(trimmed)) {
      matches = await searchPhotonSafe(variant, 8)
      if (matches.length === 0) matches = await searchNominatimSafe(variant, 8)
      if (matches.length === 0) matches = await searchCensusSafe(variant)
      if (matches.length > 0) break
    }

    const typed = matches.length === 0 ? await typedAddressMatch(trimmed) : null
    return {
      ok: true,
      matches: dedupeMatches(typed ? [typed, ...matches] : matches).slice(0, 6),
    }
  } catch (err) {
    return {
      ok: false,
      error: friendlySearchError(err),
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
