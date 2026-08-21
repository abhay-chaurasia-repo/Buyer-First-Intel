/**
 * ATTOM /property/basicprofile field catalog (official package fields).
 * County’s Fact shows every row so we can trim the list later.
 * Docs: https://api.developer.attomdata.com/docs
 */

export type BasicProfileValueFormat =
  | 'text'
  | 'number'
  | 'sqft'
  | 'acres'
  | 'money'
  | 'date'
  | 'yesno'

export type BasicProfileFieldDef = {
  groupId: string
  group: string
  label: string
  path: string
  format?: BasicProfileValueFormat
}

export type BasicProfileFactRow = {
  groupId: string
  group: string
  label: string
  path: string
  value: string
  published: boolean
}

function field(
  groupId: string,
  group: string,
  label: string,
  path: string,
  format?: BasicProfileValueFormat,
): BasicProfileFieldDef {
  return { groupId, group, label, path, format }
}

export const ATTOM_BASICPROFILE_FIELDS: BasicProfileFieldDef[] = [
  field('identifier', 'Parcel identity', 'ATTOM Id', 'identifier.attomId', 'number'),
  field('identifier', 'Parcel identity', 'Legacy Id', 'identifier.Id', 'number'),
  field('identifier', 'Parcel identity', 'APN', 'identifier.apn'),
  field('identifier', 'Parcel identity', 'FIPS', 'identifier.fips'),
  field('identifier', 'Parcel identity', 'Multiple APN', 'identifier.multiApn', 'yesno'),

  field('address', 'Address', 'Street', 'address.line1'),
  field('address', 'Address', 'Address line 2', 'address.line2'),
  field('address', 'Address', 'City', 'address.locality'),
  field('address', 'Address', 'State', 'address.countrySubd'),
  field('address', 'Address', 'ZIP', 'address.postal1'),
  field('address', 'Address', 'ZIP+4', 'address.postal2'),
  field('address', 'Address', 'Carrier route', 'address.postal3'),
  field('address', 'Address', 'One-line address', 'address.oneLine'),
  field('address', 'Address', 'Building name', 'address.bldgName'),
  field('address', 'Address', 'Country', 'address.country'),
  field('address', 'Address', 'Match code', 'address.matchCode'),

  field('location', 'Location', 'Latitude', 'location.latitude'),
  field('location', 'Location', 'Longitude', 'location.longitude'),
  field('location', 'Location', 'Accuracy', 'location.accuracy'),
  field('location', 'Location', 'Elevation', 'location.elevation'),
  field('location', 'Location', 'Distance', 'location.distance'),
  field('location', 'Location', 'GeoID', 'location.geoid'),
  field('location', 'Location', 'GeoID v4', 'location.geoIdV4'),

  field('lot', 'Lot', 'Lot size (sqft)', 'lot.lotSize2', 'sqft'),
  field('lot', 'Lot', 'Lot size (acres)', 'lot.lotSize1', 'acres'),
  field('lot', 'Lot', 'Lot number', 'lot.lotNum'),
  field('lot', 'Lot', 'Lot depth (ft)', 'lot.depth', 'number'),
  field('lot', 'Lot', 'Lot frontage (ft)', 'lot.frontage', 'number'),
  field('lot', 'Lot', 'Zoning type', 'lot.zoningType'),

  field('area', 'Area', 'County', 'area.countrySecSubd'),
  field('area', 'Area', 'Subdivision', 'area.subdName'),
  field('area', 'Area', 'Subdivision tract', 'area.subdTractNum'),
  field('area', 'Area', 'Census tract', 'area.censusTractIdent'),
  field('area', 'Area', 'Census block group', 'area.censusBlockGroup'),

  field('summary', 'Property summary', 'Year built', 'summary.yearBuilt', 'number'),
  field('summary', 'Property summary', 'Property class', 'summary.propClass'),
  field('summary', 'Property summary', 'Property type', 'summary.propType'),
  field('summary', 'Property summary', 'Property type (general)', 'summary.propertyType'),
  field('summary', 'Property summary', 'Property subtype', 'summary.propSubType'),
  field('summary', 'Property summary', 'Land use', 'summary.propLandUse'),
  field('summary', 'Property summary', 'Property indicator', 'summary.propIndicator'),
  field('summary', 'Property summary', 'Legal description', 'summary.legal1'),
  field('summary', 'Property summary', 'Owner occupied / absentee', 'summary.absenteeInd'),
  field('summary', 'Property summary', 'Last quitclaim date', 'summary.dateOfLastQuitClaim', 'date'),

  field('size', 'Building size', 'Gross living area (adjusted)', 'building.size.grossSizeAdjusted', 'sqft'),
  field('size', 'Building size', 'Living size', 'building.size.livingSize', 'sqft'),
  field('size', 'Building size', 'Universal size', 'building.size.universalSize', 'sqft'),
  field('size', 'Building size', 'Building size', 'building.size.bldgSize', 'sqft'),
  field('size', 'Building size', 'Gross size', 'building.size.grossSize', 'sqft'),
  field('size', 'Building size', 'Ground floor size', 'building.size.groundFloorSize', 'sqft'),
  field('size', 'Building size', 'Attic size', 'building.size.atticSize', 'sqft'),
  field('size', 'Building size', 'Size indicator', 'building.size.sizeInd'),

  field('rooms', 'Rooms', 'Bedrooms', 'building.rooms.beds', 'number'),
  field('rooms', 'Rooms', 'Baths total', 'building.rooms.bathsTotal', 'number'),
  field('rooms', 'Rooms', 'Baths full', 'building.rooms.bathsFull', 'number'),
  field('rooms', 'Rooms', 'Baths partial', 'building.rooms.bathsPartial', 'number'),
  field('rooms', 'Rooms', 'Bath fixtures', 'building.rooms.bathFixtures', 'number'),
  field('rooms', 'Rooms', 'Rooms total', 'building.rooms.roomsTotal', 'number'),

  field('interior', 'Interior', 'Fireplaces', 'building.interior.fplcCount', 'number'),
  field('interior', 'Interior', 'Fireplace present', 'building.interior.fplcInd', 'yesno'),
  field('interior', 'Interior', 'Fireplace type', 'building.interior.fplcType'),
  field('interior', 'Interior', 'Basement size', 'building.interior.bsmtSize', 'sqft'),
  field('interior', 'Interior', 'Basement type', 'building.interior.bsmtType'),
  field('interior', 'Interior', 'Basement finished %', 'building.interior.bsmtFinishedPercent', 'number'),
  field('interior', 'Interior', 'Floors', 'building.interior.floors'),

  field('construction', 'Construction', 'Condition', 'building.construction.condition'),
  field('construction', 'Construction', 'Construction type', 'building.construction.constructionType'),
  field('construction', 'Construction', 'Foundation', 'building.construction.foundationType'),
  field('construction', 'Construction', 'Frame', 'building.construction.frameType'),
  field('construction', 'Construction', 'Building shape', 'building.construction.buildingShapeType'),
  field('construction', 'Construction', 'Building shape description', 'building.construction.buildingShapeDescription'),

  field('parking', 'Parking', 'Garage type', 'building.parking.garageType'),
  field('parking', 'Parking', 'Parking type', 'building.parking.prkgType'),
  field('parking', 'Parking', 'Garage size', 'building.parking.prkgSize', 'sqft'),

  field('building-summary', 'Building summary', 'Levels / stories', 'building.summary.levels', 'number'),
  field('building-summary', 'Building summary', 'Story description', 'building.summary.storyDesc'),
  field('building-summary', 'Building summary', 'Units', 'building.summary.unitsCount', 'number'),
  field('building-summary', 'Building summary', 'View', 'building.summary.view'),
  field('building-summary', 'Building summary', 'View code', 'building.summary.viewCode'),

  field('utilities', 'Utilities', 'Heating', 'utilities.heatingType'),
  field('utilities', 'Utilities', 'Heating fuel', 'utilities.heatingFuel'),
  field('utilities', 'Utilities', 'Cooling', 'utilities.coolingType'),
  field('utilities', 'Utilities', 'Energy type', 'utilities.energyType'),
  field('utilities', 'Utilities', 'Sewer', 'utilities.sewerType'),
  field('utilities', 'Utilities', 'Walls', 'utilities.wallType'),

  field('owner', 'Owner of record', 'Owner 1 last name', 'assessment.owner.owner1.lastName'),
  field('owner', 'Owner of record', 'Owner 1 first / MI', 'assessment.owner.owner1.firstNameAndMi'),
  field('owner', 'Owner of record', 'Owner 1 full name', 'assessment.owner.owner1.fullName'),
  field('owner', 'Owner of record', 'Owner 2 last name', 'assessment.owner.owner2.lastName'),
  field('owner', 'Owner of record', 'Owner 2 first / MI', 'assessment.owner.owner2.firstNameAndMi'),
  field('owner', 'Owner of record', 'Owner 2 full name', 'assessment.owner.owner2.fullName'),
  field('owner', 'Owner of record', 'Owner 3 last name', 'assessment.owner.owner3.lastName'),
  field('owner', 'Owner of record', 'Owner 3 first / MI', 'assessment.owner.owner3.firstNameAndMi'),
  field('owner', 'Owner of record', 'Owner 3 full name', 'assessment.owner.owner3.fullName'),
  field('owner', 'Owner of record', 'Owner 4 last name', 'assessment.owner.owner4.lastName'),
  field('owner', 'Owner of record', 'Owner 4 first / MI', 'assessment.owner.owner4.firstNameAndMi'),
  field('owner', 'Owner of record', 'Owner 4 full name', 'assessment.owner.owner4.fullName'),
  field('owner', 'Owner of record', 'Absentee status', 'assessment.owner.absenteeOwnerStatus'),
  field('owner', 'Owner of record', 'Mailing address', 'assessment.owner.mailingAddressOneLine'),
  field('owner', 'Owner of record', 'Corporate owner', 'owner.corporateindicator', 'yesno'),
  field('owner', 'Owner of record', 'Corporate owner (assessment)', 'assessment.owner.corporateindicator', 'yesno'),

  field('assessment', 'Current assessment', 'Tax year', 'assessment.tax.taxYear', 'number'),
  field('assessment', 'Current assessment', 'Tax amount', 'assessment.tax.taxAmt', 'money'),
  field('assessment', 'Current assessment', 'Tax per sqft', 'assessment.tax.taxPerSizeUnit', 'money'),
  field('assessment', 'Current assessment', 'Assessed total', 'assessment.assessed.assdTtlValue', 'money'),
  field('assessment', 'Current assessment', 'Assessed land', 'assessment.assessed.assdLandValue', 'money'),
  field('assessment', 'Current assessment', 'Assessed improvement', 'assessment.assessed.assdImprValue', 'money'),
  field('assessment', 'Current assessment', 'Market total', 'assessment.market.mktTtlValue', 'money'),
  field('assessment', 'Current assessment', 'Market land', 'assessment.market.mktLandValue', 'money'),
  field('assessment', 'Current assessment', 'Market improvement', 'assessment.market.mktImprValue', 'money'),
  field('assessment', 'Current assessment', 'Improvement percent', 'assessment.improvementPercent', 'number'),
  field('assessment', 'Current assessment', 'Delinquent tax year', 'assessment.delinquentyear', 'number'),
  field('assessment', 'Current assessment', 'Homeowner exemption $', 'assessment.tax.exemption.ExemptionAmount1', 'money'),
  field('assessment', 'Current assessment', 'Disabled exemption $', 'assessment.tax.exemption.ExemptionAmount2', 'money'),
  field('assessment', 'Current assessment', 'Senior exemption $', 'assessment.tax.exemption.ExemptionAmount3', 'money'),
  field('assessment', 'Current assessment', 'Veteran exemption $', 'assessment.tax.exemption.ExemptionAmount4', 'money'),
  field('assessment', 'Current assessment', 'Widow exemption $', 'assessment.tax.exemption.ExemptionAmount5', 'money'),
  field('assessment', 'Current assessment', 'Exemption: additional', 'assessment.tax.exemptiontype.additional', 'yesno'),
  field('assessment', 'Current assessment', 'Exemption: disabled', 'assessment.tax.exemptiontype.disabled', 'yesno'),
  field('assessment', 'Current assessment', 'Exemption: homeowner', 'assessment.tax.exemptiontype.homeowner', 'yesno'),
  field('assessment', 'Current assessment', 'Exemption: senior', 'assessment.tax.exemptiontype.senior', 'yesno'),
  field('assessment', 'Current assessment', 'Exemption: veteran', 'assessment.tax.exemptiontype.veteran', 'yesno'),
  field('assessment', 'Current assessment', 'Exemption: widow', 'assessment.tax.exemptiontype.widow', 'yesno'),

  field('sale', 'Latest sale', 'Sale date (search)', 'sale.saleSearchDate', 'date'),
  field('sale', 'Latest sale', 'Sale date (document)', 'sale.saleTransDate', 'date'),
  field('sale', 'Latest sale', 'Sale sequence', 'sale.sequenceSaleHistory', 'number'),
  field('sale', 'Latest sale', 'Sale amount', 'sale.saleAmountData.saleAmt', 'money'),
  field('sale', 'Latest sale', 'Sale amount (amount block)', 'sale.amount.saleAmt', 'money'),
  field('sale', 'Latest sale', 'Sale code', 'sale.saleAmountData.saleCode'),
  field('sale', 'Latest sale', 'Recording date', 'sale.saleAmountData.saleRecDate', 'date'),
  field('sale', 'Latest sale', 'Disclosure type', 'sale.saleAmountData.saleDisclosureType'),
  field('sale', 'Latest sale', 'Document number', 'sale.saleAmountData.saleDocNum'),
  field('sale', 'Latest sale', 'Document type', 'sale.saleAmountData.saleDocType'),
  field('sale', 'Latest sale', 'Transaction type', 'sale.saleAmountData.saleTransType'),

  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'First lender first name', 'assessment.mortgage.FirstConcurrent.LenderFirstName'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'First lender last name', 'assessment.mortgage.FirstConcurrent.lenderLastName'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'First loan amount', 'assessment.mortgage.FirstConcurrent.amount', 'money'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'First loan document #', 'assessment.mortgage.FirstConcurrent.trustDeedDocumentNumber'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'Second lender first name', 'assessment.mortgage.SecondConcurrent.LenderFirstName'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'Second lender last name', 'assessment.mortgage.SecondConcurrent.lenderLastName'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'Second loan amount', 'assessment.mortgage.SecondConcurrent.amount', 'money'),
  field('mortgage', 'Mortgage (metadata + amounts from this API)', 'Second loan document #', 'assessment.mortgage.SecondConcurrent.trustDeedDocumentNumber'),

  field('vintage', 'Record vintage', 'Last modified', 'vintage.lastModified', 'date'),
  field('vintage', 'Record vintage', 'Published', 'vintage.pubDate', 'date'),
]

