import type { MockProperty } from './mockProperty'

/** API-shaped payloads ready for future fetch() binding */

export type CatchUpItemType =
  | 'discrepancy'
  | 'record_update'
  | 'buyer_signal'
  | 'checklist'
  | 'spec'
  | 'legal'

export type CatchUpCard = {
  id: string
  type: CatchUpItemType
  /** Slack-style conversation / topic label */
  channel: string
  unreadCount: number
  headline: string
  preview: string
  timestamp: string
  source: string
  fields?: Array<{ label: string; value: string }>
}

export type CatchUpApiResponse = {
  ok: true
  endpoint: string
  method: 'GET'
  propertyId: string
  generatedAt: string
  remaining: number
  items: CatchUpCard[]
}

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/** GET /api/properties/:id/catch-up */
export function fetchCatchUpApi(property: MockProperty): CatchUpApiResponse {
  const delta =
    property.claimedSqft && property.sqft
      ? Math.round(((property.sqft - property.claimedSqft) / property.claimedSqft) * 100)
      : 0

  const items: CatchUpCard[] = [
    {
      id: 'cu-size-gap',
      type: 'discrepancy',
      channel: 'size-discrepancy',
      unreadCount: 2,
      headline: 'Living area mismatch',
      preview: `County records show ${property.sqft.toLocaleString()} sqft, but the external claim is ${property.claimedSqft?.toLocaleString() ?? '—'} sqft (${delta}%). Confirm what is included before you offer.`,
      timestamp: isoMinutesAgo(18),
      source: 'ATTOM / county vs external claim',
      fields: [
        { label: 'County sqft', value: property.sqft.toLocaleString() },
        { label: 'Claimed sqft', value: property.claimedSqft?.toLocaleString() ?? '—' },
        { label: 'Delta', value: `${delta}%` },
      ],
    },
    {
      id: 'cu-record-refresh',
      type: 'record_update',
      channel: 'public-records',
      unreadCount: 1,
      headline: 'Public-record snapshot refreshed',
      preview: `Owner of record is ${property.ownerName}. APN ${property.apn}, zoning ${property.zoning}. Built ${property.yearBuilt}.`,
      timestamp: isoMinutesAgo(55),
      source: 'GET /api/properties/:id',
      fields: [
        { label: 'Owner', value: property.ownerName },
        { label: 'APN', value: property.apn },
        { label: 'Zoning', value: property.zoning },
      ],
    },
    {
      id: 'cu-buyer-signal',
      type: 'buyer_signal',
      channel: 'neighborhood-signals',
      unreadCount: 3,
      headline: 'New aggregated buyer signals',
      preview:
        '3 buyers observed evening street noise. 4 buyers noted limited driveway depth. Structured counts only — no public comments.',
      timestamp: isoMinutesAgo(120),
      source: 'GET /api/flags/:propertyId',
      fields: [
        { label: 'Noise', value: '3 buyers' },
        { label: 'Driveway', value: '4 buyers' },
      ],
    },
    {
      id: 'cu-checklist',
      type: 'checklist',
      channel: 'due-diligence',
      unreadCount: 1,
      headline: 'Checklist still open',
      preview: '4 of 14 diligence items complete. Flood overlay and HOA docs are still deferred.',
      timestamp: isoMinutesAgo(240),
      source: 'GET /api/checklist/:propertyId',
      fields: [
        { label: 'Complete', value: '4 / 14' },
        { label: 'Deferred', value: 'Flood · HOA' },
      ],
    },
  ]

  return {
    ok: true,
    endpoint: `/api/properties/${property.id}/catch-up`,
    method: 'GET',
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    remaining: items.length,
    items,
  }
}

/** GET /api/properties/:id/huddles */
export function fetchHuddlesApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'hd-full-specs',
      type: 'spec',
      channel: 'full-specs',
      unreadCount: 1,
      headline: 'County floor-plan facts',
      preview: `${property.bedrooms} bed · ${property.bathrooms} bath · ${property.sqft.toLocaleString()} sqft living · lot ${property.lotSizeSqft.toLocaleString()} sqft · built ${property.yearBuilt}.`,
      timestamp: isoMinutesAgo(12),
      source: 'GET /api/properties/:id',
      fields: [
        { label: 'Beds / baths', value: `${property.bedrooms} / ${property.bathrooms}` },
        { label: 'Living area', value: `${property.sqft.toLocaleString()} sqft` },
        { label: 'Lot', value: `${property.lotSizeSqft.toLocaleString()} sqft` },
        { label: 'Year built', value: String(property.yearBuilt) },
      ],
    },
    {
      id: 'hd-occupancy',
      type: 'spec',
      channel: 'owner-occupancy',
      unreadCount: 1,
      headline: 'Owner occupancy huddle',
      preview: `${property.ownerName} · owner-occupied: ${property.ownerOccupied ? 'Yes' : 'No'}. Use for diligence context only — not outreach.`,
      timestamp: isoMinutesAgo(40),
      source: 'GET /api/properties/:id',
      fields: [
        { label: 'Owner', value: property.ownerName },
        { label: 'Occupied', value: property.ownerOccupied ? 'Yes' : 'No' },
      ],
    },
    {
      id: 'hd-legal-crosscheck',
      type: 'legal',
      channel: 'specs-vs-deed',
      unreadCount: 2,
      headline: 'Cross-check specs against deed',
      preview: `Last instrument ${property.deedType} on ${property.lastSaleDate}. Confirm living-area classification matches what sellers claim.`,
      timestamp: isoMinutesAgo(90),
      source: 'GET /api/properties/:id · sales',
      fields: [
        { label: 'Deed', value: property.deedType },
        { label: 'Last sale', value: property.lastSaleDate },
      ],
    },
  ]

  return {
    ok: true,
    endpoint: `/api/properties/${property.id}/huddles`,
    method: 'GET',
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    remaining: items.length,
    items,
  }
}

/** GET /api/properties/:id/later */
export function fetchLaterApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'lt-sales-legal',
      type: 'legal',
      channel: 'sales-and-deed',
      unreadCount: 1,
      headline: 'Sales / legal parked for later',
      preview: `${property.deedType} recorded ${property.lastSaleDate}. Tax assessment year ${property.taxYear}.`,
      timestamp: isoMinutesAgo(30),
      source: 'GET /api/properties/:id',
      fields: [
        { label: 'Deed type', value: property.deedType },
        { label: 'Tax year', value: String(property.taxYear) },
        { label: 'Assessed', value: property.taxAssessedValueLabel },
      ],
    },
  ]

  return {
    ok: true,
    endpoint: `/api/properties/${property.id}/later`,
    method: 'GET',
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    remaining: items.length,
    items,
  }
}

/** GET /api/properties/:id/verified-visits */
export function fetchVerifiedApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'vf-visits',
      type: 'buyer_signal',
      channel: 'verified-visits',
      unreadCount: property.verifiedVisits,
      headline: 'GPS presence confirmations',
      preview: `${property.verifiedVisits} verified visits within 100m. Presence unlocks stronger insight weight — no dwell timer.`,
      timestamp: isoMinutesAgo(8),
      source: 'GET /api/visits/:propertyId/count',
      fields: [
        { label: 'Verified visits', value: String(property.verifiedVisits) },
        { label: 'Radius', value: '100m' },
      ],
    },
  ]

  return {
    ok: true,
    endpoint: `/api/properties/${property.id}/verified-visits`,
    method: 'GET',
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    remaining: items.length,
    items,
  }
}
