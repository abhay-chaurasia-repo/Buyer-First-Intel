// Supabase Edge Function: address search (Google Places + Census) + ATTOM
// Deploy: supabase functions deploy property-lookup
// Secrets: supabase secrets set ATTOM_API_KEY=... GOOGLE_MAPS_API_KEY=...
// ATTOM snapshots are stored 24h in attom_lookup_cache so the same address
// searched by another user does not call ATTOM again. Do not lengthen TTL
// without a written ATTOM license.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

function nearbySchoolLevel(instructionalLevel?: string, gradeLow?: string, gradeHigh?: string) {
  const t = String(instructionalLevel || '').toLowerCase()
  if (t.includes('elem') || t.includes('primary')) return 'elementary'
  if (t.includes('middle') || t.includes('junior') || t.includes('intermed')) return 'middle'
  if (t.includes('high') || t.includes('senior')) return 'high'
  return inferSchoolLevel(gradeLow, gradeHigh)
}

function isPublishedAssignedSchool(name: string, geoIdV4?: string) {
  const n = name.toLowerCase()
  if (!n || n.includes('unassigned')) return false
  if (geoIdV4 && /^G\d/i.test(geoIdV4)) return false
  return true
}

function mapNearbySchoolSearch(rows: unknown[]) {
  const schools: Array<Record<string, unknown>> = []
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const location = (item.location || {}) as Record<string, unknown>
    const detail = (item.detail || {}) as Record<string, unknown>
    const status = String(detail.status || '').toLowerCase()
    if (status.includes('closed') || status.includes('inactive')) continue
    const nameRaw = detail.schoolName || item.schoolName
    if (!nameRaw || !String(nameRaw).trim()) continue
    const name = titleCaseStreet(String(nameRaw))
    const gradeLow = String(detail.gradeSpanLow || '').trim()
    const gradeHigh = String(detail.gradeSpanHigh || '').trim()
    const geoIdV4 = location.geoIdV4 ? String(location.geoIdV4) : undefined
    const distanceRaw = detail.distance != null ? Number(detail.distance) : undefined
    const lat = location.latitude != null ? Number(location.latitude) : undefined
    const lng = location.longitude != null ? Number(location.longitude) : undefined
    const typeRaw = detail.institutionType || detail.schoolType
    schools.push({
      id: `near-${geoIdV4 || index}`,
      name,
      gradeLow: gradeLow || undefined,
      gradeHigh: gradeHigh || undefined,
      level: nearbySchoolLevel(String(detail.instructionalLevel || ''), gradeLow, gradeHigh),
      type: typeRaw ? titleCaseStreet(String(typeRaw)) : undefined,
      distanceMiles:
        distanceRaw != null && Number.isFinite(distanceRaw) ? distanceRaw : undefined,
      lat: lat != null && Number.isFinite(lat) ? lat : undefined,
      lng: lng != null && Number.isFinite(lng) ? lng : undefined,
      geoIdV4,
    })
  }
  return schools
    .sort(
      (a, b) =>
        (Number(a.distanceMiles ?? 99) as number) - (Number(b.distanceMiles ?? 99) as number),
    )
    .slice(0, 8)
}

