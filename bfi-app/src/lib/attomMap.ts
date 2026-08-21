/**
 * Map ATTOM Expanded Profile / Detail payloads into Due Diligence property fields.
 * Shared by the Vite /api proxy (dev) — Edge Function keeps a Deno copy in sync.
 */

import type {
  BuildingPermit,
  MockProperty,
  PropertySaleEvent,
  PropertySchool,
  PropertySchoolDistrict,
  PropertyTaxYear,
} from '@/data/mockProperty'
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
    accuracy?: string
  }
  summary?: {
    yearBuilt?: number
    yearbuilt?: number
    absenteeInd?: string
    propclass?: string
    propClass?: string
    propertyType?: string
    propType?: string
    legal1?: string
    archStyle?: string
    quitClaimFlag?: string | boolean
    REOflag?: string | boolean
  }
  area?: {
    countrySecSubd?: string
    subdName?: string
    munName?: string
    taxCodeArea?: string | number
  }
  utilities?: {
    coolingType?: string
    heatingFuel?: string
    heatingType?: string
    wallType?: string
  }
  building?: {
    size?: {
      livingSize?: number
      livingsize?: number
      universalsize?: number
      universalSize?: number
      bldgsize?: number
      bldgSize?: number
      /** Preferred living area from basicprofile */
      grossSizeAdjusted?: number
      grosssizeadjusted?: number
      grossSize?: number
      grosssize?: number
      groundFloorSize?: number
      groundfloorsize?: number
    }
    rooms?: {
      beds?: number
      bathsTotal?: number
      bathstotal?: number
      bathsfull?: number
      bathsFull?: number
      bathsPartial?: number
      bathspartial?: number
      roomsTotal?: number
      roomstotal?: number
    }
    interior?: {
      fplcCount?: number
      fplccount?: number
    }
    construction?: {
      condition?: string
      constructionType?: string
      frameType?: string
      wallType?: string
      roofShape?: string
      propertyStructureMajorImprovementsYear?: string | number
    }
    parking?: {
      garageType?: string
      prkgSize?: number
      prkgsize?: number
      prkgType?: string
      prkgSpaces?: string | number
    }
    summary?: {
      levels?: number
      unitsCount?: number
    }
  }
  lot?: {
    lotsize2?: number
    lotSize2?: number
    lotsize1?: number
    lotSize1?: number
    lotNum?: string | number
    siteZoningIdent?: string
    zoningType?: string
  }
  vintage?: {
    lastModified?: string
    pubDate?: string
  }
  assessment?: {
    owner?: {
      owner1?: AttomOwner
      owner2?: AttomOwner
      owner3?: AttomOwner
      owner4?: AttomOwner
      absenteeOwnerStatus?: string
      mailingAddressOneLine?: string
      mailingaddressoneline?: string
    }
    assessed?: Record<string, unknown>
    market?: Record<string, unknown>
    tax?: Record<string, unknown>
    mortgage?: {
      FirstConcurrent?: Record<string, unknown>
      SecondConcurrent?: Record<string, unknown>
      title?: Record<string, unknown>
    }
  }
  sale?: {
    saleTransDate?: string
    saleSearchDate?: string
    salesearchdate?: string
    sellerName?: string
    amount?: Record<string, unknown>
    /** basicprofile nests sale dollars under saleAmountData */
    saleAmountData?: Record<string, unknown>
    calculation?: Record<string, unknown>
  }
  salehistory?: unknown
  saleHistory?: unknown
  buildingPermits?: AttomBuildingPermitRow[]
  buildingpermits?: AttomBuildingPermitRow[]
  school?: AttomSchoolRow[]
  schoolDistrict?: AttomSchoolDistrict
  assessmenthistory?: AttomAssessmentHistoryRow[]
  assessmentHistory?: AttomAssessmentHistoryRow[]
}

type AttomBuildingPermitRow = {
  effectiveDate?: string
  permitNumber?: string
  status?: string
  type?: string
  subType?: string
  description?: string
  projectName?: string
  fees?: number
  homeOwnerName?: string
  classifiers?: string[]
}

type AttomSchoolRow = {
  geoIdV4?: string
  InstitutionName?: string
  institutionName?: string
  GSTestRating?: number | string
  schoolRating?: string
  gradelevel1lotext?: string
  gradelevel1hitext?: string
  lowAssignedGrade?: string
  highAssignedGrade?: string
  Filetypetext?: string
  filetypetext?: string
  geocodinglatitude?: string | number
  geocodinglongitude?: string | number
  distance?: number | string
}

