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
  if (!lotSqft) {
    const acres = num(lot.lotSize1) ?? num(lot.lotsize1)
    if (acres) lotSqft = Math.round(acres * 43560)
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
  if (identifier.apn) fields.apn = identifier.apn
  fields.zoning =
    lot.siteZoningIdent ||
    lot.zoningType ||
    summary.propClass ||
    summary.propclass ||
    summary.propertyType
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
        const date =
          item.saleTransDate ||
          amount.saleRecDate ||
          amount.salerecdate ||
          item.saleSearchDate
        if (!date) return null
        return {
          id: `sale-${item.sequence ?? index}-${String(date).slice(0, 10)}`,
          date: String(date).slice(0, 10),
          recordedDate: amount.saleRecDate || amount.salerecdate
            ? String(amount.saleRecDate || amount.salerecdate).slice(0, 10)
            : undefined,
          deedType: String(
            amount.saleTransType ||
              amount.saletranstype ||
              amount.deedType ||
              'Recorded transfer',
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

async function fetchAttom(match: ResolvedAddress, apiKey: string) {
  const address2 = [match.city, match.state, match.zipCode].filter(Boolean).join(', ')

  async function load(packagePath: string) {
    const url = new URL(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/${packagePath}`)
    url.searchParams.set('address1', match.street)
    url.searchParams.set('address2', address2)
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', apikey: apiKey },
      })
      const raw = (await res.json().catch(() => null)) as {
        property?: Record<string, unknown>[]
        status?: { msg?: string }
      } | null
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
      ok: false as const,
      error: 'No ATTOM match for basicprofile, assessment, or sales',
    }
  }

  const merged: Record<string, unknown> = {
    ...(profile || {}),
  }
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

  return { ok: true as const, property: mapAttomProperty(merged) }
}

/**
 * Dev/preview proxy for property lookup + ATTOM.
 * Keeps ATTOM_API_KEY on the server (never VITE_* / never in the browser bundle).
 */
function propertyLookupApiPlugin(attomApiKey: string | undefined): Plugin {
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
    let body: { query?: string; mode?: string } = {}
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as typeof body
    } catch {
      body = {}
    }

    const query = (body.query || '').trim()
    const mode = body.mode === 'resolve' ? 'resolve' : 'search'
    if (query.length < 4) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ matches: [] }))
      return
    }

    const matches = await searchCensus(query)
    if (mode === 'search') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ matches }))
      return
    }

    let match = matches[0] ?? null
    if (!match) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ match: null, matches: [], factsStatus: 'pending' }))
      return
    }

    let factsStatus: 'pending' | 'live' = 'pending'
    let property: Record<string, unknown> | null = null
    let attomError: string | null = null

    if (attomApiKey) {
      const attom = await fetchAttom(match, attomApiKey)
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
        match: { ...match, source: 'edge' },
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

  return {
    plugins: [react(), tailwindcss(), propertyLookupApiPlugin(attomApiKey)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
