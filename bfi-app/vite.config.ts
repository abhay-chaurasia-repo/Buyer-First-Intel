import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

type ResolvedAddress = {
  id: string
  formatted: string
  street: string
  city: string
  state: string
  zipCode: string
  lat: number
  lng: number
  source: 'census' | 'edge' | 'google'
  matchedAddress?: string
  placeId?: string
}

function titleCaseToken(token: string) {
  if (!token) return token
  if (/^[NSEW]$/i.test(token)) return token.toUpperCase()
  if (/^(NE|NW|SE|SW)$/i.test(token)) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

function titleCaseStreet(raw: string) {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ')
}

function parseGradeToken(raw?: unknown) {
  if (raw == null) return null
  const t = String(raw).trim().toUpperCase()
  if (!t) return null
  if (t === 'PK' || t === 'PREK' || t === 'PRE-K' || t === 'KG' || t === 'K') return 0
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

function inferSchoolLevel(gradeLow?: string, gradeHigh?: string) {
  const low = parseGradeToken(gradeLow)
  const high = parseGradeToken(gradeHigh)
  if (low == null && high == null) return 'other'
  const lo = low ?? high ?? 0
  const hi = high ?? low ?? lo
  if (hi <= 5) return 'elementary'
  if (lo >= 9) return 'high'
  if (lo >= 6 && hi <= 8) return 'middle'
  if (lo <= 5) return 'elementary'
  if (hi >= 9) return 'high'
  return 'middle'
}

function isPublishedAssignedSchool(name: string, geoIdV4?: string) {
  const n = name.toLowerCase()
  if (!n || n.includes('unassigned')) return false
  if (geoIdV4 && /^G\d/i.test(geoIdV4)) return false
  return true
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

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function moneyLabel(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return undefined
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

async function searchCensus(query: string): Promise<ResolvedAddress[]> {
  const censusUrl = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
  censusUrl.searchParams.set('address', query)
  censusUrl.searchParams.set('benchmark', 'Public_AR_Current')
  censusUrl.searchParams.set('format', 'json')
  const censusRes = await fetch(censusUrl)
  const censusJson = (await censusRes.json()) as {
    result?: {
      addressMatches?: Array<{
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
      }>
    }
  }

  const queryHouse = query.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
  const matches: ResolvedAddress[] = []
  for (const match of censusJson.result?.addressMatches ?? []) {
    const c = match.addressComponents
    const lat = match.coordinates?.y
    const lng = match.coordinates?.x
    if (!c?.city || !c.state || lat == null || lng == null) continue
    // fromAddress/toAddress are TIGER range ends — parse house from matchedAddress,
    // then prefer the house number the buyer actually typed/selected.
    const house =
      queryHouse ||
      (match.matchedAddress || '').split(',')[0]?.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1] ||
      c.fromAddress
    const streetBits = [
      house,
      c.preDirection,
      c.preType,
      c.streetName,
      c.suffixType,
      c.suffixDirection,
    ]
      .map((v) => (v || '').trim())
      .filter(Boolean)
    const street = titleCaseStreet(streetBits.join(' '))
    if (!street) continue
    const city = titleCaseStreet(c.city)
    const state = c.state.toUpperCase()
    const zipCode = (c.zip || '').trim()
    const formatted = zipCode
      ? `${street}, ${city}, ${state} ${zipCode}`
      : `${street}, ${city}, ${state}`
    matches.push({
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
    })
    if (matches.length >= 6) break
  }
  return matches
}

type GoogleAddressComponent = {
  longText?: string
  shortText?: string
  types?: string[]
}

function componentByType(components: GoogleAddressComponent[], type: string) {
  return components.find((c) => Array.isArray(c.types) && c.types.includes(type))
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
  'district of columbia': 'DC',
}

function normalizeUsState(raw: string): string {
  const trimmed = raw.trim()
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  return US_STATE_ABBR[trimmed.toLowerCase()] || ''
}

function parseFormattedUsAddress(formatted?: string): {
  street: string
  city: string
  state: string
  zipCode: string
} | null {
  if (!formatted) return null
  const parts = formatted
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^(USA|United States)$/i.test(part))
  if (parts.length < 3) return null
  const street = parts[0]!
  const city = parts[1]!
  const stateZip = parts[2]!.match(/^(.+?)(?:\s+(\d{5})(?:-\d{4})?)?$/)
  if (!/^\d+[A-Za-z]?\s+\S+/.test(street) || !city || !stateZip) return null
  const state = normalizeUsState(stateZip[1]!)
  if (!state) return null
  return {
    street: titleCaseStreet(street),
    city: titleCaseStreet(city),
    state,
    zipCode: stateZip[2] || '',
  }
}

function googlePlaceToResolved(
  placeId: string,
  place: {
    formattedAddress?: string
    addressComponents?: GoogleAddressComponent[]
    location?: { latitude?: number; longitude?: number }
  },
): ResolvedAddress | null {
  const components = place.addressComponents || []
  const parsed = parseFormattedUsAddress(place.formattedAddress)
  const streetNumber = componentByType(components, 'street_number')?.longText || ''
  const route = componentByType(components, 'route')?.longText || ''
  const street =
    titleCaseStreet([streetNumber, route].filter(Boolean).join(' ')) || parsed?.street || ''
  if (!street) return null

  const city = titleCaseStreet(
    componentByType(components, 'locality')?.longText ||
      componentByType(components, 'sublocality')?.longText ||
      componentByType(components, 'sublocality_level_1')?.longText ||
      componentByType(components, 'neighborhood')?.longText ||
      componentByType(components, 'administrative_area_level_3')?.longText ||
      parsed?.city ||
      '',
  )
  const state = normalizeUsState(
    componentByType(components, 'administrative_area_level_1')?.shortText ||
      componentByType(components, 'administrative_area_level_1')?.longText ||
      parsed?.state ||
      '',
  )
  const zipCode = (
    componentByType(components, 'postal_code')?.longText ||
    parsed?.zipCode ||
    ''
  ).trim()
  if (!city || !state) return null

  const lat = num(place.location?.latitude) ?? 0
  const lng = num(place.location?.longitude) ?? 0
  const formatted = zipCode ? `${street}, ${city}, ${state} ${zipCode}` : `${street}, ${city}, ${state}`

  return {
    id: stableAddressId({ street, city, state, zipCode }),
    formatted,
    street,
    city,
    state,
    zipCode,
    lat,
    lng,
    source: 'google',
    matchedAddress: place.formattedAddress || formatted,
    placeId,
  }
}

function googleHttpError(status: number, body: string, api: string) {
  if (status === 403) {
    return `${api} HTTP 403 — enable Places API (New), Geocoding, and Address Validation. Do not restrict this server key to websites.`
  }
  return `${api} HTTP ${status}${body ? `: ${body.slice(0, 120)}` : ''}`
}

/** Places API (New): Autocomplete + Place Details for US address suggestions. */
async function searchGooglePlaces(
  query: string,
  apiKey: string,
): Promise<{ matches: ResolvedAddress[]; error?: string }> {
  const autoRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text',
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ['US'],
      regionCode: 'US',
      languageCode: 'en',
      locationBias: {
        rectangle: {
          low: { latitude: 24.2, longitude: -125.0 },
          high: { latitude: 49.6, longitude: -66.5 },
        },
      },
    }),
  })
  if (!autoRes.ok) {
    const body = await autoRes.text().catch(() => '')
    return { matches: [], error: googleHttpError(autoRes.status, body, 'Places Autocomplete') }
  }
  const autoJson = (await autoRes.json().catch(() => null)) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string
        place?: string
      }
    }>
  } | null

  const placeIds: string[] = []
  for (const suggestion of autoJson?.suggestions || []) {
    const id =
      suggestion.placePrediction?.placeId ||
      suggestion.placePrediction?.place?.replace(/^places\//, '')
    if (!id || placeIds.includes(id)) continue
    placeIds.push(id)
    if (placeIds.length >= 5) break
  }
  if (placeIds.length === 0) return { matches: [] }

  const details = await Promise.all(
    placeIds.map(async (placeId) => {
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
      try {
        const res = await fetch(url, {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
          },
        })
        if (!res.ok) return null
        const place = (await res.json().catch(() => null)) as {
          formattedAddress?: string
          addressComponents?: GoogleAddressComponent[]
          location?: { latitude?: number; longitude?: number }
        } | null
        if (!place) return null
        return googlePlaceToResolved(placeId, place)
      } catch {
        return null
      }
    }),
  )

  return { matches: details.filter(Boolean) as ResolvedAddress[] }
}