type AttomSchoolDistrict = {
  geoIdV4?: string
  districttype?: string
  districtname?: string
  districtlatitude?: string | number
  districtlongitude?: string | number
}

type AttomAssessmentHistoryRow = {
  assessed?: Record<string, unknown>
  market?: Record<string, unknown>
  tax?: Record<string, unknown>
  calculations?: Record<string, unknown>
  lastModified?: string
}

function flagBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value == null) return undefined
  const s = String(value).trim().toLowerCase()
  if (s === 'true' || s === 'y' || s === 'yes' || s === '1') return true
  if (s === 'false' || s === 'n' || s === 'no' || s === '0') return false
  return undefined
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

function ownerNameFromBlock(owner?: AttomOwner & { fullname?: string }) {
  const raw = owner?.fullName || owner?.fullname
  if (!raw) return undefined
  return titleCaseName(String(raw))
}

function ownerDisplay(assessment?: AttomProperty['assessment']) {
  const names = [
    ownerNameFromBlock(assessment?.owner?.owner1),
    ownerNameFromBlock(assessment?.owner?.owner2),
    ownerNameFromBlock(assessment?.owner?.owner3),
    ownerNameFromBlock(assessment?.owner?.owner4),
  ].filter(Boolean) as string[]
  if (names.length === 0) return undefined
  return names.join(' & ')
}

function ownerMailing(assessment?: AttomProperty['assessment']) {
  const raw =
    assessment?.owner?.mailingAddressOneLine || assessment?.owner?.mailingaddressoneline
  if (!raw?.trim()) return undefined
  return titleCaseStreet(raw.trim())
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
  // basicprofile: prefer grossSizeAdjusted (buyer-facing county living area)
  return (
    num(building?.size?.grossSizeAdjusted) ??
    num(building?.size?.grosssizeadjusted) ??
    num(building?.size?.livingSize) ??
    num(building?.size?.livingsize) ??
    num(building?.size?.universalSize) ??
    num(building?.size?.universalsize) ??
    num(building?.size?.bldgSize) ??
    num(building?.size?.bldgsize)
  )
}

function bathsTotal(building?: AttomProperty['building']) {
  return (
    num(building?.rooms?.bathsTotal) ??
    num(building?.rooms?.bathstotal) ??
    num(building?.rooms?.bathsFull) ??
    num(building?.rooms?.bathsfull)
  )
}

function bathsFull(building?: AttomProperty['building']) {
  return num(building?.rooms?.bathsFull) ?? num(building?.rooms?.bathsfull)
}

function bathsPartial(building?: AttomProperty['building']) {
  return num(building?.rooms?.bathsPartial) ?? num(building?.rooms?.bathspartial)
}