function houseNumberFromMatchedAddress(matchedAddress?: string) {
  if (!matchedAddress) return undefined
  const streetLine = matchedAddress.split(',')[0]?.trim() ?? ''
  const match = streetLine.match(/^(\d+[A-Za-z]?)\b/)
  return match?.[1]
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

async function searchCensus(query: string, limit = 6): Promise<ResolvedAddress[]> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
  url.searchParams.set('address', query)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Census geocoder failed (${res.status})`)
  const data = await res.json()
  const matches = data?.result?.addressMatches ?? []
  const out: ResolvedAddress[] = []

  for (const match of matches) {
    const c = match.addressComponents
    const lat = match.coordinates?.y
    const lng = match.coordinates?.x
    if (!c?.city || !c?.state || lat == null || lng == null) continue

    // fromAddress/toAddress are TIGER range ends — parse house from matchedAddress,
    // then prefer the house number the buyer actually typed/selected.
    const queryHouse = query.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
    const house =
      queryHouse || houseNumberFromMatchedAddress(match.matchedAddress) || c.fromAddress
    const streetBits = [
      house,
      c.preDirection,
      c.preType,
      c.streetName,
      c.suffixType,
      c.suffixDirection,
    ]
      .map((v: string | undefined) => (v || '').trim())
      .filter(Boolean)
    const street = titleCaseStreet(streetBits.join(' '))
    if (!street) continue

    const city = titleCaseStreet(c.city)
    const state = String(c.state).toUpperCase()
    const zipCode = String(c.zip || '').trim()
    const formatted = zipCode
      ? `${street}, ${city}, ${state} ${zipCode}`
      : `${street}, ${city}, ${state}`

    out.push({
      id: stableAddressId({ street, city, state, zipCode }),
      formatted,
      street,
      city,
      state,
      zipCode,
      lat,
      lng,
      source: 'edge',
      matchedAddress: match.matchedAddress,
    })
    if (out.length >= limit) break
  }

  return out
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

async function searchGooglePlaces(query: string, apiKey: string): Promise<{
  matches: ResolvedAddress[]
  error?: string
}> {
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
      // Edge IPs are not the buyer’s phone — don’t let server IP bias hide GA homes.
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
  const autoJson = await autoRes.json().catch(() => null)
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
        const place = await res.json().catch(() => null)
        if (!place) return null
        return googlePlaceToResolved(placeId, place)
      } catch {
        return null
      }
    }),
  )

  return { matches: details.filter(Boolean) as ResolvedAddress[] }
}

async function searchGoogleGeocode(query: string, apiKey: string): Promise<{
  matches: ResolvedAddress[]
  error?: string
}> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', query)
  url.searchParams.set('components', 'country:US')
  url.searchParams.set('key', apiKey)
  const res = await fetch(url.toString())
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    return { matches: [], error: googleHttpError(res.status, JSON.stringify(json || {}), 'Geocoding') }
  }
  if (json?.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    return { matches: [], error: `Geocoding ${json.status}${json.error_message ? `: ${json.error_message}` : ''}` }
  }
  const matches: ResolvedAddress[] = []
  for (const result of json?.results || []) {
    const components = (result.address_components || []).map((c: {
      long_name?: string
      short_name?: string
      types?: string[]
    }) => ({
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

async function searchGoogleAddressValidation(query: string, apiKey: string): Promise<{
  matches: ResolvedAddress[]
  error?: string
}> {
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
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    return {
      matches: [],
      error: googleHttpError(res.status, JSON.stringify(json || {}), 'Address Validation'),
    }
  }
  const address = json?.result?.address
  const geocode = json?.result?.geocode
  const components = (address?.addressComponents || []).map((c: {
    componentType?: string
    componentName?: { text?: string }
  }) => ({
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

async function searchGoogleAddresses(query: string, apiKey: string): Promise<{
  matches: ResolvedAddress[]
  error?: string
}> {
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


async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', `${city}, ${state}, USA`)
    url.searchParams.set('countrycodes', 'us')
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'DueDiligenceBuyerApp/1.0' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const lat = Number(data?.[0]?.lat)
    const lng = Number(data?.[0]?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

function parseTypedUsAddress(query: string): {
  street: string
  city: string
  state: string
  zipCode: string
  formatted: string
} | null {
  const expanded = expandAddressQuery(query)
  const parts = expanded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  const street = parts[0]!
  if (!/^\d+[A-Za-z]?\s+\S+/.test(street)) return null
  let city = ''
  let state = ''
  let zipCode = ''
  if (parts.length >= 3) {
    city = titleCaseStreet(parts[1]!)
    const stateZip = parts[2]!.match(/^([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?$/)
    if (!stateZip) return null
    state = stateZip[1]!.toUpperCase()
    zipCode = stateZip[2] || ''
  } else {
    const cityState = parts[1]!.match(/^(.+?)\s+([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?$/)
    if (!cityState) return null
    city = titleCaseStreet(cityState[1]!)
    state = cityState[2]!.toUpperCase()
    zipCode = cityState[3] || ''
  }
  if (!city || state.length !== 2) return null
  const formatted = zipCode ? `${street}, ${city}, ${state} ${zipCode}` : `${street}, ${city}, ${state}`
  return { street, city, state, zipCode, formatted }
}

async function typedAddressMatch(query: string): Promise<ResolvedAddress | null> {
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
    source: 'edge',
    matchedAddress: typed.formatted,
  }
}

async function searchAddressesForQuery(query: string): Promise<{
  matches: ResolvedAddress[]
  googleConfigured: boolean
  googleError?: string
}> {
  const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim()
  const variants = addressQueryVariants(query)
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
      'Google Maps key is not set on the Edge Function. Set GOOGLE_MAPS_API_KEY and redeploy property-lookup.'
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

  const typed = await typedAddressMatch(query)
  return {
    matches: typed ? [typed] : [],
    googleConfigured: Boolean(googleKey),
    googleError,
  }
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
  } else if (sale && Object.keys(sale).length) fields.deedType = 'Recorded transfer'
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
      .map((row: unknown, index: number) => {
        if (!row || typeof row !== 'object') return null
        const item = row as Record<string, unknown>
        const amount = (item.amount || {}) as Record<string, unknown>
        const mortgageBlock = (item.mortgage || {}) as Record<string, unknown>
        const firstMortgage = (mortgageBlock.FirstConcurrent || {}) as Record<string, unknown>
        const title = (item.title || {}) as Record<string, unknown>
        const date =
          item.saleTransDate || amount.saleRecDate || amount.salerecdate || item.saleSearchDate
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
      .map((row: unknown, index: number) => {
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
      .sort((a: { effectiveDate?: string } | null, b: { effectiveDate?: string } | null) => {
        const left = a?.effectiveDate || ''
        const right = b?.effectiveDate || ''
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
      .map((row: unknown, index: number) => {
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
      .sort(
        (
          a: { level?: string; distanceMiles?: number } | null,
          b: { level?: string; distanceMiles?: number } | null,
        ) => {
          const left = a || {}
          const right = b || {}
          const rank =
            (levelRank[left.level || 'other'] ?? 3) - (levelRank[right.level || 'other'] ?? 3)
          if (rank !== 0) return rank
          return (left.distanceMiles ?? 99) - (right.distanceMiles ?? 99)
        },
      )
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
      .map((row: unknown, index: number) => {
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
      .sort(
        (a: { taxYear?: number } | null, b: { taxYear?: number } | null) =>
          (b?.taxYear || 0) - (a?.taxYear || 0),
      )
  }

  return fields
}

async function fetchAttomFacts(match: ResolvedAddress): Promise<{
  factsStatus: 'pending' | 'live'
  property?: Record<string, unknown>
  attomError?: string
}> {
  const key = Deno.env.get('ATTOM_API_KEY')
  if (!key) {
    return { factsStatus: 'pending', attomError: 'ATTOM_API_KEY not set' }
  }

  const address2 = [match.city, match.state, match.zipCode].filter(Boolean).join(', ')

  async function load(packagePath: string, apiVersion: 'v1.0.0' | 'v4' = 'v1.0.0') {
    const url = new URL(`https://api.gateway.attomdata.com/propertyapi/${apiVersion}/${packagePath}`)
    url.searchParams.set('address1', match.street)
    url.searchParams.set('address2', address2)
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json', apikey: key },
      })
      const raw = await res.json().catch(() => null)
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
      factsStatus: 'pending',
      attomError: 'No ATTOM match for property/basicprofile',
    }
  }

  const fields = mapAttomProperty(profile)
  fields.attomBasicProfile = profile
  return {
    factsStatus: 'live',
    property: fields,
  }
}