async function searchGoogleGeocode(
  query: string,
  apiKey: string,
): Promise<{ matches: ResolvedAddress[]; error?: string }> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', query)
  url.searchParams.set('components', 'country:US')
  url.searchParams.set('key', apiKey)
  const res = await fetch(url.toString())
  const json = (await res.json().catch(() => null)) as {
    status?: string
    error_message?: string
    results?: Array<{
      formatted_address?: string
      address_components?: Array<{
        long_name?: string
        short_name?: string
        types?: string[]
      }>
      geometry?: { location?: { lat?: number; lng?: number } }
    }>
  } | null
  if (!res.ok) {
    return { matches: [], error: googleHttpError(res.status, JSON.stringify(json || {}), 'Geocoding') }
  }
  if (json?.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    return {
      matches: [],
      error: `Geocoding ${json.status}${json.error_message ? `: ${json.error_message}` : ''}`,
    }
  }
  const matches: ResolvedAddress[] = []
  for (const result of json?.results || []) {
    const components = (result.address_components || []).map((c) => ({
      longText: c.long_name,
      shortText: c.short_name,
      types: c.types,
    }))
    const resolved = googlePlaceToResolved('geocode', {
      formattedAddress: result.formatted_address,
      addressComponents: components,
      location: {
        latitude: result.geometry?.location?.lat,
        longitude: result.geometry?.location?.lng,
      },
    })
    if (resolved) matches.push(resolved)
    if (matches.length >= 5) break
  }
  return { matches }
}

async function searchGoogleAddressValidation(
  query: string,
  apiKey: string,
): Promise<{ matches: ResolvedAddress[]; error?: string }> {
  const res = await fetch(
    `https://addressvalidation.googleapis.com/v1:validateAddress?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: {
          regionCode: 'US',
          addressLines: [query],
        },
      }),
    },
  )
  const json = (await res.json().catch(() => null)) as {
    result?: {
      address?: {
        formattedAddress?: string
        addressComponents?: Array<{
          componentType?: string
          componentName?: { text?: string }
        }>
      }
      geocode?: { location?: { latitude?: number; longitude?: number } }
    }
  } | null
  if (!res.ok) {
    return {
      matches: [],
      error: googleHttpError(res.status, JSON.stringify(json || {}), 'Address Validation'),
    }
  }
  const address = json?.result?.address
  const geocode = json?.result?.geocode
  const components = (address?.addressComponents || []).map((c) => ({
    longText: c.componentName?.text,
    shortText: c.componentName?.text,
    types: c.componentType ? [c.componentType] : [],
  }))
  const resolved = googlePlaceToResolved('address-validation', {
    formattedAddress: address?.formattedAddress,
    addressComponents: components,
    location: {
      latitude: geocode?.location?.latitude,
      longitude: geocode?.location?.longitude,
    },
  })
  return { matches: resolved ? [resolved] : [] }
}

async function searchGoogleAddresses(
  query: string,
  apiKey: string,
): Promise<{ matches: ResolvedAddress[]; error?: string }> {
  const places = await searchGooglePlaces(query, apiKey)
  if (places.matches.length > 0) return places

  const geocode = await searchGoogleGeocode(query, apiKey)
  if (geocode.matches.length > 0) return geocode

  const validated = await searchGoogleAddressValidation(query, apiKey)
  if (validated.matches.length > 0) return validated

  return {
    matches: [],
    error: places.error || geocode.error || validated.error,
  }
}

const STREET_TOKEN_EXPAND: Record<string, string> = {
  pk: 'Park',
  pkwy: 'Parkway',
  hwy: 'Hwy',
  blvd: 'Blvd',
  ave: 'Ave',
  av: 'Ave',
  ln: 'Ln',
  ct: 'Ct',
  cir: 'Cir',
  ter: 'Ter',
  terr: 'Ter',
  pl: 'Pl',
  rd: 'Rd',
  trl: 'Trl',
  cv: 'Cv',
  xing: 'Crossing',
}

function expandStreetLine(street: string): string {
  return street
    .trim()
    .split(/\s+/)
    .map((token, index) => {
      if (index === 0 && /^\d/.test(token)) return token
      const key = token.toLowerCase().replace(/\./g, '')
      return STREET_TOKEN_EXPAND[key] || token
    })
    .join(' ')
}

function expandAddressQuery(query: string): string {
  const parts = query.split(',')
  const street = expandStreetLine(parts[0] || '')
  const rest = parts.slice(1).map((part) => part.trim())
  return [street, ...rest].filter(Boolean).join(', ')
}

function addressQueryVariants(query: string): string[] {
  const trimmed = query.trim()
  const expanded = expandAddressQuery(trimmed)
  return expanded === trimmed ? [trimmed] : [trimmed, expanded]
}

function splitAddressQuery(query: string): { address1: string; address2: string } | null {
  const expanded = expandAddressQuery(query)
  const parts = expanded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  const address1 = parts[0]!
  if (!/^\d/.test(address1)) return null
  return { address1, address2: parts.slice(1).join(', ') }
}

function attomHitToResolved(attom: Record<string, unknown>): ResolvedAddress | null {
  const address = (attom.address || {}) as Record<string, unknown>
  const location = (attom.location || {}) as Record<string, unknown>
  const street =
    typeof address.line1 === 'string' && address.line1.trim()
      ? titleCaseStreet(address.line1)
      : ''
  const city =
    typeof address.locality === 'string' && address.locality.trim()
      ? titleCaseStreet(address.locality)
      : ''
  const state =
    typeof address.countrySubd === 'string' && address.countrySubd.trim()
      ? String(address.countrySubd).toUpperCase().slice(0, 2)
      : ''
  const zipCode =
    typeof address.postal1 === 'string' ? String(address.postal1).split('-')[0]!.trim() : ''
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  if (!street || !city || !state || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const formatted = zipCode ? `${street}, ${city}, ${state} ${zipCode}` : `${street}, ${city}, ${state}`
  return {
    id: stableAddressId({ street, city, state, zipCode }),
    formatted,
    street,
    city,
    state,
    zipCode,
    lat,
    lng,
    source: 'edge',
    matchedAddress: typeof address.oneLine === 'string' ? address.oneLine : formatted,
  }
}

async function searchAttomAddress(
  query: string,
  attomApiKey: string | undefined,
): Promise<ResolvedAddress[]> {
  const parsed = splitAddressQuery(query)
  if (!attomApiKey || !parsed) return []
  const address1 = parsed.address1
  const address2 = parsed.address2

  async function load(packagePath: string) {
    const url = new URL(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/${packagePath}`)
    url.searchParams.set('address1', address1)
    url.searchParams.set('address2', address2)
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json', apikey: attomApiKey },
      })
      const raw = (await res.json().catch(() => null)) as {
        status?: { code?: number | string; msg?: string }
        property?: Record<string, unknown>[]
      } | null
      const code = raw?.status?.code
      const okEmpty =
        raw?.status?.msg === 'SuccessWithoutResult' || code === 400 || code === '400'
      if (!res.ok && !okEmpty) return null
      return Array.isArray(raw?.property) ? raw.property[0] ?? null : null
    } catch {
      return null
    }
  }

  const hit = (await load('property/address')) || (await load('property/basicprofile'))
  if (!hit) return []
  const resolved = attomHitToResolved(hit)
  return resolved ? [resolved] : []
}