function saleAmountBlock(sale?: AttomProperty['sale']) {
  return sale?.amount || sale?.saleAmountData
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
  const bath = bathsTotal(attom.building)
  const bathFull = bathsFull(attom.building)
  const bathPartial = bathsPartial(attom.building)
  const yearBuilt = num(attom.summary?.yearBuilt) ?? num(attom.summary?.yearbuilt)
  const lot = lotSqft(attom.lot)
  const lotAcres = num(attom.lot?.lotSize1) ?? num(attom.lot?.lotsize1)
  const apn = attom.identifier?.apn
  const zoning = attom.lot?.siteZoningIdent || attom.lot?.zoningType
  const propertyTypeLabel =
    attom.summary?.propClass ||
    attom.summary?.propclass ||
    attom.summary?.propertyType ||
    attom.summary?.propType

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

  const saleAmount = saleAmountBlock(attom.sale)
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
  }

  const salePrice = fromRecord(saleAmount, 'saleAmt', 'saleamt')
  fields.lastSalePriceLabel =
    salePrice != null ? moneyLabel(salePrice, '—') : '—'

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
  if (bathFull != null) fields.bathsFull = bathFull
  if (bathPartial != null) fields.bathsPartial = bathPartial
  if (yearBuilt != null) fields.yearBuilt = Math.round(yearBuilt)
  if (lot != null) fields.lotSizeSqft = lot
  if (lotAcres != null && lotAcres > 0) fields.lotSizeAcres = lotAcres
  if (apn) fields.apn = apn
  if (zoning) fields.zoning = String(zoning)
  else if (propertyTypeLabel) fields.zoning = String(propertyTypeLabel)
  if (propertyTypeLabel) fields.propertyTypeLabel = titleCaseStreet(String(propertyTypeLabel))
  if (attom.summary?.legal1?.trim()) {
    fields.legalDescription = titleCaseStreet(attom.summary.legal1.trim())
  }
  if (attom.area?.subdName?.trim()) {
    fields.subdivisionName = titleCaseStreet(attom.area.subdName.trim())
  }
  if (attom.area?.countrySecSubd?.trim()) {
    fields.countyName = titleCaseStreet(attom.area.countrySecSubd.trim())
  }

  const levels = num(attom.building?.summary?.levels)
  if (levels != null) fields.levels = Math.round(levels)
  const roomsTotal =
    num(attom.building?.rooms?.roomsTotal) ?? num(attom.building?.rooms?.roomstotal)
  if (roomsTotal != null) fields.roomsTotal = Math.round(roomsTotal)

  const garageType =
    attom.building?.parking?.garageType || attom.building?.parking?.prkgType
  if (garageType) fields.garageType = titleCaseStreet(String(garageType))
  const garageSize =
    num(attom.building?.parking?.prkgSize) ?? num(attom.building?.parking?.prkgsize)
  if (garageSize != null) fields.garageSizeSqft = Math.round(garageSize)

  if (attom.utilities?.coolingType) {
    fields.coolingType = titleCaseStreet(attom.utilities.coolingType)
  }
  if (attom.utilities?.heatingType) {
    fields.heatingType = titleCaseStreet(attom.utilities.heatingType)
  }
  if (attom.utilities?.heatingFuel) {
    fields.heatingFuel = titleCaseStreet(attom.utilities.heatingFuel)
  }
  if (attom.utilities?.wallType) {
    fields.wallType = titleCaseStreet(attom.utilities.wallType)
  }

  if (attom.building?.construction?.condition) {
    fields.constructionCondition = titleCaseStreet(attom.building.construction.condition)
  }
  if (attom.building?.construction?.constructionType) {
    fields.constructionType = titleCaseStreet(attom.building.construction.constructionType)
  }
  if (attom.building?.construction?.frameType) {
    fields.frameType = titleCaseStreet(attom.building.construction.frameType)
  }
  if (attom.building?.construction?.roofShape) {
    fields.roofShape = titleCaseStreet(attom.building.construction.roofShape)
  }
  if (attom.building?.construction?.wallType && !fields.wallType) {
    fields.wallType = titleCaseStreet(attom.building.construction.wallType)
  }
  const majorImpr = num(attom.building?.construction?.propertyStructureMajorImprovementsYear)
  if (majorImpr != null) fields.majorImprovementsYear = Math.round(majorImpr)

  if (attom.summary?.archStyle?.trim()) {
    fields.architecturalStyle = titleCaseStreet(attom.summary.archStyle.trim())
  }

  const grossSize =
    num(attom.building?.size?.grossSize) ?? num(attom.building?.size?.grosssize)
  if (grossSize != null) fields.grossSizeSqft = Math.round(grossSize)
  const groundFloor =
    num(attom.building?.size?.groundFloorSize) ?? num(attom.building?.size?.groundfloorsize)
  if (groundFloor != null) fields.groundFloorSizeSqft = Math.round(groundFloor)

  const parkingSpaces = num(attom.building?.parking?.prkgSpaces)
  if (parkingSpaces != null) fields.parkingSpaces = Math.round(parkingSpaces)

  if (attom.area?.munName?.trim()) {
    fields.municipalityName = titleCaseStreet(attom.area.munName.trim())
  }
  if (attom.area?.taxCodeArea != null && String(attom.area.taxCodeArea).trim()) {
    fields.taxCodeArea = String(attom.area.taxCodeArea).trim()
  }
  if (attom.lot?.lotNum != null && String(attom.lot.lotNum).trim()) {
    fields.lotNumber = String(attom.lot.lotNum).trim()
  }

  const quitClaim = flagBool(attom.summary?.quitClaimFlag)
  if (quitClaim != null) fields.quitClaimFlag = quitClaim
  const reo = flagBool(attom.summary?.REOflag)
  if (reo != null) fields.reoFlag = reo

  if (typeof attom.sale?.sellerName === 'string' && attom.sale.sellerName.trim()) {
    fields.lastSaleSellerName = titleCaseStreet(
      attom.sale.sellerName.replace(/,/g, ', ').replace(/\s+/g, ' ').trim(),
    )
  }

  const mortgage = attom.assessment?.mortgage?.FirstConcurrent
  if (mortgage) {
    const lender = stringFromRecord(mortgage, 'lenderLastName', 'lenderlastname')
    if (lender) fields.mortgageLender = titleCaseStreet(lender)
    const loanType = stringFromRecord(mortgage, 'loanTypeCode', 'loantypecode')
    if (loanType) fields.mortgageLoanType = loanType.toUpperCase()
    const mDate = stringFromRecord(mortgage, 'date')
    if (mDate) fields.mortgageDate = mDate.slice(0, 10)
    const due = stringFromRecord(mortgage, 'dueDate', 'duedate')
    if (due) fields.mortgageDueDate = due.slice(0, 10)
  }

  const fireplaces =
    num(attom.building?.interior?.fplcCount) ?? num(attom.building?.interior?.fplccount)
  if (fireplaces != null) fields.fireplaceCount = Math.round(fireplaces)

  if (attom.location?.accuracy?.trim()) {
    fields.locationAccuracy = titleCaseStreet(attom.location.accuracy.trim())
  }
  if (attom.vintage?.lastModified?.trim()) {
    fields.factsLastModified = attom.vintage.lastModified.trim().slice(0, 10)
  }
  if (attom.vintage?.pubDate?.trim()) {
    fields.factsPubDate = attom.vintage.pubDate.trim().slice(0, 10)
  }

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
  const mailing = ownerMailing(attom.assessment)
  if (mailing) fields.ownerMailingAddress = mailing
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

  const permits = mapAttomBuildingPermits(attom)
  if (permits.length > 0) fields.buildingPermits = permits

  const schools = mapAttomSchools(attom).filter((school) =>
    isPublishedAssignedSchool(school.name, school.geoIdV4),
  )
  if (schools.length > 0) fields.schools = schools

  const nearby = mapAttomNearbySchoolSearch(
    (attom as AttomProperty & { nearbySearch?: unknown[] }).nearbySearch,
  )
  if (nearby.length > 0) fields.nearbySchools = nearby

  const district = mapAttomSchoolDistrict(attom)
  if (district) fields.schoolDistrict = district

  const taxHistory = mapAttomTaxHistory(attom)
  if (taxHistory.length > 0) fields.taxHistory = taxHistory

  return fields
}