const ATTOM_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function attomCacheKey(address: ResolvedAddress) {
  return [
    address.street.trim().toLowerCase(),
    address.city.trim().toLowerCase(),
    address.state.trim().toUpperCase(),
    address.zipCode.replace(/\D/g, '').slice(0, 5),
  ].join('|')
}

function cacheAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function readAttomCache(address: ResolvedAddress): Promise<Record<string, unknown> | null> {
  try {
    const supabase = cacheAdminClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('attom_lookup_cache')
      .select('property, expires_at')
      .eq('cache_key', attomCacheKey(address))
      .maybeSingle()
    if (error || !data?.property || typeof data.property !== 'object') return null
    if (new Date(String(data.expires_at)).getTime() <= Date.now()) return null
    return data.property as Record<string, unknown>
  } catch {
    return null
  }
}

async function writeAttomCache(address: ResolvedAddress, property: Record<string, unknown>) {
  try {
    const supabase = cacheAdminClient()
    if (!supabase) return
    const expiresAt = new Date(Date.now() + ATTOM_CACHE_TTL_MS).toISOString()
    const keys = new Set([attomCacheKey(address)])
    if (typeof property.address === 'string') {
      keys.add(
        attomCacheKey({
          ...address,
          street: property.address,
          city: typeof property.city === 'string' ? property.city : address.city,
          state: typeof property.state === 'string' ? property.state : address.state,
          zipCode: typeof property.zipCode === 'string' ? property.zipCode : address.zipCode,
        }),
      )
    }
    await Promise.all(
      [...keys].map((cache_key) =>
        supabase.from('attom_lookup_cache').upsert({
          cache_key,
          property,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt,
        }),
      ),
    )
  } catch {
    // Fail open: a cache write miss must never block a live lookup.
  }
}