async function searchAddressesForQuery(
  query: string,
  googleApiKey: string | undefined,
  attomApiKey?: string,
): Promise<{ matches: ResolvedAddress[]; googleConfigured: boolean; googleError?: string }> {
  const variants = addressQueryVariants(query)
  const googleKey = googleApiKey?.trim()
  let googleError: string | undefined

  if (googleKey) {
    for (const variant of variants) {
      try {
        const google = await searchGoogleAddresses(variant, googleKey)
        if (google.matches.length > 0) {
          return { matches: google.matches, googleConfigured: true }
        }
        googleError = google.error || googleError
      } catch (error) {
        googleError = error instanceof Error ? error.message : 'Google address search failed'
      }
    }
  } else {
    googleError =
      'Google Maps key is not set. Add GOOGLE_MAPS_API_KEY to bfi-app/.env.local and restart Vite.'
  }

  for (const variant of variants) {
    try {
      const census = await searchCensus(variant)
      if (census.length > 0) {
        return { matches: census, googleConfigured: Boolean(googleKey), googleError }
      }
    } catch {
      // newer streets are often missing from Census
    }
  }
  for (const variant of variants) {
    const attom = await searchAttomAddress(variant, attomApiKey)
    if (attom.length > 0) {
      return { matches: attom, googleConfigured: Boolean(googleKey), googleError }
    }
  }
  return { matches: [], googleConfigured: Boolean(googleKey), googleError }
}