type AttomSaleHistoryRow = {
  sequence?: number
  saleTransDate?: string
  saleSearchDate?: string
  buyerName?: string
  sellerName?: string
  deedInLieuOfIndicator?: string
  sellerCarryBack?: string
  amount?: Record<string, unknown>
  mortgage?: {
    FirstConcurrent?: Record<string, unknown>
    SecondConcurrent?: Record<string, unknown>
  }
  title?: {
    companyName?: string
    companyCode?: string
  }
}

function cleanPartyName(raw?: string) {
  if (!raw?.trim()) return undefined
  return titleCaseStreet(
    raw
      .replace(/,/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/,\s*$/g, '')
      .trim(),
  )
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
    const transferType =
      stringFromRecord(amount, 'saleTransType', 'saletranstype') || 'Recorded transfer'
    const deedCode = stringFromRecord(amount, 'deedType', 'deedtype')
    const documentNumber = stringFromRecord(amount, 'saleDocNum', 'saledocnum')
    const documentType = stringFromRecord(amount, 'saleDocType', 'saledoctype')
    const mortgage = row.mortgage?.FirstConcurrent || {}
    const lenderLast = stringFromRecord(mortgage, 'lenderLastName', 'lenderlastname')
    const lenderFirst = stringFromRecord(mortgage, 'lenderFirstName', 'lenderfirstname')
    const lender = [lenderFirst, lenderLast].filter(Boolean).join(' ') || undefined
    const loanType = stringFromRecord(mortgage, 'loanTypeCode', 'loantypecode')
    const loanTerm = stringFromRecord(mortgage, 'term')
    const loanDue = stringFromRecord(mortgage, 'dueDate', 'duedate')
    const loanDoc =
      stringFromRecord(mortgage, 'trustDeedDocumentNumber', 'trustdeeddocumentnumber') ||
      stringFromRecord(mortgage, 'ident')
    const titleCompany = row.title?.companyName?.trim()
    const deedInLieu = flagBool(row.deedInLieuOfIndicator)
    const sellerCarryBack = flagBool(row.sellerCarryBack)

    events.push({
      id: `sale-${row.sequence ?? index}-${String(date).slice(0, 10)}`,
      date: String(date).slice(0, 10),
      recordedDate: stringFromRecord(amount, 'saleRecDate', 'salerecdate')?.slice(0, 10),
      deedType: transferType,
      deedCode: deedCode || undefined,
      documentNumber,
      documentType: documentType || undefined,
      buyerName: cleanPartyName(row.buyerName),
      sellerName: cleanPartyName(row.sellerName),
      deedInLieu: deedInLieu === true ? true : deedInLieu === false ? false : undefined,
      sellerCarryBack:
        sellerCarryBack === true ? true : sellerCarryBack === false ? false : undefined,
      titleCompany:
        titleCompany && titleCompany.toUpperCase() !== 'NONE AVAILABLE'
          ? titleCaseStreet(titleCompany)
          : undefined,
      lenderName: lender ? titleCaseStreet(lender) : undefined,
      loanType: loanType ? loanType.toUpperCase() : undefined,
      loanTermMonths: loanTerm || undefined,
      loanDueDate: loanDue ? loanDue.slice(0, 10) : undefined,
      loanDocumentNumber: loanDoc || undefined,
      amountLabel: (() => {
        const salePrice = num(amount.saleAmt ?? amount.saleamt)
        return salePrice != null ? moneyLabel(salePrice, '—') : '—'
      })(),
    })
  }
  return events
}

