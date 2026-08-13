// Supabase Edge Function: address search (Google Places + Census) + ATTOM
// Deploy: supabase functions deploy property-lookup
// Secrets: supabase secrets set ATTOM_API_KEY=... GOOGLE_MAPS_API_KEY=...
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

function googlePlaceToResolved(
  placeId: string,
  place: {
    formattedAddress?: string
    addressComponents?: GoogleAddressComponent[]
    location?: { latitude?: number; longitude?: number }
  },
): ResolvedAddress | null {
  const components = place.addressComponents || []
  const streetNumber = componentByType(components, 'street_number')?.longText || ''
  const route = componentByType(components, 'route')?.longText || ''
  const street = titleCaseStreet([streetNumber, route].filter(Boolean).join(' '))
  if (!street) return null

  const city =
    componentByType(components, 'locality')?.longText ||
    componentByType(components, 'sublocality')?.longText ||
    componentByType(components, 'neighborhood')?.longText ||
    componentByType(components, 'administrative_area_level_3')?.longText ||
    ''
  const state =
    componentByType(components, 'administrative_area_level_1')?.shortText ||
    componentByType(components, 'administrative_area_level_1')?.longText ||
    ''
  const zipCode = (componentByType(components, 'postal_code')?.longText || '').trim()
  if (!city || !state) return null

  const lat = num(place.location?.latitude) ?? 0
  const lng = num(place.location?.longitude) ?? 0
  const stateAbbr = state.toUpperCase().slice(0, 2)
  const cityTitle = titleCaseStreet(city)
  const formatted = zipCode
    ? `${street}, ${cityTitle}, ${stateAbbr} ${zipCode}`
    : `${street}, ${cityTitle}, ${stateAbbr}`

  return {
    id: stableAddressId({ street, city: cityTitle, state: stateAbbr, zipCode }),
    formatted,
    street,
    city: cityTitle,
    state: stateAbbr,
    zipCode,
    lat,
    lng,
    source: 'google',
    matchedAddress: place.formattedAddress || formatted,
    placeId,
  }
}

async function searchGooglePlaces(query: string, apiKey: string): Promise<ResolvedAddress[]> {
  const autoRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ['us'],
      languageCode: 'en',
    }),
  })
  if (!autoRes.ok) return []
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
  if (placeIds.length === 0) return []

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

  return details.filter(Boolean) as ResolvedAddress[]
}

async function searchAddressesForQuery(query: string): Promise<ResolvedAddress[]> {
  const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
  if (googleKey) {
    try {
      const google = await searchGooglePlaces(query, googleKey)
      if (google.length > 0) return google
    } catch {
      // fall through
    }
  }
  return searchCensus(query)
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
    lastSalePriceLabel: 'Not shown (buyer-first)',
    claimedSqft: undefined,
    ownerOccupied: absentee.includes('OWNER') || ownerBlock.absenteeOwnerStatus === 'O',
  }

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
        const date =
          item.saleTransDate || amount.saleRecDate || amount.salerecdate || item.saleSearchDate
        if (!date) return null
        return {
          id: `sale-${item.sequence ?? index}-${String(date).slice(0, 10)}`,
          date: String(date).slice(0, 10),
          recordedDate: amount.saleRecDate || amount.salerecdate
            ? String(amount.saleRecDate || amount.salerecdate).slice(0, 10)
            : undefined,
          deedType: String(
            amount.saleTransType || amount.saletranstype || amount.deedType || 'Recorded transfer',
          ),
          documentNumber:
            amount.saleDocNum || amount.saledocnum
              ? String(amount.saleDocNum || amount.saledocnum)
              : undefined,
          buyerName:
            typeof item.buyerName === 'string'
              ? item.buyerName.replace(/,/g, ', ').replace(/\s+/g, ' ').trim()
              : undefined,
          sellerName:
            typeof item.sellerName === 'string'
              ? item.sellerName.replace(/,/g, ', ').replace(/\s+/g, ' ').trim()
              : undefined,
          amountLabel: 'Not shown (buyer-first)',
        }
      })
      .filter(Boolean)
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

  async function load(packagePath: string) {
    const url = new URL(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/${packagePath}`)
    url.searchParams.set('address1', match.street)
    url.searchParams.set('address2', address2)
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json', apikey: key },
      })
      const raw = await res.json().catch(() => null)
      if (!res.ok) return null
      return Array.isArray(raw?.property) ? raw.property[0] ?? null : null
    } catch {
      return null
    }
  }

  const [profile, assessment, sale, history] = await Promise.all([
    load('property/basicprofile'),
    load('assessment/detail'),
    load('sale/detail'),
    load('saleshistory/expandedhistory'),
  ])

  if (!profile && !assessment && !sale && !history) {
    return {
      factsStatus: 'pending',
      attomError: 'No ATTOM match for basicprofile, assessment, or sales',
    }
  }

  const merged: Record<string, unknown> = { ...(profile || {}) }
  const baseAssessment = (profile?.assessment || {}) as Record<string, unknown>
  const nextAssessment = (assessment?.assessment || {}) as Record<string, unknown>
  if (Object.keys(baseAssessment).length || Object.keys(nextAssessment).length) {
    merged.assessment = {
      ...baseAssessment,
      ...nextAssessment,
      owner: nextAssessment.owner || baseAssessment.owner,
      assessed: nextAssessment.assessed || baseAssessment.assessed,
      market: nextAssessment.market || baseAssessment.market,
      tax: nextAssessment.tax || baseAssessment.tax,
    }
  }
  if (sale?.sale || profile?.sale) merged.sale = sale?.sale || profile?.sale
  if (history?.saleHistory || history?.salehistory) {
    merged.saleHistory = history.saleHistory ?? history.salehistory
  }
  if (history?.owner && !(merged.assessment as { owner?: unknown } | undefined)?.owner) {
    merged.assessment = {
      ...((merged.assessment as Record<string, unknown> | undefined) || {}),
      owner: history.owner,
    }
  }
  if (!merged.identifier) {
    merged.identifier =
      profile?.identifier || assessment?.identifier || sale?.identifier || history?.identifier
  }
  if (!merged.address) {
    merged.address = profile?.address || assessment?.address || sale?.address || history?.address
  }
  if (!merged.location) {
    merged.location =
      profile?.location || assessment?.location || sale?.location || history?.location
  }
  if (!merged.building) {
    merged.building = profile?.building || assessment?.building || sale?.building
  }
  if (!merged.summary) {
    merged.summary = profile?.summary || assessment?.summary || sale?.summary || history?.summary
  }

  return {
    factsStatus: 'live',
    property: mapAttomProperty(merged),
  }
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

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as {
      query?: string
      mode?: 'search' | 'resolve'
    }
    const query = (body.query || '').trim()
    const mode = body.mode === 'resolve' ? 'resolve' : 'search'

    if (query.length < 3) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const matches = await searchAddressesForQuery(query)
    if (mode === 'search') {
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let match = matches[0] ?? null
    if (!match) {
      return new Response(JSON.stringify({ match: null, matches: [], factsStatus: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attom = await fetchAttomFacts(match)
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