function mapAttomProperty(attom: Record<string, unknown>) {
  const building = (attom.building || {}) as Record<string, unknown>
  const size = (building.size || {}) as Record<string, unknown>
  const rooms = (building.rooms || {}) as Record<string, unknown>
  const summary = (attom.summary || {}) as Record<string, unknown>
  const lot = (attom.lot || {}) as Record<string, unknown>
  const identifier = (attom.identifier || {}) as Record<string, unknown>
  const assessment = (attom.assessment || {}) as Record<string, unknown>
  const ownerBlock = (assessment.owner || {}) as Record<string, unknown>
  const owner1 = (ownerBlock.owner1 || {}) as Record<string, unknown>
  const owner2 = (ownerBlock.owner2 || {}) as Record<string, unknown>
  const assessed = (assessment.assessed || {}) as Record<string, unknown>
  const market = (assessment.market || {}) as Record<string, unknown>
  const tax = (assessment.tax || {}) as Record<string, unknown>
  const sale = (attom.sale || {}) as Record<string, unknown>
  const saleAmount = (sale.amount || {}) as Record<string, unknown>
  const saleAmountData = (sale.saleAmountData || {}) as Record<string, unknown>
  const saleAmountBlock =
    Object.keys(saleAmount).length > 0 ? saleAmount : saleAmountData
  const location = (attom.location || {}) as Record<string, unknown>
  const area = (attom.area || {}) as Record<string, unknown>
  const utilities = (attom.utilities || {}) as Record<string, unknown>
  const interior = (building.interior || {}) as Record<string, unknown>
  const construction = (building.construction || {}) as Record<string, unknown>
  const parking = (building.parking || {}) as Record<string, unknown>
  const buildingSummary = (building.summary || {}) as Record<string, unknown>
  const vintage = (attom.vintage || {}) as Record<string, unknown>
  const owner3 = (ownerBlock.owner3 || {}) as Record<string, unknown>
  const owner4 = (ownerBlock.owner4 || {}) as Record<string, unknown>

  // basicprofile: prefer grossSizeAdjusted for County’s Fact living area
  const sqft =
    num(size.grossSizeAdjusted) ??
    num(size.grosssizeadjusted) ??
    num(size.livingSize) ??
    num(size.livingsize) ??
    num(size.universalSize) ??
    num(size.universalsize) ??
    num(size.bldgSize) ??
    num(size.bldgsize)
  const beds = num(rooms.beds)
  const baths =
    num(rooms.bathsTotal) ?? num(rooms.bathstotal) ?? num(rooms.bathsFull) ?? num(rooms.bathsfull)
  const bathsFull = num(rooms.bathsFull) ?? num(rooms.bathsfull)
  const bathsPartial = num(rooms.bathsPartial) ?? num(rooms.bathspartial)
  const yearBuilt = num(summary.yearBuilt) ?? num(summary.yearbuilt)
  let lotSqft = num(lot.lotSize2) ?? num(lot.lotsize2)
  const lotAcres = num(lot.lotSize1) ?? num(lot.lotsize1)
  if (!lotSqft && lotAcres) {
    lotSqft = Math.round(lotAcres * 43560)
  }

  const names = [
    owner1.fullName || owner1.fullname,
    owner2.fullName || owner2.fullname,
    owner3.fullName || owner3.fullname,
    owner4.fullName || owner4.fullname,
  ]
    .filter(Boolean)
    .map((n) => titleCaseStreet(String(n)))
  const absentee = String(summary.absenteeInd || '').toUpperCase()
  const taxYear = num(tax.taxYear) ?? num(tax.taxyear)
  const assessedTotal = num(assessed.assdTtlValue) ?? num(assessed.assdttlvalue)
  const land =
    num(market.mktLandValue) ??
    num(market.mktlandvalue) ??
    num(assessed.assdLandValue) ??
    num(assessed.assdlandvalue)
  const improvement = num(market.mktImprValue) ?? num(market.mktimprvalue)
  const taxAmt = num(tax.taxAmt) ?? num(tax.taxamt)
  const marketTotal = num(market.mktTtlValue) ?? num(market.mktttlvalue)
  const propertyTypeLabel =
    summary.propClass || summary.propclass || summary.propertyType || summary.propType

  const address = (attom.address || {}) as Record<string, unknown>
  const fields: Record<string, unknown> = {
    factsStatus: 'live',
    addressSource: 'edge',
    claimedSqft: undefined,
    ownerOccupied: absentee.includes('OWNER') || ownerBlock.absenteeOwnerStatus === 'O',
  }
  const salePrice = num(saleAmountBlock.saleAmt) ?? num(saleAmountBlock.saleamt)
  fields.lastSalePriceLabel = salePrice != null ? moneyLabel(salePrice) : '—'

  if (typeof address.line1 === 'string' && address.line1.trim()) {
    fields.address = titleCaseStreet(address.line1)
  }
  if (typeof address.locality === 'string' && address.locality.trim()) {
    fields.city = titleCaseStreet(address.locality)
  }
  if (typeof address.countrySubd === 'string' && address.countrySubd.trim()) {
    fields.state = String(address.countrySubd).toUpperCase().slice(0, 2)
  }
  if (typeof address.postal1 === 'string' && address.postal1.trim()) {
    fields.zipCode = String(address.postal1).split('-')[0]!.trim()
  }

  if (sqft != null) fields.sqft = Math.round(sqft)
  if (beds != null) fields.bedrooms = beds
  if (baths != null) fields.bathrooms = baths
  if (bathsFull != null) fields.bathsFull = bathsFull
  if (bathsPartial != null) fields.bathsPartial = bathsPartial
  if (yearBuilt != null) fields.yearBuilt = Math.round(yearBuilt)
  if (lotSqft != null) fields.lotSizeSqft = Math.round(lotSqft)
  if (lotAcres != null && lotAcres > 0) fields.lotSizeAcres = lotAcres
  if (identifier.apn) fields.apn = identifier.apn
  const zoning = lot.siteZoningIdent || lot.zoningType
  if (zoning) fields.zoning = zoning
  else if (propertyTypeLabel) fields.zoning = propertyTypeLabel
  if (propertyTypeLabel) fields.propertyTypeLabel = titleCaseStreet(String(propertyTypeLabel))
  if (typeof summary.legal1 === 'string' && summary.legal1.trim()) {
    fields.legalDescription = titleCaseStreet(summary.legal1)
  }
  if (typeof area.subdName === 'string' && area.subdName.trim()) {
    fields.subdivisionName = titleCaseStreet(area.subdName)
  }
  if (typeof area.countrySecSubd === 'string' && area.countrySecSubd.trim()) {
    fields.countyName = titleCaseStreet(area.countrySecSubd)
  }
  const levels = num(buildingSummary.levels)
  if (levels != null) fields.levels = Math.round(levels)
  const roomsTotal = num(rooms.roomsTotal) ?? num(rooms.roomstotal)
  if (roomsTotal != null) fields.roomsTotal = Math.round(roomsTotal)
  const garageType = parking.garageType || parking.prkgType
  if (typeof garageType === 'string' && garageType.trim()) {
    fields.garageType = titleCaseStreet(garageType)
  }
  const garageSize = num(parking.prkgSize) ?? num(parking.prkgsize)
  if (garageSize != null) fields.garageSizeSqft = Math.round(garageSize)
  if (typeof utilities.coolingType === 'string' && utilities.coolingType.trim()) {
    fields.coolingType = titleCaseStreet(utilities.coolingType)
  }
  if (typeof utilities.heatingType === 'string' && utilities.heatingType.trim()) {
    fields.heatingType = titleCaseStreet(utilities.heatingType)
  }
  if (typeof utilities.heatingFuel === 'string' && utilities.heatingFuel.trim()) {
    fields.heatingFuel = titleCaseStreet(utilities.heatingFuel)
  }
  if (typeof utilities.wallType === 'string' && utilities.wallType.trim()) {
    fields.wallType = titleCaseStreet(utilities.wallType)
  }
  if (typeof construction.condition === 'string' && construction.condition.trim()) {
    fields.constructionCondition = titleCaseStreet(construction.condition)
  }
  if (typeof construction.constructionType === 'string' && construction.constructionType.trim()) {
    fields.constructionType = titleCaseStreet(construction.constructionType)
  }
  if (typeof construction.frameType === 'string' && construction.frameType.trim()) {
    fields.frameType = titleCaseStreet(construction.frameType)
  }
  if (typeof construction.roofShape === 'string' && construction.roofShape.trim()) {
    fields.roofShape = titleCaseStreet(construction.roofShape)
  }
  if (typeof construction.wallType === 'string' && construction.wallType.trim() && !fields.wallType) {
    fields.wallType = titleCaseStreet(construction.wallType)
  }
  const majorImpr = num(construction.propertyStructureMajorImprovementsYear)
  if (majorImpr != null) fields.majorImprovementsYear = Math.round(majorImpr)
  if (typeof summary.archStyle === 'string' && summary.archStyle.trim()) {
    fields.architecturalStyle = titleCaseStreet(summary.archStyle)
  }
  const grossSize = num(size.grossSize) ?? num(size.grosssize)
  if (grossSize != null) fields.grossSizeSqft = Math.round(grossSize)
  const groundFloor = num(size.groundFloorSize) ?? num(size.groundfloorsize)
  if (groundFloor != null) fields.groundFloorSizeSqft = Math.round(groundFloor)
  const parkingSpaces = num(parking.prkgSpaces)
  if (parkingSpaces != null) fields.parkingSpaces = Math.round(parkingSpaces)
  if (typeof area.munName === 'string' && area.munName.trim()) {
    fields.municipalityName = titleCaseStreet(area.munName)
  }
  if (area.taxCodeArea != null && String(area.taxCodeArea).trim()) {
    fields.taxCodeArea = String(area.taxCodeArea).trim()
  }
  if (lot.lotNum != null && String(lot.lotNum).trim()) {
    fields.lotNumber = String(lot.lotNum).trim()
  }
  const quitRaw = summary.quitClaimFlag
  if (quitRaw != null) {
    const s = String(quitRaw).trim().toLowerCase()
    if (s === 'true' || s === 'y' || s === '1') fields.quitClaimFlag = true
    else if (s === 'false' || s === 'n' || s === '0') fields.quitClaimFlag = false
  }
  const reoRaw = summary.REOflag
  if (reoRaw != null) {
    const s = String(reoRaw).trim().toLowerCase()
    if (s === 'true' || s === 'y' || s === '1') fields.reoFlag = true
    else if (s === 'false' || s === 'n' || s === '0') fields.reoFlag = false
  }
  if (typeof sale.sellerName === 'string' && sale.sellerName.trim()) {
    fields.lastSaleSellerName = titleCaseStreet(
      sale.sellerName.replace(/,/g, ', ').replace(/\s+/g, ' ').trim(),
    )
  }
  const mortgage = (assessment.mortgage || {}) as Record<string, unknown>
  const firstMortgage = (mortgage.FirstConcurrent || {}) as Record<string, unknown>
  if (typeof firstMortgage.lenderLastName === 'string' && firstMortgage.lenderLastName.trim()) {
    fields.mortgageLender = titleCaseStreet(firstMortgage.lenderLastName)
  }
  if (typeof firstMortgage.loanTypeCode === 'string' && firstMortgage.loanTypeCode.trim()) {
    fields.mortgageLoanType = String(firstMortgage.loanTypeCode).toUpperCase()
  }
  if (typeof firstMortgage.date === 'string' && firstMortgage.date.trim()) {
    fields.mortgageDate = String(firstMortgage.date).slice(0, 10)
  }
  if (typeof firstMortgage.dueDate === 'string' && firstMortgage.dueDate.trim()) {
    fields.mortgageDueDate = String(firstMortgage.dueDate).slice(0, 10)
  }
  const fireplaces = num(interior.fplcCount) ?? num(interior.fplccount)
  if (fireplaces != null) fields.fireplaceCount = Math.round(fireplaces)
  if (typeof location.accuracy === 'string' && location.accuracy.trim()) {
    fields.locationAccuracy = titleCaseStreet(location.accuracy)
  }
  if (typeof vintage.lastModified === 'string' && vintage.lastModified.trim()) {
    fields.factsLastModified = String(vintage.lastModified).slice(0, 10)
  }
  if (typeof vintage.pubDate === 'string' && vintage.pubDate.trim()) {
    fields.factsPubDate = String(vintage.pubDate).slice(0, 10)
  }
  if (taxYear != null) fields.taxYear = Math.round(taxYear)
  if (assessedTotal != null) {
    fields.taxAssessedValueLabel = `Assessed ${moneyLabel(assessedTotal)} · ${fields.taxYear ?? 'county'}`
  } else if (taxYear != null) {
    fields.taxAssessedValueLabel = `County assessed · ${Math.round(taxYear)}`
  }
  const landLabel = moneyLabel(land)
  const imprLabel = moneyLabel(improvement)
  if (landLabel) fields.taxLandLabel = landLabel
  if (imprLabel) fields.taxImprovementLabel = imprLabel
  if (taxAmt != null) fields.taxAmountLabel = moneyLabel(taxAmt)
  if (marketTotal != null) fields.marketValueLabel = moneyLabel(marketTotal)
  if (names.length) fields.ownerName = names.join(' & ')
  const mailing =
    ownerBlock.mailingAddressOneLine || ownerBlock.mailingaddressoneline
  if (typeof mailing === 'string' && mailing.trim()) {
    fields.ownerMailingAddress = titleCaseStreet(mailing.trim())
  }
  const saleDate =
    sale.saleTransDate ||
    saleAmountBlock.saleRecDate ||
    saleAmountBlock.salerecdate ||
    sale.saleSearchDate ||
    sale.salesearchdate
  if (saleDate) fields.lastSaleDate = String(saleDate).slice(0, 10)
  if (saleAmountBlock.saleTransType || saleAmountBlock.saletranstype) {
    fields.deedType = String(saleAmountBlock.saleTransType || saleAmountBlock.saletranstype)
  } else if (Object.keys(sale).length) fields.deedType = 'Recorded transfer'
  if (saleAmountBlock.saleDocNum || saleAmountBlock.saledocnum) {
    fields.saleDocumentNumber = String(saleAmountBlock.saleDocNum || saleAmountBlock.saledocnum)
  }
  const lat = num(location.latitude)
  const lng = num(location.longitude)
  if (lat != null) fields.lat = lat
  if (lng != null) fields.lng = lng
  const attomId = identifier.attomId ?? identifier.Id
  if (attomId != null) fields.attomId = attomId

  const historyRaw = attom.saleHistory ?? attom.salehistory
  if (Array.isArray(historyRaw) && historyRaw.length > 0) {
    fields.salesHistory = historyRaw
      .map((row, index) => {
        if (!row || typeof row !== 'object') return null
        const item = row as Record<string, unknown>
        const amount = (item.amount || {}) as Record<string, unknown>
        const mortgageBlock = (item.mortgage || {}) as Record<string, unknown>
        const firstMortgage = (mortgageBlock.FirstConcurrent || {}) as Record<string, unknown>
        const title = (item.title || {}) as Record<string, unknown>
        const date =
          item.saleTransDate ||
          amount.saleRecDate ||
          amount.salerecdate ||
          item.saleSearchDate
        if (!date) return null
        const transferType = String(
          amount.saleTransType || amount.saletranstype || 'Recorded transfer',
        )
        const deedCode =
          amount.deedType || amount.deedtype
            ? String(amount.deedType || amount.deedtype)
            : undefined
        const cleanName = (raw: unknown) => {
          if (typeof raw !== 'string' || !raw.trim()) return undefined
          return titleCaseStreet(
            raw
              .replace(/,/g, ', ')
              .replace(/\s+/g, ' ')
              .replace(/,\s*$/g, '')
              .trim(),
          )
        }
        const flag = (raw: unknown) => {
          if (raw == null) return undefined
          const s = String(raw).trim().toLowerCase()
          if (s === 'true' || s === 'y' || s === 'yes' || s === '1') return true
          if (s === 'false' || s === 'n' || s === 'no' || s === '0') return false
          return undefined
        }
        const lender = [
          firstMortgage.lenderFirstName || firstMortgage.lenderfirstname,
          firstMortgage.lenderLastName || firstMortgage.lenderlastname,
        ]
          .filter((part) => typeof part === 'string' && part.trim())
          .join(' ')
        const titleCompany =
          typeof title.companyName === 'string' &&
          title.companyName.trim() &&
          title.companyName.toUpperCase() !== 'NONE AVAILABLE'
            ? titleCaseStreet(title.companyName)
            : undefined
        return {
          id: `sale-${item.sequence ?? index}-${String(date).slice(0, 10)}`,
          date: String(date).slice(0, 10),
          recordedDate: amount.saleRecDate || amount.salerecdate
            ? String(amount.saleRecDate || amount.salerecdate).slice(0, 10)
            : undefined,
          deedType: transferType,
          deedCode,
          documentNumber:
            amount.saleDocNum || amount.saledocnum
              ? String(amount.saleDocNum || amount.saledocnum)
              : undefined,
          documentType:
            amount.saleDocType || amount.saledoctype
              ? String(amount.saleDocType || amount.saledoctype)
              : undefined,
          buyerName: cleanName(item.buyerName),
          sellerName: cleanName(item.sellerName),
          deedInLieu: flag(item.deedInLieuOfIndicator),
          sellerCarryBack: flag(item.sellerCarryBack),
          titleCompany,
          lenderName: lender ? titleCaseStreet(lender) : undefined,
          loanType:
            typeof firstMortgage.loanTypeCode === 'string' && firstMortgage.loanTypeCode.trim()
              ? String(firstMortgage.loanTypeCode).toUpperCase()
              : undefined,
          loanTermMonths:
            firstMortgage.term != null && String(firstMortgage.term).trim()
              ? String(firstMortgage.term)
              : undefined,
          loanDueDate:
            typeof firstMortgage.dueDate === 'string' && firstMortgage.dueDate.trim()
              ? String(firstMortgage.dueDate).slice(0, 10)
              : undefined,
          loanDocumentNumber:
            firstMortgage.trustDeedDocumentNumber || firstMortgage.ident
              ? String(firstMortgage.trustDeedDocumentNumber || firstMortgage.ident)
              : undefined,
          amountLabel: (() => {
            const salePrice = num(amount.saleAmt) ?? num(amount.saleamt)
            return salePrice != null ? moneyLabel(salePrice) : '—'
          })(),
        }
      })
      .filter(Boolean)
  }

  const permitsRaw = attom.buildingPermits ?? attom.buildingpermits
  if (Array.isArray(permitsRaw) && permitsRaw.length > 0) {
    fields.buildingPermits = permitsRaw
      .map((row, index) => {
        if (!row || typeof row !== 'object') return null
        const item = row as Record<string, unknown>
        const effectiveDate = item.effectiveDate
          ? String(item.effectiveDate).slice(0, 10)
          : undefined
        const permitNumber = item.permitNumber ? String(item.permitNumber).trim() : undefined
        const status = item.status ? titleCaseStreet(String(item.status)) : undefined
        const type = item.type ? titleCaseStreet(String(item.type)) : undefined
        const subType = item.subType ? titleCaseStreet(String(item.subType)) : undefined
        const description = item.description ? String(item.description).trim() : undefined
        const projectName = item.projectName
          ? titleCaseStreet(String(item.projectName))
          : undefined
        const homeOwnerName = item.homeOwnerName
          ? titleCaseStreet(String(item.homeOwnerName))
          : undefined
        const feesNum = num(item.fees)
        const feesLabel = feesNum != null ? moneyLabel(feesNum) : undefined
        const classifiers = Array.isArray(item.classifiers)
          ? item.classifiers.map((c) => String(c).trim()).filter(Boolean)
          : undefined
        if (!effectiveDate && !permitNumber && !type && !description) return null
        return {
          id: `permit-${permitNumber || index}-${effectiveDate || index}`,
          effectiveDate,
          permitNumber,
          status,
          type,
          subType,
          description,
          projectName,
          feesLabel: feesLabel || undefined,
          homeOwnerName,
          classifiers,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = (a as { effectiveDate?: string }).effectiveDate || ''
        const right = (b as { effectiveDate?: string }).effectiveDate || ''
        return right.localeCompare(left)
      })
  }

  const schoolRaw = attom.school
  if (Array.isArray(schoolRaw) && schoolRaw.length > 0) {
    const levelRank: Record<string, number> = {
      elementary: 0,
      middle: 1,
      high: 2,
      other: 3,
    }
    fields.schools = schoolRaw
      .map((row, index) => {
        if (!row || typeof row !== 'object') return null
        const item = row as Record<string, unknown>
        const nameRaw = item.InstitutionName || item.institutionName
        if (!nameRaw || !String(nameRaw).trim()) return null
        const name = titleCaseStreet(String(nameRaw))
        const geoIdV4 = item.geoIdV4 ? String(item.geoIdV4) : undefined
        if (!isPublishedAssignedSchool(name, geoIdV4)) return null
        const gradeLow = String(item.lowAssignedGrade || item.gradelevel1lotext || '')
          .trim()
          .replace(/\s+$/g, '')
        const gradeHigh = String(item.highAssignedGrade || item.gradelevel1hitext || '')
          .trim()
          .replace(/\s+$/g, '')
        const gsNum = item.GSTestRating != null ? Number(item.GSTestRating) : undefined
        const distanceRaw = item.distance != null ? Number(item.distance) : undefined
        const lat = item.geocodinglatitude != null ? Number(item.geocodinglatitude) : undefined
        const lng = item.geocodinglongitude != null ? Number(item.geocodinglongitude) : undefined
        const level = inferSchoolLevel(gradeLow || undefined, gradeHigh || undefined)
        return {
          id: `school-${item.geoIdV4 || index}`,
          name,
          rating:
            typeof item.schoolRating === 'string' && item.schoolRating.trim()
              ? item.schoolRating.trim()
              : undefined,
          gsTestRating:
            gsNum != null && Number.isFinite(gsNum) && gsNum > 0 ? gsNum : undefined,
          gradeLow: gradeLow || undefined,
          gradeHigh: gradeHigh || undefined,
          level,
          type:
            item.Filetypetext || item.filetypetext
              ? titleCaseStreet(String(item.Filetypetext || item.filetypetext))
              : undefined,
          distanceMiles:
            distanceRaw != null && Number.isFinite(distanceRaw) ? distanceRaw : undefined,
          lat: lat != null && Number.isFinite(lat) ? lat : undefined,
          lng: lng != null && Number.isFinite(lng) ? lng : undefined,
          geoIdV4,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = a as { level?: string; distanceMiles?: number }
        const right = b as { level?: string; distanceMiles?: number }
        const rank =
          (levelRank[left.level || 'other'] ?? 3) - (levelRank[right.level || 'other'] ?? 3)
        if (rank !== 0) return rank
        return (left.distanceMiles ?? 99) - (right.distanceMiles ?? 99)
      })
  }

  const schoolDistrict = attom.schoolDistrict as Record<string, unknown> | undefined
  if (schoolDistrict && typeof schoolDistrict === 'object') {
    const name = schoolDistrict.districtname
      ? titleCaseStreet(String(schoolDistrict.districtname))
      : undefined
    if (name) {
      const lat =
        schoolDistrict.districtlatitude != null
          ? Number(schoolDistrict.districtlatitude)
          : undefined
      const lng =
        schoolDistrict.districtlongitude != null
          ? Number(schoolDistrict.districtlongitude)
          : undefined
      fields.schoolDistrict = {
        name,
        type: schoolDistrict.districttype
          ? titleCaseStreet(String(schoolDistrict.districttype))
          : undefined,
        geoIdV4: schoolDistrict.geoIdV4 ? String(schoolDistrict.geoIdV4) : undefined,
        lat: lat != null && Number.isFinite(lat) ? lat : undefined,
        lng: lng != null && Number.isFinite(lng) ? lng : undefined,
      }
    }
  }

  const taxHistoryRaw = attom.assessmentHistory ?? attom.assessmenthistory
  if (Array.isArray(taxHistoryRaw) && taxHistoryRaw.length > 0) {
    fields.taxHistory = taxHistoryRaw
      .map((row, index) => {
        if (!row || typeof row !== 'object') return null
        const item = row as Record<string, unknown>
        const tax = (item.tax || {}) as Record<string, unknown>
        const assessed = (item.assessed || {}) as Record<string, unknown>
        const market = (item.market || {}) as Record<string, unknown>
        const yearRaw = tax.taxYear ?? tax.taxyear ?? tax.assessorYear ?? tax.assessoryear
        const year = yearRaw != null ? Number(yearRaw) : NaN
        if (!Number.isFinite(year) || year <= 0) return null
        const assessorRaw = tax.assessorYear ?? tax.assessoryear
        const assessorYear =
          assessorRaw != null && Number.isFinite(Number(assessorRaw))
            ? Number(assessorRaw)
            : undefined
        const taxAmt = num(tax.taxAmt ?? tax.taxamt)
        const assessedTotal = num(assessed.assdTtlValue ?? assessed.assdttlvalue)
        const land = num(assessed.assdLandValue ?? assessed.assdlandvalue)
        const impr = num(assessed.assdImprValue ?? assessed.assdimprvalue)
        const marketTotal = num(market.mktTtlValue ?? market.mktttlvalue)
        return {
          id: `tax-${year}-${index}`,
          taxYear: year,
          assessorYear: assessorYear !== year ? assessorYear : undefined,
          taxAmountLabel: taxAmt != null ? moneyLabel(taxAmt) : undefined,
          assessedLabel: assessedTotal != null ? moneyLabel(assessedTotal) : undefined,
          landLabel: land != null ? moneyLabel(land) : undefined,
          improvementLabel: impr != null ? moneyLabel(impr) : undefined,
          marketLabel: marketTotal != null ? moneyLabel(marketTotal) : undefined,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = (a as { taxYear: number }).taxYear
        const right = (b as { taxYear: number }).taxYear
        return right - left
      })
  }

  return fields
}

async function fetchAttom(match: ResolvedAddress, apiKey: string) {
  const address2 = [match.city, match.state, match.zipCode].filter(Boolean).join(', ')

  async function load(packagePath: string, apiVersion: 'v1.0.0' | 'v4' = 'v1.0.0') {
    const url = new URL(`https://api.gateway.attomdata.com/propertyapi/${apiVersion}/${packagePath}`)
    url.searchParams.set('address1', match.street)
    url.searchParams.set('address2', address2)
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', apikey: apiKey },
      })
      const raw = (await res.json().catch(() => null)) as {
        property?: Record<string, unknown>[]
        status?: { msg?: string; code?: number | string }
      } | null
      // ATTOM returns HTTP 400 + SuccessWithoutResult when a package has no rows
      const code = raw?.status?.code
      const okEmpty =
        raw?.status?.msg === 'SuccessWithoutResult' || code === 400 || code === '400'
      if (!res.ok && !okEmpty) return null
      return Array.isArray(raw?.property) ? raw.property[0] ?? null : null
    } catch {
      return null
    }
  }

  const profile = await load('property/basicprofile')
  if (!profile) {
    return {
      ok: false as const,
      error: 'No ATTOM match for property/basicprofile',
    }
  }

  const fields = mapAttomProperty(profile)
  fields.attomBasicProfile = profile
  return { ok: true as const, property: fields }
}

