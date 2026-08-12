import type { MockProperty } from './mockProperty'

/** API-shaped payloads ready for future fetch() binding */

export type CatchUpItemType =
  | 'discrepancy'
  | 'record_update'
  | 'buyer_signal'
  | 'checklist'
  | 'spec'
  | 'legal'
  | 'tax'
  | 'school'

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
  /** Optional Buyer Community label id for an inline remote upvote */
  insightLabelId?: string
  /** Optional set of Buyer Community label ids for a remote Plus/Watch pair */
  insightLabelIds?: string[]
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

export type CatchUpSurface =
  | 'county-facts'
  | 'sales-history'
  | 'tax-history'
  | 'verified-visits'
  | 'buyer-insights'
  | 'schools'

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function wrapResponse(
  propertyId: string,
  endpoint: string,
  items: CatchUpCard[],
): CatchUpApiResponse {
  return {
    ok: true,
    endpoint,
    method: 'GET',
    propertyId,
    generatedAt: new Date().toISOString(),
    remaining: items.length,
    items,
  }
}

/** GET /api/properties/:id/county-facts */
export function fetchCountyFactsApi(property: MockProperty): CatchUpApiResponse {
  const live = property.factsStatus === 'live'
  const source = live ? 'ATTOM Property Detail (county facts)' : 'County assessor living area'
  const items: CatchUpCard[] = [
    {
      id: 'cf-living-area',
      type: 'discrepancy',
      channel: 'county-living-area',
      unreadCount: 1,
      headline: 'County living-area fact',
      preview: `County records show ${property.sqft.toLocaleString()} sqft. Compare with the published listing size on Zillow or Redfin, then upvote whether it matches or looks overstated.`,
      timestamp: isoMinutesAgo(18),
      source,
      fields: [{ label: 'County sqft', value: property.sqft.toLocaleString() }],
      insightLabelIds: [
        'published-listing-size-matches-county',
        'published-listing-size-overstated',
      ],
    },
    {
      id: 'cf-rooms',
      type: 'spec',
      channel: 'county-rooms',
      unreadCount: 1,
      headline: 'Beds, baths, year built',
      preview: `${property.bedrooms} bed · ${property.bathrooms} bath · built ${property.yearBuilt} · lot ${property.lotSizeSqft.toLocaleString()} sqft.`,
      timestamp: isoMinutesAgo(40),
      source: live ? 'ATTOM building / lot' : 'GET /api/properties/:id',
      fields: [
        { label: 'Beds / baths', value: `${property.bedrooms} / ${property.bathrooms}` },
        { label: 'Year built', value: String(property.yearBuilt) },
        { label: 'Lot', value: `${property.lotSizeSqft.toLocaleString()} sqft` },
        { label: 'Zoning', value: property.zoning },
        { label: 'APN', value: property.apn },
      ],
    },
    {
      id: 'cf-owner',
      type: 'record_update',
      channel: 'owner-of-record',
      unreadCount: 1,
      headline: 'Owner of record',
      preview: `${property.ownerName} · owner-occupied: ${property.ownerOccupied ? 'Yes' : 'No'}. Public-record only.`,
      timestamp: isoMinutesAgo(90),
      source: live ? 'ATTOM assessment owner' : 'GET /api/properties/:id',
      fields: [
        { label: 'Owner', value: property.ownerName },
        { label: 'Occupied', value: property.ownerOccupied ? 'Yes' : 'No' },
      ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/county-facts`, items)
}

/** GET /api/properties/:id/sales-history */
export function fetchSalesHistoryApi(property: MockProperty): CatchUpApiResponse {
  const live = property.factsStatus === 'live'
  const items: CatchUpCard[] = [
    {
      id: 'sh-last-sale',
      type: 'legal',
      channel: 'last-sale',
      unreadCount: 1,
      headline: 'Most recent transfer',
      preview: `${property.deedType} recorded ${property.lastSaleDate}. Sale amount intentionally de-emphasized.`,
      timestamp: isoMinutesAgo(12),
      source: live ? 'ATTOM sale detail' : 'GET /api/properties/:id · sales',
      fields: [
        { label: 'Sale date', value: property.lastSaleDate },
        { label: 'Deed type', value: property.deedType },
        { label: 'Amount', value: property.lastSalePriceLabel },
        {
          label: 'Document #',
          value: property.saleDocumentNumber || (live ? 'Not on file' : '2019-084221 (stub)'),
        },
      ],
    },
    {
      id: 'sh-prior',
      type: 'legal',
      channel: 'prior-transfers',
      unreadCount: live ? 0 : 1,
      headline: live ? 'Earlier transfers' : 'Prior deed chain (stub)',
      preview: live
        ? 'Full deed chain can be expanded later from ATTOM sale history endpoints.'
        : 'Earlier warranty / special warranty instruments available for diligence cross-check when API is bound.',
      timestamp: isoMinutesAgo(180),
      source: live ? 'ATTOM' : 'County recorder stub',
      fields: live
        ? [{ label: 'Status', value: 'Latest transfer shown above' }]
        : [
            { label: 'Prior sale', value: '2011-03-22 (stub)' },
            { label: 'Instrument', value: 'Special Warranty (stub)' },
          ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/sales-history`, items)
}

/** GET /api/properties/:id/tax-history */
export function fetchTaxHistoryApi(property: MockProperty): CatchUpApiResponse {
  const live = property.factsStatus === 'live'
  const items: CatchUpCard[] = [
    {
      id: 'th-assessment',
      type: 'tax',
      channel: 'tax-assessment',
      unreadCount: 1,
      headline: `${property.taxYear} assessed value`,
      preview: live
        ? `${property.taxAssessedValueLabel}. Land and improvement values from county / ATTOM.`
        : `${property.taxAssessedValueLabel}. Homestead exemption flagged in stub data.`,
      timestamp: isoMinutesAgo(25),
      source: live ? 'ATTOM assessment' : 'GET /api/properties/:id · tax',
      fields: [
        { label: 'Tax year', value: String(property.taxYear) },
        { label: 'Assessed', value: property.taxAssessedValueLabel },
        {
          label: 'Land',
          value: property.taxLandLabel || (live ? '—' : 'Stub — bind ATTOM land value'),
        },
        {
          label: 'Improvement',
          value:
            property.taxImprovementLabel ||
            (live ? '—' : 'Stub — bind ATTOM improvement value'),
        },
      ],
    },
    {
      id: 'th-prior-year',
      type: 'tax',
      channel: 'prior-tax-year',
      unreadCount: live ? 0 : 1,
      headline: live ? 'Assessment note' : 'Prior-year roll (stub)',
      preview: live
        ? 'Year-over-year assessor rolls can be added from ATTOM tax history next.'
        : `${property.taxYear - 1} assessment retained for year-over-year diligence comparison.`,
      timestamp: isoMinutesAgo(200),
      source: live ? 'ATTOM' : 'Assessor stub',
      fields: live
        ? [{ label: 'Source', value: 'Current roll only' }]
        : [
            { label: 'Prior year', value: String(property.taxYear - 1) },
            { label: 'Exemptions', value: 'Homestead (stub)' },
          ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/tax-history`, items)
}

/** GET /api/properties/:id/verified-visits */
export function fetchVerifiedVisitsApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'vv-count',
      type: 'buyer_signal',
      channel: 'verified-visits',
      unreadCount: property.verifiedVisits,
      headline: 'GPS presence confirmations',
      preview: `${property.verifiedVisits} verified visits within 100m. No dwell timer — tap Verify on site.`,
      timestamp: isoMinutesAgo(8),
      source: 'GET /api/visits/:propertyId/count',
      fields: [
        { label: 'Verified visits', value: String(property.verifiedVisits) },
        { label: 'Radius', value: '100m' },
      ],
    },
    {
      id: 'vv-weight',
      type: 'buyer_signal',
      channel: 'visit-weight',
      unreadCount: 1,
      headline: 'Why visits matter',
      preview: 'Verified presence unlocks stronger contribution weight on structured buyer insights.',
      timestamp: isoMinutesAgo(60),
      source: 'GET /api/visits/:propertyId',
      fields: [{ label: 'Policy', value: 'Presence confirmation only' }],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/verified-visits`, items)
}

/** GET /api/properties/:id/buyer-insights */
export function fetchBuyerInsightsApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'bi-noise',
      type: 'buyer_signal',
      channel: 'neighborhood-noise',
      unreadCount: 3,
      headline: 'Evening street noise',
      preview: '3 buyers observed evening street noise. Aggregated counts only — no public free text.',
      timestamp: isoMinutesAgo(45),
      source: 'GET /api/flags/:propertyId',
      fields: [
        { label: 'Signal', value: 'Evening noise' },
        { label: 'Buyers', value: '3' },
      ],
    },
    {
      id: 'bi-parking',
      type: 'buyer_signal',
      channel: 'parking-driveway',
      unreadCount: 4,
      headline: 'Driveway / parking constraints',
      preview: '4 buyers noted limited driveway depth. 2 noted tight street parking after 6pm.',
      timestamp: isoMinutesAgo(100),
      source: 'GET /api/flags/:propertyId',
      fields: [
        { label: 'Driveway depth', value: '4 buyers' },
        { label: 'Street parking', value: '2 buyers' },
      ],
    },
    {
      id: 'bi-structure',
      type: 'buyer_signal',
      channel: 'structure-signals',
      unreadCount: 1,
      headline: 'Structured condition signals',
      preview: 'Possible garage conversion flagged by 1 verified buyer. Basement present confirmed by 2.',
      timestamp: isoMinutesAgo(160),
      source: 'GET /api/flags/:propertyId',
      fields: [
        { label: 'Garage conversion', value: '1 verified' },
        { label: 'Basement present', value: '2 verified' },
      ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/buyer-insights`, items)
}

/** GET /api/properties/:id/schools */
export function fetchSchoolsApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'sc-elementary',
      type: 'school',
      channel: 'elementary',
      unreadCount: 1,
      headline: 'Assigned elementary',
      preview: 'Oak Ridge Elementary — verify current boundary with the district before deciding.',
      timestamp: isoMinutesAgo(20),
      source: 'GET /api/properties/:id/schools',
      fields: [
        { label: 'Campus', value: 'Oak Ridge Elementary' },
        { label: 'District', value: 'Austin ISD' },
      ],
    },
    {
      id: 'sc-secondary',
      type: 'school',
      channel: 'secondary',
      unreadCount: 1,
      headline: 'Middle & high assignment',
      preview: 'South Austin Middle → Austin High School. Ratings are contextual — not a rankings marketplace.',
      timestamp: isoMinutesAgo(55),
      source: 'GET /api/properties/:id/schools',
      fields: [
        { label: 'Middle', value: 'South Austin Middle' },
        { label: 'High', value: 'Austin High School' },
      ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/schools`, items)
}

export function fetchSurfaceApi(
  surface: CatchUpSurface,
  property: MockProperty,
): CatchUpApiResponse {
  switch (surface) {
    case 'county-facts':
      return fetchCountyFactsApi(property)
    case 'sales-history':
      return fetchSalesHistoryApi(property)
    case 'tax-history':
      return fetchTaxHistoryApi(property)
    case 'verified-visits':
      return fetchVerifiedVisitsApi(property)
    case 'buyer-insights':
      return fetchBuyerInsightsApi(property)
    case 'schools':
      return fetchSchoolsApi(property)
  }
}
