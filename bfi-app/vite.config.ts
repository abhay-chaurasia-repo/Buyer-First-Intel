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

/** Places API (New): Autocomplete + Place Details for US address suggestions. */
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

  return details.filter(Boolean) as ResolvedAddress[]
}

async function searchAddressesForQuery(
  query: string,
  googleApiKey: string | undefined,
): Promise<ResolvedAddress[]> {
  if (googleApiKey) {
    try {
      const google = await searchGooglePlaces(query, googleApiKey)
      if (google.length > 0) return google
    } catch {
      // fall through to Census
    }
  }
  return searchCensus(query)
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
    const parseGradeToken = (raw?: unknown) => {
      if (raw == null) return null
      const t = String(raw).trim().toUpperCase()
      if (!t) return null
      if (t === 'PK' || t === 'PREK' || t === 'PRE-K' || t === 'KG' || t === 'K') return 0
      const n = Number.parseInt(t, 10)
      return Number.isFinite(n) ? n : null
    }
    const inferLevel = (gradeLow?: string, gradeHigh?: string) => {
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
        const level = inferLevel(gradeLow || undefined, gradeHigh || undefined)
        return {
          id: `school-${item.geoIdV4 || index}`,
          name: titleCaseStreet(String(nameRaw)),
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
          geoIdV4: item.geoIdV4 ? String(item.geoIdV4) : undefined,
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

  const [profile, expanded, assessment, sale, history, permits, schools, assessmentHistory] =
    await Promise.all([
      load('property/basicprofile'),
      load('property/expandedprofile'),
      load('assessment/detail'),
      load('sale/detail'),
      load('saleshistory/expandedhistory'),
      load('property/buildingpermits'),
      load('property/detailwithschools', 'v4'),
      load('assessmenthistory/detail'),
    ])

  if (
    !profile &&
    !expanded &&
    !assessment &&
    !sale &&
    !history &&
    !permits &&
    !schools &&
    !assessmentHistory
  ) {
    return {
      ok: false as const,
      error:
        'No ATTOM match for basicprofile, expandedprofile, assessment, sales, permits, schools, or tax history',
    }
  }

  const merged: Record<string, unknown> = {
    ...(profile || {}),
    ...(expanded || {}),
  }
  const baseBuilding = (profile?.building || {}) as Record<string, unknown>
  const expandedBuilding = (expanded?.building || {}) as Record<string, unknown>
  const permitBuilding = (permits?.building || {}) as Record<string, unknown>
  merged.building = {
    ...baseBuilding,
    ...expandedBuilding,
    ...permitBuilding,
    size: {
      ...((baseBuilding.size || {}) as object),
      ...((expandedBuilding.size || {}) as object),
      ...((permitBuilding.size || {}) as object),
    },
    rooms: {
      ...((baseBuilding.rooms || {}) as object),
      ...((expandedBuilding.rooms || {}) as object),
    },
    construction: {
      ...((baseBuilding.construction || {}) as object),
      ...((expandedBuilding.construction || {}) as object),
    },
    parking: {
      ...((baseBuilding.parking || {}) as object),
      ...((expandedBuilding.parking || {}) as object),
    },
    interior: {
      ...((baseBuilding.interior || {}) as object),
      ...((expandedBuilding.interior || {}) as object),
    },
    summary: {
      ...((baseBuilding.summary || {}) as object),
      ...((expandedBuilding.summary || {}) as object),
    },
  }
  merged.summary = {
    ...((profile?.summary || {}) as object),
    ...((expanded?.summary || {}) as object),
    ...((permits?.summary || {}) as object),
  }
  merged.area = {
    ...((profile?.area || {}) as object),
    ...((expanded?.area || {}) as object),
  }
  merged.lot = {
    ...((profile?.lot || {}) as object),
    ...((expanded?.lot || {}) as object),
    ...((permits?.lot || {}) as object),
  }
  merged.utilities = {
    ...((profile?.utilities || {}) as object),
    ...((expanded?.utilities || {}) as object),
  }
  const baseAssessment = (profile?.assessment || {}) as Record<string, unknown>
  const expandedAssessment = (expanded?.assessment || {}) as Record<string, unknown>
  const nextAssessment = (assessment?.assessment || {}) as Record<string, unknown>
  if (
    Object.keys(baseAssessment).length ||
    Object.keys(expandedAssessment).length ||
    Object.keys(nextAssessment).length
  ) {
    merged.assessment = {
      ...baseAssessment,
      ...expandedAssessment,
      ...nextAssessment,
      owner: nextAssessment.owner || expandedAssessment.owner || baseAssessment.owner,
      assessed: nextAssessment.assessed || expandedAssessment.assessed || baseAssessment.assessed,
      market: nextAssessment.market || expandedAssessment.market || baseAssessment.market,
      tax: nextAssessment.tax || expandedAssessment.tax || baseAssessment.tax,
      mortgage: nextAssessment.mortgage || expandedAssessment.mortgage || baseAssessment.mortgage,
    }
  }
  if (sale?.sale || expanded?.sale || profile?.sale) {
    merged.sale = {
      ...((profile?.sale || {}) as object),
      ...((expanded?.sale || {}) as object),
      ...((sale?.sale || {}) as object),
    }
  }
  if (history?.saleHistory || history?.salehistory) {
    merged.saleHistory = history.saleHistory ?? history.salehistory
  }
  if (permits?.buildingPermits || permits?.buildingpermits) {
    merged.buildingPermits = permits.buildingPermits ?? permits.buildingpermits
  }
  if (Array.isArray(schools?.school)) {
    merged.school = schools.school
  }
  if (schools?.schoolDistrict) {
    merged.schoolDistrict = schools.schoolDistrict
  }
  if (assessmentHistory?.assessmentHistory || assessmentHistory?.assessmenthistory) {
    merged.assessmentHistory =
      assessmentHistory.assessmentHistory ?? assessmentHistory.assessmenthistory
  }
  if (history?.owner && !(merged.assessment as { owner?: unknown } | undefined)?.owner) {
    merged.assessment = {
      ...((merged.assessment as Record<string, unknown> | undefined) || {}),
      owner: history.owner,
    }
  }
  if (!merged.identifier) {
    merged.identifier =
      profile?.identifier ||
      expanded?.identifier ||
      assessment?.identifier ||
      sale?.identifier ||
      history?.identifier ||
      permits?.identifier ||
      schools?.identifier ||
      assessmentHistory?.identifier
  }
  if (!merged.address) {
    merged.address =
      profile?.address ||
      expanded?.address ||
      assessment?.address ||
      sale?.address ||
      history?.address ||
      permits?.address ||
      schools?.address ||
      assessmentHistory?.address
  }
  if (!merged.location) {
    merged.location =
      profile?.location ||
      expanded?.location ||
      assessment?.location ||
      sale?.location ||
      history?.location ||
      permits?.location ||
      schools?.location ||
      assessmentHistory?.location
  }

  return { ok: true as const, property: mapAttomProperty(merged) }
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
    let body: { query?: string; mode?: string } = {}
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as typeof body
    } catch {
      body = {}
    }

    const query = (body.query || '').trim()
    const mode = body.mode === 'resolve' ? 'resolve' : 'search'
    // Google handles shorter partials better than Census (min 3).
    if (query.length < 3) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ matches: [] }))
      return
    }

    const matches = await searchAddressesForQuery(query, googleMapsApiKey)
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