export function mapAttomBuildingPermits(
  attom: AttomProperty | Record<string, unknown>,
): BuildingPermit[] {
  const root = attom as AttomProperty & Record<string, unknown>
  const raw = root.buildingPermits ?? root.buildingpermits
  if (!Array.isArray(raw)) return []

  const permits: BuildingPermit[] = []
  for (const [index, row] of (raw as AttomBuildingPermitRow[]).entries()) {
    if (!row || typeof row !== 'object') continue
    const effectiveDate = row.effectiveDate ? String(row.effectiveDate).slice(0, 10) : undefined
    const permitNumber = row.permitNumber ? String(row.permitNumber).trim() : undefined
    const status = row.status ? titleCaseStreet(String(row.status)) : undefined
    const type = row.type ? titleCaseStreet(String(row.type)) : undefined
    const subType = row.subType ? titleCaseStreet(String(row.subType)) : undefined
    const description = row.description ? String(row.description).trim() : undefined
    const projectName = row.projectName ? titleCaseStreet(String(row.projectName)) : undefined
    const homeOwnerName = row.homeOwnerName
      ? titleCaseStreet(String(row.homeOwnerName))
      : undefined
    const fees =
      typeof row.fees === 'number' && Number.isFinite(row.fees)
        ? moneyLabel(row.fees, '')
        : undefined
    const classifiers = Array.isArray(row.classifiers)
      ? row.classifiers.map((c) => String(c).trim()).filter(Boolean)
      : undefined
    if (!effectiveDate && !permitNumber && !type && !description) continue
    permits.push({
      id: `permit-${permitNumber || index}-${effectiveDate || index}`,
      effectiveDate,
      permitNumber,
      status,
      type,
      subType,
      description,
      projectName,
      feesLabel: fees || undefined,
      homeOwnerName,
      classifiers,
    })
  }

  return permits.sort((a, b) => {
    const da = a.effectiveDate || ''
    const db = b.effectiveDate || ''
    return db.localeCompare(da)
  })
}

