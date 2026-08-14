import type { MockProperty } from './mockProperty'
import {
  COUNTY_FACT_MISSING,
  formatCountyLot,
  formatCountyNumber,
  formatCountySqft,
  formatCountyText,
  isMissingCountyNumber,
} from '@/lib/formatCountyFact'

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
  const demo = property.factsStatus === 'demo'

  if (!live && !demo) {
    return wrapResponse(property.id, `/api/properties/${property.id}/county-facts`, [
      {
        id: 'cf-pending',
        type: 'spec',
        channel: 'county-pending',
        unreadCount: 1,
        headline: 'County facts pending',
        preview:
          'Address matched. Waiting for ATTOM /property/basicprofile (year built, living area, beds/baths, owner). Demo numbers are not shown.',
        timestamp: isoMinutesAgo(2),
        source: 'Pending ATTOM basicprofile',
        fields: [
          { label: 'Status', value: 'Pending live county bind' },
          { label: 'Address', value: `${property.address}, ${property.city}, ${property.state}` },
        ],
      },
    ])
  }

  const source = live ? 'ATTOM /property/basicprofile' : 'Demo county shell'
  const bathDetail =
    property.bathsFull != null || property.bathsPartial != null
      ? [
          property.bathsFull != null ? `${property.bathsFull} full` : null,
          property.bathsPartial != null ? `${property.bathsPartial} partial` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null
  const lotLabel = formatCountyLot(property.lotSizeSqft, property.lotSizeAcres)
  const sqftLabel = formatCountySqft(property.sqft)
  const bedsLabel = formatCountyNumber(property.bedrooms)
  const bathsLabel = !isMissingCountyNumber(property.bathrooms)
    ? bathDetail
      ? `${property.bathrooms} (${bathDetail})`
      : String(property.bathrooms)
    : COUNTY_FACT_MISSING
  const yearLabel = formatCountyNumber(property.yearBuilt)
  const items: CatchUpCard[] = [
    {
      id: 'cf-living-area',
      type: 'discrepancy',
      channel: 'county-living-area',
      unreadCount: 1,
      headline: 'County living-area fact',
      preview: live
        ? isMissingCountyNumber(property.sqft)
          ? 'County living area not published in ATTOM basicprofile for this parcel. Compare listing size on Zillow or Redfin when available.'
          : `County grossSizeAdjusted shows ${property.sqft.toLocaleString()} sqft. Compare with the published listing size on Zillow or Redfin, then upvote whether it matches or looks overstated.`
        : `Demo shell shows ${property.sqft.toLocaleString()} sqft — replace by searching a live address with ATTOM bound.`,
      timestamp: isoMinutesAgo(18),
      source,
      fields: [
        {
          label: live ? 'grossSizeAdjusted' : 'County sqft (demo)',
          value: sqftLabel,
        },
      ],
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
      preview: [
        `${bedsLabel} bed`,
        `${formatCountyNumber(property.bathrooms)} bath`,
        `built ${yearLabel}`,
        `lot ${lotLabel}`,
      ].join(' · ') + '.',
      timestamp: isoMinutesAgo(40),
      source: live ? 'ATTOM /property/basicprofile' : 'Demo county shell',
      fields: [
        { label: 'Beds', value: bedsLabel },
        {
          label: 'Baths total',
          value: bathsLabel,
        },
        { label: 'Year built', value: yearLabel },
        ...(property.levels != null
          ? [{ label: 'Levels', value: String(property.levels) }]
          : []),
        ...(property.roomsTotal != null
          ? [{ label: 'Rooms total', value: String(property.roomsTotal) }]
          : []),
        ...(property.fireplaceCount != null
          ? [{ label: 'Fireplaces', value: String(property.fireplaceCount) }]
          : []),
        { label: 'Lot', value: lotLabel },
        { label: 'Zoning', value: formatCountyText(property.zoning) },
        { label: 'APN', value: formatCountyText(property.apn) },
      ],
    },
    {
      id: 'cf-identity',
      type: 'spec',
      channel: 'county-identity',
      unreadCount: live ? 1 : 0,
      headline: 'Property type & land identity',
      preview: [
        property.propertyTypeLabel,
        property.subdivisionName ? `Subdivision ${property.subdivisionName}` : null,
        property.countyName ? `${property.countyName} County` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'County identity fields when published.',
      timestamp: isoMinutesAgo(55),
      source: live ? 'ATTOM /property/basicprofile' : 'Demo county shell',
      fields: [
        ...(property.propertyTypeLabel
          ? [{ label: 'Property type', value: property.propertyTypeLabel }]
          : []),
        ...(property.subdivisionName
          ? [{ label: 'Subdivision', value: property.subdivisionName }]
          : []),
        ...(property.legalDescription
          ? [{ label: 'Legal', value: property.legalDescription }]
          : []),
        ...(property.countyName ? [{ label: 'County', value: property.countyName }] : []),
        { label: 'Zoning', value: formatCountyText(property.zoning) },
        { label: 'APN', value: formatCountyText(property.apn) },
      ],
    },
    {
      id: 'cf-systems',
      type: 'spec',
      channel: 'county-systems',
      unreadCount: live ? 1 : 0,
      headline: 'Systems, garage & construction',
      preview: [
        property.heatingType && property.heatingFuel
          ? `${property.heatingType} / ${property.heatingFuel}`
          : property.heatingType,
        property.coolingType ? `Cool ${property.coolingType}` : null,
        property.garageType,
        property.constructionCondition,
      ]
        .filter(Boolean)
        .join(' · ') || 'Utility and shell facts when published.',
      timestamp: isoMinutesAgo(70),
      source: live ? 'ATTOM /property/basicprofile' : 'Demo county shell',
      fields: [
        ...(property.garageType
          ? [
              {
                label: 'Garage',
                value: property.garageSizeSqft
                  ? `${property.garageType} · ${property.garageSizeSqft.toLocaleString()} sqft`
                  : property.garageType,
              },
            ]
          : []),
        ...(property.coolingType ? [{ label: 'Cooling', value: property.coolingType }] : []),
        ...(property.heatingType ? [{ label: 'Heating', value: property.heatingType }] : []),
        ...(property.heatingFuel ? [{ label: 'Fuel', value: property.heatingFuel }] : []),
        ...(property.wallType ? [{ label: 'Walls', value: property.wallType }] : []),
        ...(property.constructionCondition
          ? [{ label: 'Condition', value: property.constructionCondition }]
          : []),
        ...(property.constructionType
          ? [{ label: 'Construction', value: property.constructionType }]
          : []),
        ...(property.frameType ? [{ label: 'Frame', value: property.frameType }] : []),
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
      source: live ? 'ATTOM basicprofile assessment.owner' : 'Demo county shell',
      fields: [
        { label: 'Owner', value: property.ownerName },
        { label: 'Occupied', value: property.ownerOccupied ? 'Yes' : 'No' },
        ...(property.ownerMailingAddress
          ? [{ label: 'Mailing', value: property.ownerMailingAddress }]
          : live
            ? []
            : [{ label: 'Mailing', value: 'Same as property (demo)' }]),
      ],
    },
    {
      id: 'cf-permits',
      type: 'spec',
      channel: 'building-permits',
      unreadCount: live && (property.buildingPermits?.length ?? 0) > 0 ? 1 : 0,
      headline: 'Building permits',
      preview: live
        ? property.buildingPermits?.length
          ? `${property.buildingPermits.length} permit${property.buildingPermits.length === 1 ? '' : 's'} from ATTOM buildingpermits.`
          : 'No building permits published for this parcel.'
        : 'Demo shell — bind ATTOM /property/buildingpermits.',
      timestamp: isoMinutesAgo(100),
      source: live ? 'ATTOM /property/buildingpermits' : 'Demo county shell',
      fields: live
        ? property.buildingPermits?.length
          ? property.buildingPermits.flatMap((permit) => {
              const headline = [
                permit.effectiveDate,
                permit.permitNumber ? `#${permit.permitNumber}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              const detail = [
                permit.type,
                permit.subType,
                permit.status,
              ]
                .filter(Boolean)
                .join(' · ')
              const rows: Array<{ label: string; value: string }> = [
                {
                  label: headline || 'Permit',
                  value: detail || 'On file',
                },
              ]
              if (permit.description) {
                rows.push({ label: 'Description', value: permit.description })
              }
              if (permit.projectName) {
                rows.push({ label: 'Project', value: permit.projectName })
              }
              if (permit.feesLabel) {
                rows.push({ label: 'Fees', value: permit.feesLabel })
              }
              if (permit.homeOwnerName) {
                rows.push({ label: 'Applicant', value: permit.homeOwnerName })
              }
              if (permit.classifiers?.length) {
                rows.push({ label: 'Classifiers', value: permit.classifiers.join(', ') })
              }
              return rows
            })
          : [{ label: 'Status', value: 'None on file' }]
        : [
            { label: 'Status', value: 'Demo — search a live address' },
            { label: 'Source', value: 'ATTOM /property/buildingpermits' },
          ],
    },
    {
      id: 'cf-freshness',
      type: 'record_update',
      channel: 'county-freshness',
      unreadCount: 0,
      headline: 'Record freshness',
      preview: live
        ? [
            property.factsPubDate ? `Published ${property.factsPubDate}` : null,
            property.factsLastModified ? `Modified ${property.factsLastModified}` : null,
            property.locationAccuracy ? `Location ${property.locationAccuracy}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'ATTOM vintage when published.'
        : 'Demo shell has no ATTOM vintage.',
      timestamp: isoMinutesAgo(120),
      source: live ? 'ATTOM basicprofile vintage / location' : 'Demo county shell',
      fields: [
        ...(property.factsPubDate
          ? [{ label: 'Published', value: property.factsPubDate }]
          : []),
        ...(property.factsLastModified
          ? [{ label: 'Last modified', value: property.factsLastModified }]
          : []),
        ...(property.locationAccuracy
          ? [{ label: 'Geo accuracy', value: property.locationAccuracy }]
          : []),
        ...(property.attomId != null
          ? [{ label: 'ATTOM ID', value: String(property.attomId) }]
          : []),
      ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/county-facts`, items)
}

/** GET /api/properties/:id/sales-history */
export function fetchSalesHistoryApi(property: MockProperty): CatchUpApiResponse {
  const live = property.factsStatus === 'live'
  const history = property.salesHistory || []
  const items: CatchUpCard[] = [
    {
      id: 'sh-last-sale',
      type: 'legal',
      channel: 'last-sale',
      unreadCount: 1,
      headline: 'Most recent transfer',
      preview: `${property.deedType} recorded ${property.lastSaleDate}. Sale amount intentionally de-emphasized.`,
      timestamp: isoMinutesAgo(12),
      source: live ? 'ATTOM /sale/detail' : 'GET /api/properties/:id · sales',
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
  ]

  if (history.length > 0) {
    for (const [index, event] of history.slice(0, 6).entries()) {
      items.push({
        id: event.id || `sh-event-${index}`,
        type: 'legal',
        channel: 'prior-transfers',
        unreadCount: 0,
        headline: event.deedType,
        preview: [
          event.date,
          event.documentNumber ? `Doc ${event.documentNumber}` : null,
          event.buyerName ? `Buyer ${event.buyerName}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        timestamp: isoMinutesAgo(30 + index * 8),
        source: 'ATTOM /saleshistory/expandedhistory',
        fields: [
          { label: 'Transfer date', value: event.date },
          ...(event.recordedDate
            ? [{ label: 'Recorded', value: event.recordedDate }]
            : []),
          { label: 'Deed / type', value: event.deedType },
          {
            label: 'Document #',
            value: event.documentNumber || 'Not on file',
          },
          { label: 'Amount', value: event.amountLabel },
          ...(event.buyerName ? [{ label: 'Buyer', value: event.buyerName }] : []),
          ...(event.sellerName ? [{ label: 'Seller', value: event.sellerName }] : []),
        ],
      })
    }
  } else {
    items.push({
      id: 'sh-prior',
      type: 'legal',
      channel: 'prior-transfers',
      unreadCount: live ? 0 : 1,
      headline: live ? 'Earlier transfers' : 'Prior deed chain (stub)',
      preview: live
        ? 'No additional ATTOM sales-history rows for this property.'
        : 'Earlier warranty / special warranty instruments available for diligence cross-check when API is bound.',
      timestamp: isoMinutesAgo(180),
      source: live ? 'ATTOM /saleshistory' : 'County recorder stub',
      fields: live
        ? [{ label: 'Status', value: 'Latest transfer shown above' }]
        : [
            { label: 'Prior sale', value: '2011-03-22 (stub)' },
            { label: 'Instrument', value: 'Special Warranty (stub)' },
          ],
    })
  }

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
      headline: isMissingCountyNumber(property.taxYear)
        ? 'Assessed value'
        : `${property.taxYear} assessed value`,
      preview: live
        ? `${property.taxAssessedValueLabel}. Land and improvement values from ATTOM assessment.`
        : `${property.taxAssessedValueLabel}. Homestead exemption flagged in stub data.`,
      timestamp: isoMinutesAgo(25),
      source: live ? 'ATTOM /assessment/detail' : 'GET /api/properties/:id · tax',
      fields: [
        { label: 'Tax year', value: formatCountyNumber(property.taxYear) },
        { label: 'Assessed', value: formatCountyText(property.taxAssessedValueLabel) },
        {
          label: 'Annual tax',
          value: property.taxAmountLabel || (live ? '—' : 'Stub — bind ATTOM tax amount'),
        },
        {
          label: 'Market value',
          value: property.marketValueLabel || (live ? '—' : 'Stub — bind ATTOM market value'),
        },
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
        ? 'Current assessor roll from ATTOM assessment/detail. Multi-year tax history can be added if your ATTOM plan includes historical rolls.'
        : `${property.taxYear - 1} assessment retained for year-over-year diligence comparison.`,
      timestamp: isoMinutesAgo(200),
      source: live ? 'ATTOM /assessment/detail' : 'Assessor stub',
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