const ATTOM_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const attomMemoryCache = new Map<string, { property: Record<string, unknown>; expiresAt: number }>()

function attomCacheKey(address: ResolvedAddress) {
  return [
    address.street.trim().toLowerCase(),
    address.city.trim().toLowerCase(),
    address.state.trim().toUpperCase(),
    address.zipCode.replace(/\D/g, '').slice(0, 5),
  ].join('|')
}

async function fetchAttomCached(address: ResolvedAddress, apiKey: string) {
  const key = attomCacheKey(address)
  const hit = attomMemoryCache.get(key)
  if (hit && hit.expiresAt > Date.now() && hit.property.attomBasicProfile) {
    return { ok: true as const, property: hit.property }
  }
  const live = await fetchAttom(address, apiKey)
  if (live.ok) {
    const expiresAt = Date.now() + ATTOM_CACHE_TTL_MS
    attomMemoryCache.set(key, { property: live.property, expiresAt })
    if (typeof live.property.address === 'string') {
      attomMemoryCache.set(
        attomCacheKey({
          ...address,
          street: live.property.address,
          city: typeof live.property.city === 'string' ? live.property.city : address.city,
          state: typeof live.property.state === 'string' ? live.property.state : address.state,
          zipCode: typeof live.property.zipCode === 'string' ? live.property.zipCode : address.zipCode,
        }),
        { property: live.property, expiresAt },
      )
    }
  }
  return live
}