async function fetchAttomFactsCached(address: ResolvedAddress) {
  const cached = await readAttomCache(address)
  if (cached?.attomBasicProfile && typeof cached.attomBasicProfile === 'object') {
    return { factsStatus: 'live' as const, property: cached }
  }
  const live = await fetchAttomFacts(address)
  if (live.property && live.factsStatus === 'live') {
    await writeAttomCache(address, live.property)
  }
  return live
}

const ATTOM_LAZY_PACKAGES: Record<
  string,
  { path: string; version: 'v1.0.0' | 'v4' }
> = {
  assessmenthistory: { path: 'assessmenthistory/detail', version: 'v1.0.0' },
  saleshistory: { path: 'saleshistory/expandedhistory', version: 'v1.0.0' },
  detailwithschools: { path: 'property/detailwithschools', version: 'v4' },
}

function packageCacheKey(packageName: string, address: ResolvedAddress, attomId?: number) {
  if (attomId != null && Number.isFinite(attomId)) return `pkg:${packageName}|id|${attomId}`
  return `pkg:${packageName}|${attomCacheKey(address)}`
}

async function readPackageCache(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const supabase = cacheAdminClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('attom_lookup_cache')
      .select('property, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()
    if (error || !data?.property || typeof data.property !== 'object') return null
    if (new Date(String(data.expires_at)).getTime() <= Date.now()) return null
    const row = data.property as Record<string, unknown>
    if (row.attomPackagePayload && typeof row.attomPackagePayload === 'object') {
      return row.attomPackagePayload as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

async function writePackageCache(cacheKey: string, payload: Record<string, unknown>) {
  try {
    const supabase = cacheAdminClient()
    if (!supabase) return
    await supabase.from('attom_lookup_cache').upsert({
      cache_key: cacheKey,
      property: { attomPackagePayload: payload },
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ATTOM_CACHE_TTL_MS).toISOString(),
    })
  } catch {
    // Fail open
  }
}

async function fetchAttomRawPackage(
  match: ResolvedAddress,
  spec: { path: string; version: 'v1.0.0' | 'v4' },
  attomId?: number,
): Promise<{ payload: Record<string, unknown> | null; error?: string }> {
  const key = Deno.env.get('ATTOM_API_KEY')
  if (!key) return { payload: null, error: 'ATTOM_API_KEY not set' }
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
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', apikey: key },
    })
    const raw = await res.json().catch(() => null)
    const code = raw?.status?.code
    const okEmpty =
      raw?.status?.msg === 'SuccessWithoutResult' || code === 400 || code === '400'
    if (!res.ok && !okEmpty) {
      return { payload: null, error: raw?.status?.msg || `ATTOM HTTP ${res.status}` }
    }
    const payload = Array.isArray(raw?.property) ? raw.property[0] ?? null : null
    if (!payload || typeof payload !== 'object') {
      return { payload: null, error: raw?.status?.msg || 'No ATTOM rows for this package' }
    }
    return { payload }
  } catch (error) {
    return {
      payload: null,
      error: error instanceof Error ? error.message : 'ATTOM package request failed',
    }
  }
}