const CATALOG_PATHS = new Set(ATTOM_BASICPROFILE_FIELDS.map((item) => item.path.toLowerCase()))

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function lookupKey(record: Record<string, unknown>, part: string) {
  if (part in record) return part
  const lower = part.toLowerCase()
  return Object.keys(record).find((key) => key.toLowerCase() === lower)
}

export function getAttomPath(root: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let current: unknown = root
  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part)
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined
      current = current[index]
      continue
    }
    if (!isPlainObject(current)) return undefined
    const key = lookupKey(current, part)
    if (!key) return undefined
    current = current[key]
  }
  return current
}

function isEmptyValue(value: unknown) {
  if (value == null) return true
  if (typeof value === 'string' && !value.trim()) return true
  if (Array.isArray(value) && value.length === 0) return true
  if (isPlainObject(value) && Object.keys(value).length === 0) return true
  return false
}

function moneyLabel(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function numberLabel(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function yesNo(value: unknown) {
  const raw = String(value).trim().toLowerCase()
  if (['y', 'yes', 'true', '1', 'o'].includes(raw)) return 'Yes'
  if (['n', 'no', 'false', '0', 'a'].includes(raw)) return 'No'
  return String(value)
}

export function formatBasicProfileValue(
  value: unknown,
  format: BasicProfileValueFormat = 'text',
): string {
  if (isEmptyValue(value)) return 'Not published'
  if (isPlainObject(value) || Array.isArray(value)) {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  if (format === 'yesno') return yesNo(value)
  if (format === 'date') {
    const text = String(value).trim()
    return text.length >= 10 ? text.slice(0, 10) : text
  }

  const numeric = asNumber(value)
  if (format === 'money' && numeric != null) return moneyLabel(numeric)
  if (format === 'sqft' && numeric != null) return `${Math.round(numeric).toLocaleString('en-US')} sqft`
  if (format === 'acres' && numeric != null) return `${numberLabel(numeric)} acres`
  if (format === 'number' && numeric != null) return numberLabel(numeric)
  if (numeric != null && typeof value !== 'string') return numberLabel(numeric)
  return String(value).trim()
}

function collectExtraPaths(value: unknown, prefix: string, into: string[]) {
  if (isEmptyValue(value)) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectExtraPaths(item, prefix ? `${prefix}.${index}` : String(index), into))
    return
  }
  if (!isPlainObject(value)) {
    if (prefix && !CATALOG_PATHS.has(prefix.toLowerCase())) into.push(prefix)
    return
  }
  const keys = Object.keys(value)
  if (keys.length === 0) return
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key
    collectExtraPaths(value[key], next, into)
  }
}

