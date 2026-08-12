// Supabase Edge Function: address search + ATTOM expanded profile
// Deploy: supabase functions deploy property-lookup
// Secrets: supabase secrets set ATTOM_API_KEY=...
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
  source: 'census' | 'edge'
  matchedAddress?: string
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

    // fromAddress/toAddress are TIGER range ends — parse house from matchedAddress
    const house = houseNumberFromMatchedAddress(match.matchedAddress) || c.fromAddress
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
  const location = (attom.location || {}) as Record<string, unknown>

  const sqft =
    num(size.livingSize) ??
    num(size.universalSize) ??
    num(size.universalsize) ??
    num(size.bldgSize) ??
    num(size.bldgsize)
  const beds = num(rooms.beds)
  const baths =
    num(rooms.bathsTotal) ?? num(rooms.bathstotal) ?? num(rooms.bathsFull) ?? num(rooms.bathsfull)
  const yearBuilt = num(summary.yearBuilt)
  let lotSqft = num(lot.lotSize2) ?? num(lot.lotsize2)
  if (!lotSqft) {
    const acres = num(lot.lotSize1) ?? num(lot.lotsize1)
    if (acres) lotSqft = Math.round(acres * 43560)
  }

  const names = [owner1.fullName, owner2.fullName]
    .filter(Boolean)
    .map((n) => titleCaseStreet(String(n)))
  const absentee = String(summary.absenteeInd || '').toUpperCase()
  const taxYear = num(tax.taxYear)
  const assessedTotal = num(assessed.assdTtlValue)
  const land = num(market.mktLandValue) ?? num(assessed.assdLandValue)
  const improvement = num(market.mktImprValue)

  const fields: Record<string, unknown> = {
    factsStatus: 'live',
    addressSource: 'edge',
    lastSalePriceLabel: 'Not shown (buyer-first)',
    claimedSqft: undefined,
    ownerOccupied: absentee.includes('OWNER') || ownerBlock.absenteeOwnerStatus === 'O',
  }

  if (sqft != null) fields.sqft = Math.round(sqft)
  if (beds != null) fields.bedrooms = beds
  if (baths != null) fields.bathrooms = baths
  if (yearBuilt != null) fields.yearBuilt = Math.round(yearBuilt)
  if (lotSqft != null) fields.lotSizeSqft = Math.round(lotSqft)
  if (identifier.apn) fields.apn = identifier.apn
  fields.zoning =
    lot.siteZoningIdent || lot.zoningType || summary.propClass || summary.propclass || summary.propertyType
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
  if (names.length) fields.ownerName = names.join(' & ')
  const saleDate = sale.saleTransDate || saleAmount.saleRecDate || sale.saleSearchDate
  if (saleDate) fields.lastSaleDate = String(saleDate).slice(0, 10)
  if (saleAmount.saleTransType) fields.deedType = String(saleAmount.saleTransType)
  else if (sale && Object.keys(sale).length) fields.deedType = 'Recorded transfer'
  if (saleAmount.saleDocNum) fields.saleDocumentNumber = String(saleAmount.saleDocNum)
  const lat = num(location.latitude)
  const lng = num(location.longitude)
  if (lat != null) fields.lat = lat
  if (lng != null) fields.lng = lng
  const attomId = identifier.attomId ?? identifier.Id
  if (attomId != null) fields.attomId = attomId

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
  const url = new URL('https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile')
  url.searchParams.set('address1', match.street)
  url.searchParams.set('address2', address2)

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      apikey: key,
    },
  })
  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    return { factsStatus: 'pending', attomError: `ATTOM HTTP ${res.status}` }
  }

  const first = Array.isArray(raw?.property) ? raw.property[0] : null
  if (!first) {
    return {
      factsStatus: 'pending',
      attomError: raw?.status?.msg || 'No ATTOM match',
    }
  }

  return {
    factsStatus: 'live',
    property: mapAttomProperty(first),
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

    if (query.length < 4) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const matches = await searchCensus(query)
    if (mode === 'search') {
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const match = matches[0] ?? null
    if (!match) {
      return new Response(JSON.stringify({ match: null, matches: [], factsStatus: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attom = await fetchAttomFacts(match)
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