function parseGradeToken(raw?: string): number | null {
  if (!raw) return null
  const t = String(raw).trim().toUpperCase()
  if (!t) return null
  if (t === 'PK' || t === 'PREK' || t === 'PRE-K') return 0
  if (t === 'KG' || t === 'K' || t === 'KINDERGARTEN') return 0
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

function inferSchoolLevel(gradeLow?: string, gradeHigh?: string): PropertySchool['level'] {
  const low = parseGradeToken(gradeLow)
  const high = parseGradeToken(gradeHigh)
  if (low == null && high == null) return 'other'
  const lo = low ?? high ?? 0
  const hi = high ?? low ?? lo
  if (hi <= 5) return 'elementary'
  if (lo >= 9) return 'high'
  if (lo >= 6 && hi <= 8) return 'middle'
  if (lo <= 5 && hi >= 9) return 'other'
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

function nearbySchoolLevel(
  instructionalLevel?: string,
  gradeLow?: string,
  gradeHigh?: string,
): PropertySchool['level'] {
  const t = String(instructionalLevel || '').toLowerCase()
  if (t.includes('elem') || t.includes('primary')) return 'elementary'
  if (t.includes('middle') || t.includes('junior') || t.includes('intermed')) return 'middle'
  if (t.includes('high') || t.includes('senior')) return 'high'
  return inferSchoolLevel(gradeLow, gradeHigh)
}

export function mapAttomNearbySchoolSearch(raw: unknown): PropertySchool[] {
  if (!Array.isArray(raw)) return []
  const schools: PropertySchool[] = []
  for (const [index, row] of raw.entries()) {
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
    .sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99))
    .slice(0, 8)
}

export function mapAttomSchoolDistrict(
  attom: AttomProperty | Record<string, unknown>,
): PropertySchoolDistrict | undefined {
  const root = attom as AttomProperty
  const district = root.schoolDistrict
  if (!district || typeof district !== 'object') return undefined
  const name = district.districtname ? titleCaseStreet(String(district.districtname)) : undefined
  if (!name) return undefined
  const lat =
    district.districtlatitude != null ? Number(district.districtlatitude) : undefined
  const lng =
    district.districtlongitude != null ? Number(district.districtlongitude) : undefined
  return {
    name,
    type: district.districttype ? titleCaseStreet(String(district.districttype)) : undefined,
    geoIdV4: district.geoIdV4 ? String(district.geoIdV4) : undefined,
    lat: lat != null && Number.isFinite(lat) ? lat : undefined,
    lng: lng != null && Number.isFinite(lng) ? lng : undefined,
  }
}

export function mapAttomSchools(attom: AttomProperty | Record<string, unknown>): PropertySchool[] {
  const root = attom as AttomProperty
  const raw = root.school
  if (!Array.isArray(raw)) return []

  const levelRank: Record<NonNullable<PropertySchool['level']>, number> = {
    elementary: 0,
    middle: 1,
    high: 2,
    other: 3,
  }

  const schools: PropertySchool[] = []
  for (const [index, row] of (raw as AttomSchoolRow[]).entries()) {
    if (!row || typeof row !== 'object') continue
    const nameRaw = row.InstitutionName || row.institutionName
    if (!nameRaw || !String(nameRaw).trim()) continue
    const name = titleCaseStreet(String(nameRaw))
    const gradeLow = String(row.lowAssignedGrade || row.gradelevel1lotext || '')
      .trim()
      .replace(/\s+$/g, '')
    const gradeHigh = String(row.highAssignedGrade || row.gradelevel1hitext || '')
      .trim()
      .replace(/\s+$/g, '')
    const rating =
      typeof row.schoolRating === 'string' && row.schoolRating.trim()
        ? row.schoolRating.trim()
        : undefined
    const gsRaw = row.GSTestRating
    const gsNum = gsRaw != null ? Number(gsRaw) : undefined
    const gsTestRating =
      gsNum != null && Number.isFinite(gsNum) && gsNum > 0 ? gsNum : undefined
    const typeRaw = row.Filetypetext || row.filetypetext
    const distanceRaw = row.distance != null ? Number(row.distance) : undefined
    const lat = row.geocodinglatitude != null ? Number(row.geocodinglatitude) : undefined
    const lng = row.geocodinglongitude != null ? Number(row.geocodinglongitude) : undefined
    const level = inferSchoolLevel(gradeLow || undefined, gradeHigh || undefined)
    schools.push({
      id: `school-${row.geoIdV4 || index}`,
      name,
      rating,
      gsTestRating,
      gradeLow: gradeLow || undefined,
      gradeHigh: gradeHigh || undefined,
      level,
      type: typeRaw ? titleCaseStreet(String(typeRaw)) : undefined,
      distanceMiles:
        distanceRaw != null && Number.isFinite(distanceRaw) ? distanceRaw : undefined,
      lat: lat != null && Number.isFinite(lat) ? lat : undefined,
      lng: lng != null && Number.isFinite(lng) ? lng : undefined,
      geoIdV4: row.geoIdV4 ? String(row.geoIdV4) : undefined,
    })
  }

  return schools.sort((a, b) => {
    const rank = (levelRank[a.level || 'other'] ?? 3) - (levelRank[b.level || 'other'] ?? 3)
    if (rank !== 0) return rank
    return (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99)
  })
}

export function mapAttomTaxHistory(
  attom: AttomProperty | Record<string, unknown>,
): PropertyTaxYear[] {
  const root = attom as AttomProperty & Record<string, unknown>
  const raw = root.assessmentHistory ?? root.assessmenthistory
  if (!Array.isArray(raw)) return []

  const rows: PropertyTaxYear[] = []
  for (const [index, row] of (raw as AttomAssessmentHistoryRow[]).entries()) {
    if (!row || typeof row !== 'object') continue
    const tax = (row.tax || {}) as Record<string, unknown>
    const assessed = (row.assessed || {}) as Record<string, unknown>
    const market = (row.market || {}) as Record<string, unknown>
    const yearRaw = tax.taxYear ?? tax.taxyear ?? tax.assessorYear ?? tax.assessoryear
    const year = yearRaw != null ? Number(yearRaw) : NaN
    if (!Number.isFinite(year) || year <= 0) continue
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
    rows.push({
      id: `tax-${year}-${index}`,
      taxYear: year,
      assessorYear: assessorYear !== year ? assessorYear : undefined,
      taxAmountLabel: taxAmt != null ? moneyLabel(taxAmt, '—') : undefined,
      assessedLabel: assessedTotal != null ? moneyLabel(assessedTotal, '—') : undefined,
      landLabel: land != null ? moneyLabel(land, '—') : undefined,
      improvementLabel: impr != null ? moneyLabel(impr, '—') : undefined,
      marketLabel: marketTotal != null ? moneyLabel(marketTotal, '—') : undefined,
    })
  }

  return rows.sort((a, b) => b.taxYear - a.taxYear)
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
  apiVersion: 'v1.0.0' | 'v4' = 'v1.0.0',
): Promise<AttomProperty | null> {
  const url = new URL(`https://api.gateway.attomdata.com/propertyapi/${apiVersion}/${packagePath}`)
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
    const status = (raw as { status?: { code?: number | string; msg?: string } } | null)?.status
    const okEmpty =
      status?.msg === 'SuccessWithoutResult' || status?.code === 400 || status?.code === '400'
    if (!res.ok && !okEmpty) return null
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
 * County facts via ATTOM Property Basic Profile
 * Docs: GET /propertyapi/v1.0.0/property/basicprofile
 * Accepts attomid OR address1+address2 (same query shape as interactive docs).
 */
export async function fetchAttomPropertyDetail(params: {
  apiKey: string
  attomId?: number | string
  street?: string
  city?: string
  state?: string
  zipCode?: string
}): Promise<{ ok: true; property: AttomProperty } | { ok: false; error: string }> {
  const url = new URL(
    'https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile',
  )
  if (params.attomId != null && String(params.attomId).trim()) {
    url.searchParams.set('attomid', String(params.attomId))
  } else if (params.street && params.city && params.state) {
    url.searchParams.set('address1', params.street)
    url.searchParams.set(
      'address2',
      [params.city, params.state, params.zipCode].filter(Boolean).join(', '),
    )
  } else {
    return { ok: false, error: 'ATTOM basicprofile needs attomid or address1+address2' }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      apikey: params.apiKey,
    },
  })
  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    return { ok: false, error: `ATTOM basicprofile HTTP ${res.status}` }
  }

  const property = pickAttomProperty(raw)
  if (!property) {
    const msg =
      (raw as { status?: { msg?: string } } | null)?.status?.msg || 'No ATTOM basicprofile'
    return { ok: false, error: msg }
  }

  return { ok: true, property }
}

/**
 * County facts from ATTOM /property/basicprofile only.
 * Other packages (expanded, tax history, sales history, permits, schools) are added one by one later.
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

  const profile = await fetchAttomPackage('property/basicprofile', lookup)
  if (!profile) {
    return { ok: false, error: 'No ATTOM match for property/basicprofile' }
  }

  const fields = mapAttomToPropertyFields(profile)
  fields.attomBasicProfile = profile as unknown as Record<string, unknown>
  const attomId = profile.identifier?.attomId ?? profile.identifier?.Id
  return {
    ok: true,
    property: profile,
    fields,
    attomId: attomId != null ? Number(attomId) : undefined,
    warnings: [],
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