const ATTOM_LAZY_PACKAGES: Record<string, { path: string; version: 'v1.0.0' | 'v4' }> = {
  assessmenthistory: { path: 'assessmenthistory/detail', version: 'v1.0.0' },
  saleshistory: { path: 'saleshistory/expandedhistory', version: 'v1.0.0' },
  detailwithschools: { path: 'property/detailwithschools', version: 'v4' },
}

const attomPackageMemoryCache = new Map<string, { payload: Record<string, unknown>; expiresAt: number }>()

function packageCacheKey(packageName: string, address: ResolvedAddress, attomId?: number) {
  if (attomId != null && Number.isFinite(attomId)) return `pkg:${packageName}|id|${attomId}`
  return `pkg:${packageName}|${attomCacheKey(address)}`
}

async function fetchAttomRawPackage(
  match: ResolvedAddress,
  apiKey: string,
  spec: { path: string; version: 'v1.0.0' | 'v4' },
  attomId?: number,
) {
  const url = new URL(`https://api.gateway.attomdata.com/propertyapi/${spec.version}/${spec.path}`)
  if (attomId != null && Number.isFinite(attomId)) {
    url.searchParams.set('attomid', String(attomId))
  } else {
    url.searchParams.set('address1', match.street)
    url.searchParams.set(
      'address2',
      [match.city, match.state, match.zipCode].filter(Boolean).join(', '),
    )
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', apikey: apiKey },
    })
    const raw = (await res.json().catch(() => null)) as {
      property?: Record<string, unknown>[]
      status?: { msg?: string; code?: number | string }
    } | null
    const code = raw?.status?.code
    const okEmpty =
      raw?.status?.msg === 'SuccessWithoutResult' || code === 400 || code === '400'
    if (!res.ok && !okEmpty) {
      return { payload: null as Record<string, unknown> | null, error: raw?.status?.msg || `ATTOM HTTP ${res.status}` }
    }
    const payload = Array.isArray(raw?.property) ? raw.property[0] ?? null : null
    if (!payload) {
      return { payload: null, error: raw?.status?.msg || 'No ATTOM rows for this package' }
    }
    return { payload }
  } catch (error) {
    return {
      payload: null as Record<string, unknown> | null,
      error: error instanceof Error ? error.message : 'ATTOM package request failed',
    }
  }
}

