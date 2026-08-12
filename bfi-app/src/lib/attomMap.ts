/**
 * Map ATTOM Expanded Profile / Detail payloads into Due Diligence property fields.
 * Shared by the Vite /api proxy (dev) — Edge Function keeps a Deno copy in sync.
 */

import type { MockProperty } from '@/data/mockProperty'
import { titleCaseStreet } from '@/lib/addressSearch'

type AttomOwner = {
  fullName?: string
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
    assessed?: {
      assdTtlValue?: number
      assdLandValue?: number
    }
    market?: {
      mktTtlValue?: number
      mktLandValue?: number
      mktImprValue?: number
    }
    tax?: {
      taxAmt?: number
      taxYear?: number
    }
  }
  sale?: {
    saleTransDate?: string
    saleSearchDate?: string
    amount?: {
      saleRecDate?: string
      saleDocNum?: string
      saleTransType?: string
    }
    calculation?: Record<string, unknown>
  }
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
  const o1 = assessment?.owner?.owner1
  const o2 = assessment?.owner?.owner2
  const names = [o1?.fullName, o2?.fullName].filter(Boolean).map((n) => titleCaseName(String(n)))
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

  const taxYear = num(attom.assessment?.tax?.taxYear)
  const assessed = num(attom.assessment?.assessed?.assdTtlValue)
  const land = num(attom.assessment?.market?.mktLandValue) ?? num(attom.assessment?.assessed?.assdLandValue)
  const improvement = num(attom.assessment?.market?.mktImprValue)

  const saleDate =
    attom.sale?.saleTransDate ||
    attom.sale?.amount?.saleRecDate ||
    attom.sale?.saleSearchDate

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
  if (assessed != null) {
    fields.taxAssessedValueLabel = `Assessed ${moneyLabel(assessed, '')} · ${fields.taxYear ?? 'county'}`.trim()
  } else if (taxYear != null) {
    fields.taxAssessedValueLabel = `County assessed · ${Math.round(taxYear)}`
  }
  if (land != null) fields.taxLandLabel = moneyLabel(land, '—')
  if (improvement != null) fields.taxImprovementLabel = moneyLabel(improvement, '—')

  const owner = ownerDisplay(attom.assessment)
  if (owner) fields.ownerName = owner
  fields.ownerOccupied = Boolean(ownerOccupied)

  if (saleDate) fields.lastSaleDate = String(saleDate).slice(0, 10)
  if (attom.sale?.amount?.saleTransType) {
    fields.deedType = String(attom.sale.amount.saleTransType)
  } else if (attom.sale) {
    fields.deedType = 'Recorded transfer'
  }
  if (attom.sale?.amount?.saleDocNum) {
    fields.saleDocumentNumber = String(attom.sale.amount.saleDocNum)
  }

  if (lat != null) fields.lat = lat
  if (lng != null) fields.lng = lng

  const attomId = attom.identifier?.attomId ?? attom.identifier?.Id
  if (attomId != null) fields.attomId = attomId

  // Listing "claimed" size is not an ATTOM field — clear demo discrepancy
  fields.claimedSqft = undefined

  return fields
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

/** County facts via ATTOM Property Detail (`GET /property/detail?attomid=`). */
export async function fetchAttomPropertyDetail(params: {
  apiKey: string
  attomId: number | string
}): Promise<{ ok: true; property: AttomProperty } | { ok: false; error: string }> {
  const url = new URL('https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail')
  url.searchParams.set('attomid', String(params.attomId))

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
 * Resolve ATTOM id from address, then load county facts from Property Detail.
 */
export async function fetchAttomCountyFacts(params: {
  apiKey: string
  street: string
  city: string
  state: string
  zipCode?: string
}): Promise<{ ok: true; property: AttomProperty; attomId: number } | { ok: false; error: string }> {
  const idHit = await fetchAttomIdByAddress(params)
  if (!idHit.ok) return idHit

  const detail = await fetchAttomPropertyDetail({
    apiKey: params.apiKey,
    attomId: idHit.attomId,
  })
  if (!detail.ok) return detail

  return { ok: true, property: detail.property, attomId: idHit.attomId }
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
