/**
 * Map ATTOM Expanded Profile / Detail payloads into Due Diligence property fields.
 * Shared by the Vite /api proxy (dev) — Edge Function keeps a Deno copy in sync.
 */

import type { MockProperty, PropertySaleEvent } from '@/data/mockProperty'
import { titleCaseStreet } from '@/lib/addressSearch'

type AttomOwner = {
  fullName?: string
  fullname?: string
  lastName?: string
  firstNameAndMi?: string
}

type AttomProperty = {
  identifier?: {
    attomId?: number
    Id?: number
    apn?: string
    fips?: string
  }
  address?: {
    line1?: string
    line2?: string
    locality?: string
    countrySubd?: string
    postal1?: string
    oneLine?: string
  }
  location?: {
    latitude?: string | number
    longitude?: string | number
  }
  summary?: {
    yearBuilt?: number
    yearbuilt?: number
    absenteeInd?: string
    propclass?: string
    propClass?: string
    propertyType?: string
  }
  building?: {
    size?: {
      livingSize?: number
      livingsize?: number
      universalsize?: number
      universalSize?: number
      bldgsize?: number
      bldgSize?: number
    }
    rooms?: {
      beds?: number
      bathsTotal?: number
      bathstotal?: number
      bathsfull?: number
      bathsFull?: number
    }
  }
  lot?: {
    lotsize2?: number
    lotSize2?: number
    lotsize1?: number
    lotSize1?: number
    siteZoningIdent?: string
    zoningType?: string
  }
  assessment?: {
    owner?: {
      owner1?: AttomOwner
      owner2?: AttomOwner
      absenteeOwnerStatus?: string
    }
    assessed?: Record<string, unknown>
    market?: Record<string, unknown>
    tax?: Record<string, unknown>
  }
  sale?: {
    saleTransDate?: string
    saleSearchDate?: string
    salesearchdate?: string
    amount?: Record<string, unknown>
    calculation?: Record<string, unknown>
  }
  salehistory?: unknown
  saleHistory?: unknown
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function titleCaseName(raw: string) {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2 && part === part.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

function ownerDisplay(assessment?: AttomProperty['assessment']) {
  const o1 = assessment?.owner?.owner1 as AttomOwner & { fullname?: string } | undefined
  const o2 = assessment?.owner?.owner2 as AttomOwner & { fullname?: string } | undefined
  const names = [o1?.fullName || o1?.fullname, o2?.fullName || o2?.fullname]
    .filter(Boolean)
    .map((n) => titleCaseName(String(n)))
  if (names.length === 0) return undefined
  return names.join(' & ')
}

function moneyLabel(value: number | undefined, fallback: string) {
  if (value == null || !Number.isFinite(value)) return fallback
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function livingSqft(building?: AttomProperty['building']) {
  return (
    num(building?.size?.livingSize) ??
    num(building?.size?.livingsize) ??
    num(building?.size?.universalSize) ??
    num(building?.size?.universalsize) ??
    num(building?.size?.bldgSize) ??
    num(building?.size?.bldgsize)
  )
}

function baths(building?: AttomProperty['building']) {
  return (
    num(building?.rooms?.bathsTotal) ??
    num(building?.rooms?.bathstotal) ??
    num(building?.rooms?.bathsFull) ??
    num(building?.rooms?.bathsfull)
  )
}

function lotSqft(lot?: AttomProperty['lot']) {
  const sqft = num(lot?.lotSize2) ?? num(lot?.lotsize2)
  if (sqft && sqft > 0) return Math.round(sqft)
  const acres = num(lot?.lotSize1) ?? num(lot?.lotsize1)
  if (acres && acres > 0) return Math.round(acres * 43560)
  return undefined
}

export function pickAttomProperty(payload: unknown): AttomProperty | null {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as { property?: AttomProperty[]; status?: { msg?: string } }
  const first = Array.isArray(root.property) ? root.property[0] : null
  return first ?? null
}

function fromRecord(block: Record<string, unknown> | undefined, ...keys: string[]) {
  if (!block) return undefined
  for (const key of keys) {
    if (key in block) {
      const value = num(block[key])
      if (value != null) return value
    }
  }
  return undefined
}

function stringFromRecord(block: Record<string, unknown> | undefined, ...keys: string[]) {
  if (!block) return undefined
  for (const key of keys) {
    const value = block[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

export function mapAttomToPropertyFields(attom: AttomProperty): Partial<MockProperty> {
  const sqft = livingSqft(attom.building)
  const beds = num(attom.building?.rooms?.beds)
  const bath = baths(attom.building)
  const yearBuilt = num(attom.summary?.yearBuilt) ?? num(attom.summary?.yearbuilt)
  const lot = lotSqft(attom.lot)
  const apn = attom.identifier?.apn
  const zoning =
    attom.lot?.siteZoningIdent ||
    attom.lot?.zoningType ||
    attom.summary?.propClass ||
    attom.summary?.propclass ||
    attom.summary?.propertyType

  const assessed = attom.assessment?.assessed
  const market = attom.assessment?.market
  const tax = attom.assessment?.tax
  const taxYear = fromRecord(tax, 'taxYear', 'taxyear')
  const assessedTotal = fromRecord(assessed, 'assdTtlValue', 'assdttlvalue')
  const land =
    fromRecord(market, 'mktLandValue', 'mktlandvalue') ??
    fromRecord(assessed, 'assdLandValue', 'assdlandvalue')
  const improvement = fromRecord(market, 'mktImprValue', 'mktimprvalue')
  const taxAmt = fromRecord(tax, 'taxAmt', 'taxamt')
  const marketTotal = fromRecord(market, 'mktTtlValue', 'mktttlvalue')

  const saleAmount = attom.sale?.amount
  const saleDate =
    attom.sale?.saleTransDate ||
    stringFromRecord(saleAmount, 'saleRecDate', 'salerecdate') ||
    attom.sale?.saleSearchDate ||
    attom.sale?.salesearchdate

  const absentee = (attom.summary?.absenteeInd || '').toUpperCase()
  const ownerOccupied =
    absentee.includes('OWNER') || attom.assessment?.owner?.absenteeOwnerStatus === 'O'

  const lat = num(attom.location?.latitude)
  const lng = num(attom.location?.longitude)

  const fields: Partial<MockProperty> = {
    factsStatus: 'live',
    addressSource: 'edge',
    // Buyer-first: never surface sale price from ATTOM
    lastSalePriceLabel: 'Not shown (buyer-first)',
  }

  const line1 = attom.address?.line1?.trim()
  const locality = attom.address?.locality?.trim()
  const stateAbbr = attom.address?.countrySubd?.trim()
  const postal = attom.address?.postal1?.trim()
  if (line1) fields.address = titleCaseStreet(line1)
  if (locality) fields.city = titleCaseStreet(locality)
  if (stateAbbr) fields.state = stateAbbr.toUpperCase().slice(0, 2)
  if (postal) fields.zipCode = postal.split('-')[0]!.trim()

  if (sqft != null) fields.sqft = Math.round(sqft)
  if (beds != null) fields.bedrooms = beds
  if (bath != null) fields.bathrooms = bath
  if (yearBuilt != null) fields.yearBuilt = Math.round(yearBuilt)
  if (lot != null) fields.lotSizeSqft = lot
  if (apn) fields.apn = apn
  if (zoning) fields.zoning = String(zoning)
  if (taxYear != null) fields.taxYear = Math.round(taxYear)
  if (assessedTotal != null) {
    fields.taxAssessedValueLabel = `Assessed ${moneyLabel(assessedTotal, '')} · ${fields.taxYear ?? 'county'}`.trim()
  } else if (taxYear != null) {
    fields.taxAssessedValueLabel = `County assessed · ${Math.round(taxYear)}`
  }
  if (land != null) fields.taxLandLabel = moneyLabel(land, '—')
  if (improvement != null) fields.taxImprovementLabel = moneyLabel(improvement, '—')
  if (taxAmt != null) fields.taxAmountLabel = moneyLabel(taxAmt, '—')
  if (marketTotal != null) fields.marketValueLabel = moneyLabel(marketTotal, '—')

  const owner = ownerDisplay(attom.assessment)
  if (owner) fields.ownerName = owner
  fields.ownerOccupied = Boolean(ownerOccupied)

  if (saleDate) fields.lastSaleDate = String(saleDate).slice(0, 10)
  const deedType = stringFromRecord(saleAmount, 'saleTransType', 'saletranstype')
  if (deedType) fields.deedType = deedType
  else if (attom.sale) fields.deedType = 'Recorded transfer'
  const docNum = stringFromRecord(saleAmount, 'saleDocNum', 'saledocnum')
  if (docNum) fields.saleDocumentNumber = docNum

  if (lat != null) fields.lat = lat
  if (lng != null) fields.lng = lng

  const attomId = attom.identifier?.attomId ?? attom.identifier?.Id
  if (attomId != null) fields.attomId = attomId

  // Listing "claimed" size is not an ATTOM field — clear demo discrepancy
  fields.claimedSqft = undefined

  const history = mapAttomSalesHistory(attom)
  if (history.length > 0) fields.salesHistory = history

  return fields
}

type AttomSaleHistoryRow = {
  sequence?: number
  saleTransDate?: string
  saleSearchDate?: string
  buyerName?: string
  sellerName?: string
  amount?: Record<string, unknown>
}

export function mapAttomSalesHistory(attom: AttomProperty | Record<string, unknown>): PropertySaleEvent[] {
  const root = attom as AttomProperty & Record<string, unknown>
  const raw = root.saleHistory ?? root.salehistory
  if (!Array.isArray(raw)) return []

  const events: PropertySaleEvent[] = []
  for (const [index, row] of (raw as AttomSaleHistoryRow[]).entries()) {
    if (!row || typeof row !== 'object') continue
    const amount = row.amount || {}
    const date =
      row.saleTransDate ||
      stringFromRecord(amount, 'saleRecDate', 'salerecdate') ||
      row.saleSearchDate
    if (!date) continue
    const deedType =
      stringFromRecord(amount, 'saleTransType', 'saletranstype', 'deedType', 'deedtype') ||
      'Recorded transfer'
    const documentNumber = stringFromRecord(amount, 'saleDocNum', 'saledocnum')
    events.push({
      id: `sale-${row.sequence ?? index}-${String(date).slice(0, 10)}`,
      date: String(date).slice(0, 10),
      recordedDate: stringFromRecord(amount, 'saleRecDate', 'salerecdate')?.slice(0, 10),
      deedType,
      documentNumber,
      buyerName: row.buyerName?.replace(/,/g, ', ').replace(/\s+/g, ' ').trim(),
      sellerName: row.sellerName?.replace(/,/g, ', ').replace(/\s+/g, ' ').trim(),
      amountLabel: 'Not shown (buyer-first)',
    })
  }
  return events
}

async function fetchAttomPackage(
  packagePath: string,
  params: {
    apiKey: string
    attomId?: number | string
    street?: string
    city?: string
    state?: string
    zipCode?: string
  },
): Promise<AttomProperty | null> {
  const url = new URL(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/${packagePath}`)
  if (params.attomId != null && String(params.attomId).trim()) {
    url.searchParams.set('attomid', String(params.attomId))
  } else if (params.street && params.city && params.state) {
    url.searchParams.set('address1', params.street)
    url.searchParams.set(
      'address2',
      [params.city, params.state, params.zipCode].filter(Boolean).join(', '),
    )
  } else {
    return null
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', apikey: params.apiKey },
    })
    const raw = await res.json().catch(() => null)
    if (!res.ok) return null
    return pickAttomProperty(raw)
  } catch {
    return null
  }
}

export async function fetchAttomIdByAddress(params: {
  apiKey: string
  street: string
  city: string
  state: string
  zipCode?: string
}): Promise<{ ok: true; attomId: number; property: AttomProperty } | { ok: false; error: string }> {
  const address2 = [params.city, params.state, params.zipCode].filter(Boolean).join(', ')
  const url = new URL('https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/address')
  url.searchParams.set('address1', params.street)
  url.searchParams.set('address2', address2)

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      apikey: params.apiKey,
    },
  })
  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    return { ok: false, error: `ATTOM address HTTP ${res.status}` }
  }

  const property = pickAttomProperty(raw)
  const attomId = property?.identifier?.attomId ?? property?.identifier?.Id
  if (!property || attomId == null) {
    const msg = (raw as { status?: { msg?: string } } | null)?.status?.msg || 'No ATTOM id'
    return { ok: false, error: msg }
  }

  return { ok: true, attomId: Number(attomId), property }
}

/**
 * County facts via ATTOM Property Detail
 * Docs: GET /propertyapi/v1.0.0/property/detail
 * Accepts attomid OR address1+address2 (same endpoint the interactive docs exercise).
 */
export async function fetchAttomPropertyDetail(params: {
  apiKey: string
  attomId?: number | string
  street?: string
  city?: string
  state?: string
  zipCode?: string
}): Promise<{ ok: true; property: AttomProperty } | { ok: false; error: string }> {
  const url = new URL('https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail')
  if (params.attomId != null && String(params.attomId).trim()) {
    url.searchParams.set('attomid', String(params.attomId))
  } else if (params.street && params.city && params.state) {
    url.searchParams.set('address1', params.street)
    url.searchParams.set(
      'address2',
      [params.city, params.state, params.zipCode].filter(Boolean).join(', '),
    )
  } else {
    return { ok: false, error: 'ATTOM detail needs attomid or address1+address2' }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      apikey: params.apiKey,
    },
  })
  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    return { ok: false, error: `ATTOM detail HTTP ${res.status}` }
  }

  const property = pickAttomProperty(raw)
  if (!property) {
    const msg = (raw as { status?: { msg?: string } } | null)?.status?.msg || 'No ATTOM detail'
    return { ok: false, error: msg }
  }

  return { ok: true, property }
}

/**
 * County facts + tax assessment + sale / sales history.
 * Parallel ATTOM packages per interactive docs:
 * - /property/detail
 * - /assessment/detail
 * - /sale/detail
 * - /saleshistory/expandedhistory
 */
export async function fetchAttomCountyFacts(params: {
  apiKey: string
  street: string
  city: string
  state: string
  zipCode?: string
  attomId?: number | string
}): Promise<
  | {
      ok: true
      property: AttomProperty
      fields: Partial<MockProperty>
      attomId?: number
      warnings: string[]
    }
  | { ok: false; error: string }
> {
  const lookup = {
    apiKey: params.apiKey,
    attomId: params.attomId,
    street: params.street,
    city: params.city,
    state: params.state,
    zipCode: params.zipCode,
  }

  const [detail, assessment, sale, history] = await Promise.all([
    fetchAttomPackage('property/detail', lookup),
    fetchAttomPackage('assessment/detail', lookup),
    fetchAttomPackage('sale/detail', lookup),
    fetchAttomPackage('saleshistory/expandedhistory', lookup),
  ])

  if (!detail && !assessment && !sale && !history) {
    return { ok: false, error: 'No ATTOM match for detail, assessment, or sales' }
  }

  const merged: AttomProperty = {
    ...(detail || {}),
    ...(assessment ? { assessment: assessment.assessment, identifier: assessment.identifier || detail?.identifier } : {}),
    ...(sale ? { sale: sale.sale, identifier: sale.identifier || detail?.identifier } : {}),
    ...(history
      ? {
          saleHistory: history.saleHistory ?? history.salehistory,
          identifier: history.identifier || detail?.identifier,
        }
      : {}),
    address: detail?.address || assessment?.address || sale?.address || history?.address,
    location: detail?.location || assessment?.location || sale?.location || history?.location,
    building: detail?.building || assessment?.building || sale?.building,
    lot: detail?.lot || assessment?.lot || sale?.lot,
    summary: detail?.summary || assessment?.summary || sale?.summary || history?.summary,
    identifier:
      detail?.identifier ||
      assessment?.identifier ||
      sale?.identifier ||
      history?.identifier,
  }

  // Prefer owner names from expanded sales history when present
  const historyOwner = (history as { owner?: NonNullable<AttomProperty['assessment']>['owner'] } | null)
    ?.owner
  if (historyOwner) {
    merged.assessment = {
      ...(merged.assessment || {}),
      owner: historyOwner,
    }
  }

  const fields = mapAttomToPropertyFields(merged)
  const warnings: string[] = []
  if (!detail) warnings.push('property/detail unavailable')
  if (!assessment) warnings.push('assessment/detail unavailable')
  if (!sale && !history) warnings.push('sale/saleshistory unavailable')

  const attomId = merged.identifier?.attomId ?? merged.identifier?.Id
  return {
    ok: true,
    property: merged,
    fields,
    attomId: attomId != null ? Number(attomId) : undefined,
    warnings,
  }
}

/** @deprecated use fetchAttomCountyFacts — kept for older call sites */
export async function fetchAttomExpandedProfile(params: {
  apiKey: string
  street: string
  city: string
  state: string
  zipCode?: string
}): Promise<{ ok: true; property: AttomProperty } | { ok: false; error: string }> {
  const result = await fetchAttomCountyFacts(params)
  if (!result.ok) return result
  return { ok: true, property: result.property }
}