function titleFromPath(path: string) {
  const last = path.split('.').pop() || path
  return last
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

export function buildBasicProfileFacts(payload: unknown): BasicProfileFactRow[] {
  const rows = ATTOM_BASICPROFILE_FIELDS.map((item) => {
    const raw = getAttomPath(payload, item.path)
    const published = !isEmptyValue(raw)
    return {
      groupId: item.groupId,
      group: item.group,
      label: item.label,
      path: item.path,
      value: formatBasicProfileValue(raw, item.format),
      published,
    }
  })

  const extras: string[] = []
  collectExtraPaths(payload, '', extras)
  for (const path of extras) {
    if (path === 'identifier' || path.startsWith('identifier.')) {
      // identifier leaves are already catalogued; skip containers
    }
    rows.push({
      groupId: 'extra',
      group: 'Also returned (not in the published field list)',
      label: titleFromPath(path),
      path,
      value: formatBasicProfileValue(getAttomPath(payload, path)),
      published: true,
    })
  }

  return rows
}

export function basicProfileGroupOrder(rows: BasicProfileFactRow[]) {
  const seen = new Map<string, { id: string; label: string }>()
  for (const row of rows) {
    if (!seen.has(row.groupId)) seen.set(row.groupId, { id: row.groupId, label: row.group })
  }
  return [...seen.values()]
}