async function fetchAttomPackageCached(
  match: ResolvedAddress,
  packageName: string,
  attomId?: number,
) {
  const spec = ATTOM_LAZY_PACKAGES[packageName]
  if (!spec) return { payload: null as Record<string, unknown> | null, error: 'Unknown ATTOM package' }
  const keys = [packageCacheKey(packageName, match, attomId)]
  if (attomId != null) keys.push(packageCacheKey(packageName, match))
  for (const cacheKey of keys) {
    const cached = await readPackageCache(cacheKey)
    if (cached) return { payload: cached }
  }
  const live = await fetchAttomRawPackage(match, spec, attomId)
  if (live.payload) {
    await writePackageCache(packageCacheKey(packageName, match, attomId), live.payload)
    if (attomId != null) {
      await writePackageCache(packageCacheKey(packageName, match), live.payload)
    }
  }
  return live
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnon) {
      return new Response(JSON.stringify({ error: 'Server is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as {
      query?: string
      mode?: 'search' | 'resolve' | 'package'
      attomPackage?: string
      attomId?: number
    }
    const query = (body.query || '').trim()
    const mode = body.mode === 'resolve' || body.mode === 'package' ? body.mode : 'search'

    if (query.length < 3) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const search = await searchAddressesForQuery(query)
    const matches = search.matches
    if (mode === 'search') {
      return new Response(
        JSON.stringify({
          matches,
          googleConfigured: search.googleConfigured,
          googleError: search.googleError,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let match = matches[0] ?? (await typedAddressMatch(query))
    if (!match) {
      return new Response(JSON.stringify({ match: null, matches: [], factsStatus: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'package') {
      const packageName = String(body.attomPackage || '')
      const attomId =
        typeof body.attomId === 'number' && Number.isFinite(body.attomId) ? body.attomId : undefined
      const packed = await fetchAttomPackageCached(match, packageName, attomId)
      return new Response(
        JSON.stringify({
          match,
          matches,
          packageId: packageName,
          packagePayload: packed.payload,
          attomError: packed.error ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const attom = await fetchAttomFactsCached(match)
    if (attom.property) {
      const queryHouse = query.trim().match(/^(\d+[A-Za-z]?)\b/)?.[1]
      const attomStreet =
        typeof attom.property.address === 'string' ? attom.property.address : null
      const attomHouse = attomStreet?.match(/^(\d+[A-Za-z]?)\b/)?.[1]
      if (attomStreet && (!queryHouse || !attomHouse || queryHouse === attomHouse)) {
        const city =
          typeof attom.property.city === 'string' ? attom.property.city : match.city
        const state =
          typeof attom.property.state === 'string' ? attom.property.state : match.state
        const zipCode =
          typeof attom.property.zipCode === 'string' ? attom.property.zipCode : match.zipCode
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
    }

    return new Response(
      JSON.stringify({
        match,
        matches,
        factsStatus: attom.factsStatus,
        property: attom.property ?? null,
        attomError: attom.attomError ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