async function fetchAttomPackageCached(
  match: ResolvedAddress,
  apiKey: string,
  packageName: string,
  attomId?: number,
) {
  const spec = ATTOM_LAZY_PACKAGES[packageName]
  if (!spec) return { payload: null as Record<string, unknown> | null, error: 'Unknown ATTOM package' }
  const keys = [packageCacheKey(packageName, match, attomId)]
  if (attomId != null) keys.push(packageCacheKey(packageName, match))
  const now = Date.now()
  for (const cacheKey of keys) {
    const hit = attomPackageMemoryCache.get(cacheKey)
    if (hit && hit.expiresAt > now) return { payload: hit.payload }
  }
  const live = await fetchAttomRawPackage(match, apiKey, spec, attomId)
  if (live.payload) {
    const expiresAt = now + ATTOM_CACHE_TTL_MS
    for (const cacheKey of keys) {
      attomPackageMemoryCache.set(cacheKey, { payload: live.payload, expiresAt })
    }
  }
  return live
}

/**
 * Dev/preview proxy for property lookup + Google Places + ATTOM.
 * Keeps API keys on the server (never VITE_* / never in the browser bundle).
 */
function propertyLookupApiPlugin(
  attomApiKey: string | undefined,
  googleMapsApiKey: string | undefined,
): Plugin {
  async function handle(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'POST only' }))
      return
    }

    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    let body: {
      query?: string
      mode?: string
      attomPackage?: string
      attomId?: number
    } = {}
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as typeof body
    } catch {
      body = {}
    }

    const query = (body.query || '').trim()
    const mode = body.mode === 'resolve' || body.mode === 'package' ? body.mode : 'search'
    // Google handles shorter partials better than Census (min 3).
    if (query.length < 3) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ matches: [] }))
      return
    }

    const search = await searchAddressesForQuery(query, googleMapsApiKey, attomApiKey)
    const matches = search.matches
    if (mode === 'search') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          matches,
          googleConfigured: search.googleConfigured,
          googleError: search.googleError,
        }),
      )
      return
    }

    let match = matches[0] ?? null
    if (!match) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ match: null, matches: [], factsStatus: 'pending' }))
      return
    }

    if (mode === 'package') {
      const packageName = String(body.attomPackage || '')
      const attomId =
        typeof body.attomId === 'number' && Number.isFinite(body.attomId) ? body.attomId : undefined
      if (!attomApiKey) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            match,
            matches,
            packageId: packageName,
            packagePayload: null,
            attomError: 'ATTOM_API_KEY not set',
          }),
        )
        return
      }
      const packed = await fetchAttomPackageCached(match, attomApiKey, packageName, attomId)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          match,
          matches,
          packageId: packageName,
          packagePayload: packed.payload,
          attomError: packed.error ?? null,
        }),
      )
      return
    }

    let factsStatus: 'pending' | 'live' = 'pending'
    let property: Record<string, unknown> | null = null
    let attomError: string | null = null

    if (attomApiKey) {
      const attom = await fetchAttomCached(match, attomApiKey)
      if (attom.ok) {
        property = attom.property
        factsStatus = 'live'
        // Prefer ATTOM's canonical street line when the house number still matches.
        const queryHouse = query.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
        const attomStreet = typeof property.address === 'string' ? property.address : null
        const attomHouse = attomStreet?.match(/^(\d+[A-Za-z]?)\b/)?.[1]
        if (attomStreet && (!queryHouse || !attomHouse || queryHouse === attomHouse)) {
          const city = typeof property.city === 'string' ? property.city : match.city
          const state = typeof property.state === 'string' ? property.state : match.state
          const zipCode = typeof property.zipCode === 'string' ? property.zipCode : match.zipCode
          const formatted = zipCode
            ? `${attomStreet}, ${city}, ${state} ${zipCode}`
            : `${attomStreet}, ${city}, ${state}`
          match = {
            ...match,
            street: attomStreet,
            city,
            state,
            zipCode,
            formatted,
            id: stableAddressId({ street: attomStreet, city, state, zipCode }),
          }
        }
      } else {
        attomError = attom.error
      }
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        match: {
          ...match,
          source: match.source === 'google' ? 'google' : 'edge',
        },
        matches,
        factsStatus,
        property,
        attomError,
      }),
    )
  }

  const mount = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void
  }) => {
    middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/api/property-lookup')) return next()
      void handle(req, res).catch((err) => {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Lookup failed' }))
      })
    })
  }

  return {
    name: 'bfi-property-lookup-api',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), '')
  const attomApiKey = env.ATTOM_API_KEY || process.env.ATTOM_API_KEY
  const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY

  return {
    // Relative asset URLs so Capacitor can load the build from the native WebView.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      propertyLookupApiPlugin(attomApiKey, googleMapsApiKey),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
