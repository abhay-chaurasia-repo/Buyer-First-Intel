import type { MockProperty } from './mockProperty'
import {
  COUNTY_FACT_MISSING,
  formatCountyNumber,
  formatCountySqft,
  formatCountyText,
  isMissingCountyNumber,
} from '@/lib/formatCountyFact'
import { isOwnershipSaleRow } from '@/lib/formatSaleHistory'

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
  const lotSqftLabel = formatCountySqft(property.lotSizeSqft)
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
      headline: 'Gross living area',
      preview: live
        ? isMissingCountyNumber(property.sqft)
          ? 'Gross living area is not published in county records for this parcel. Compare listing size on Zillow or Redfin when available.'
          : `Gross living area is ${property.sqft.toLocaleString()} sqft. Compare with the published size on Zillow or Redfin.`
        : `Demo shell shows ${property.sqft.toLocaleString()} sqft — replace by searching a live address with ATTOM bound.`,
      timestamp: isoMinutesAgo(18),
      source,
      fields: [
        {
          label: live ? 'Gross living area' : 'Gross living area (demo)',
          value: sqftLabel,
        },
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
        `lot ${lotSqftLabel}`,
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
        { label: 'Lot size', value: lotSqftLabel },
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
      source: live ? 'ATTOM basicprofile / expandedprofile' : 'Demo county shell',
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
        property.roofShape ? `Roof ${property.roofShape}` : null,
        property.constructionCondition,
      ]
        .filter(Boolean)
        .join(' · ') || 'Utility and shell facts when published.',
      timestamp: isoMinutesAgo(70),
      source: live ? 'ATTOM basicprofile / expandedprofile' : 'Demo county shell',
      fields: [
        ...(property.garageType
          ? [
              {
                label: 'Garage',
                value: [
                  property.garageType,
                  property.parkingSpaces != null ? `${property.parkingSpaces} spaces` : null,
                  property.garageSizeSqft
                    ? `${property.garageSizeSqft.toLocaleString()} sqft`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · '),
              },
            ]
          : property.parkingSpaces != null
            ? [{ label: 'Parking spaces', value: String(property.parkingSpaces) }]
            : []),
        ...(property.coolingType ? [{ label: 'Cooling', value: property.coolingType }] : []),
        ...(property.heatingType ? [{ label: 'Heating', value: property.heatingType }] : []),
        ...(property.heatingFuel ? [{ label: 'Fuel', value: property.heatingFuel }] : []),
        ...(property.wallType ? [{ label: 'Walls', value: property.wallType }] : []),
        ...(property.roofShape ? [{ label: 'Roof', value: property.roofShape }] : []),
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
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/county-facts`, items)
}

/** GET /api/properties/:id/sales-history */
export function fetchSalesHistoryApi(property: MockProperty): CatchUpApiResponse {
  const live = property.factsStatus === 'live'
  const history = (property.salesHistory || []).filter(isOwnershipSaleRow)
  const items: CatchUpCard[] = [
    {
      id: 'sh-last-sale',
      type: 'legal',
      channel: 'last-sale',
      unreadCount: 1,
      headline: 'Most recent sale',
      preview: `Sold ${property.lastSaleDate}${
        property.lastSalePriceLabel && property.lastSalePriceLabel !== '—'
          ? ` · ${property.lastSalePriceLabel}`
          : ''
      }.`,
      timestamp: isoMinutesAgo(12),
      source: live ? 'ATTOM /sale/detail' : 'GET /api/properties/:id · sales',
      fields: [
        { label: 'Date of sale', value: property.lastSaleDate },
        { label: 'Amount', value: property.lastSalePriceLabel },
      ],
    },
  ]

  if (history.length > 0) {
    for (const [index, event] of history.slice(0, 8).entries()) {
      items.push({
        id: event.id || `sh-event-${index}`,
        type: 'legal',
        channel: 'prior-transfers',
        unreadCount: index === 0 ? 1 : 0,
        headline: event.buyerName ? `Sold to ${event.buyerName}` : 'Recorded sale',
        preview: [event.date, event.amountLabel, event.sellerName ? `Seller ${event.sellerName}` : null]
          .filter(Boolean)
          .join(' · '),
        timestamp: isoMinutesAgo(30 + index * 8),
        source: 'ATTOM /saleshistory/expandedhistory',
        fields: [
          { label: 'Date of sale', value: event.date },
          { label: 'Amount', value: event.amountLabel },
          ...(event.buyerName ? [{ label: 'Buyer (sold to)', value: event.buyerName }] : []),
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
      headline: live ? 'Earlier sales' : 'Prior sales (stub)',
      preview: live
        ? 'No additional recorded sales for this property.'
        : 'Earlier sales appear after a live address resolve.',
      timestamp: isoMinutesAgo(180),
      source: live ? 'ATTOM /saleshistory' : 'County recorder stub',
      fields: live
        ? [{ label: 'Status', value: 'Latest sale shown above' }]
        : [{ label: 'Prior sale', value: '2011-03-22 (stub)' }],
    })
  }

  return wrapResponse(property.id, `/api/properties/${property.id}/sales-history`, items)
}

/** GET /api/properties/:id/tax-history */
export function fetchTaxHistoryApi(property: MockProperty): CatchUpApiResponse {
  const live = property.factsStatus === 'live'
  const history = property.taxHistory || []
  const items: CatchUpCard[] = []

  if (history.length > 0) {
    for (const [index, row] of history.slice(0, 12).entries()) {
      items.push({
        id: row.id || `th-year-${row.taxYear}`,
        type: 'tax',
        channel: 'tax-assessment',
        unreadCount: index === 0 ? 1 : 0,
        headline: `${row.taxYear} tax year`,
        preview: [
          row.taxAmountLabel ? `Tax ${row.taxAmountLabel}` : null,
          row.assessedLabel ? `Assessed ${row.assessedLabel}` : null,
          row.marketLabel ? `Market ${row.marketLabel}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        timestamp: isoMinutesAgo(25 + index * 4),
        source: 'ATTOM /assessmenthistory/detail',
        fields: [
          { label: 'Tax year', value: String(row.taxYear) },
          { label: 'Property taxes', value: row.taxAmountLabel || '—' },
          { label: 'Assessment', value: row.assessedLabel || '—' },
          ...(row.marketLabel ? [{ label: 'Market value', value: row.marketLabel }] : []),
          ...(row.landLabel ? [{ label: 'Land', value: row.landLabel }] : []),
          ...(row.improvementLabel
            ? [{ label: 'Improvement', value: row.improvementLabel }]
            : []),
          ...(row.assessorYear
            ? [{ label: 'Assessor year', value: String(row.assessorYear) }]
            : []),
        ],
      })
    }
  } else {
    items.push({
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
    })
  }

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
      headline: 'Presence Confirmed',
      preview: `${property.verifiedVisits} logs within about 100m of the pin. Dates stay on the log. Labeling is open for 2 weeks. Does not prove a tour or going inside.`,
      timestamp: isoMinutesAgo(8),
      source: 'GET /api/visits/:propertyId/count',
      fields: [
        { label: 'Presence confirmed', value: String(property.verifiedVisits) },
        { label: 'Radius', value: 'About 100m of pin' },
        { label: 'Does not prove', value: 'Entered home or completed a tour' },
      ],
    },
    {
      id: 'vv-weight',
      type: 'buyer_signal',
      channel: 'visit-weight',
      unreadCount: 1,
      headline: 'Why presence matters',
      preview: 'A phone near the pin unlocks on-site labels for 2 weeks. The dated presence log is permanent. It is not a tour log.',
      timestamp: isoMinutesAgo(60),
      source: 'GET /api/visits/:propertyId',
      fields: [
        { label: 'Presence log', value: 'Permanent dated events' },
        { label: 'Labeling window', value: '2 weeks from last Confirm' },
      ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/verified-visits`, items)
}

/** GET /api/properties/:id/buyer-insights */
export function fetchBuyerInsightsApi(property: MockProperty): CatchUpApiResponse {
  const items: CatchUpCard[] = [
    {
      id: 'bi-observation',
      type: 'buyer_signal',
      channel: 'on-site-observation',
      unreadCount: 1,
      headline: 'On-site observation form',
      preview:
        'One structured form per buyer: noise, parking, basement, moisture. GPS-gated. No free text.',
      timestamp: isoMinutesAgo(45),
      source: 'GET /api/properties/:id/buyer-insights',
      fields: [
        { label: 'Contribution', value: 'One form per buyer' },
        { label: 'Gate', value: 'Presence Confirmed' },
      ],
    },
  ]

  return wrapResponse(property.id, `/api/properties/${property.id}/buyer-insights`, items)
}

/** GET /api/properties/:id/schools */
export function fetchSchoolsApi(property: MockProperty): CatchUpApiResponse {
  const assigned = property.schools || []
  const nearby = dedupeNearbySchools(assigned, property.nearbySchools || [])
  const district = property.schoolDistrict
  const live = property.factsStatus === 'live'
  const assignedSource = live
    ? 'ATTOM /property/detailwithschools'
    : property.factsStatus === 'demo'
      ? 'Demo'
      : 'GET /api/properties/:id/schools'
  const nearbySource = live ? 'ATTOM /school/search' : assignedSource

  const levelLabel: Record<string, string> = {
    elementary: 'Elementary',
    middle: 'Middle',
    high: 'High',
    other: 'Campus',
  }

  const items: CatchUpCard[] = []

  items.push({
    id: 'sc-verify',
    type: 'school',
    channel: 'note',
    unreadCount: 0,
    headline: 'Confirm with the district',
    preview:
      'Verify assigned campuses with the district before you write an offer. Attendance zones can change.',
    timestamp: isoMinutesAgo(8),
    source: assignedSource,
  })

  if (assigned.length === 0) {
    items.push({
      id: 'sc-assigned-missing',
      type: 'school',
      channel: 'note',
      unreadCount: 0,
      headline: 'Assigned campuses',
      preview: district?.name
        ? `District ${district.name}. Assigned campuses not published for this address.`
        : 'Assigned campuses not published for this address. Confirm boundaries with the district.',
      timestamp: isoMinutesAgo(12),
      source: assignedSource,
      fields: [
        {
          label: 'Status',
          value: 'Not published for this address',
        },
        ...(district?.name ? [{ label: 'District', value: district.name }] : []),
        ...(district?.type ? [{ label: 'Type', value: district.type }] : []),
      ],
    })
  } else {
    if (district?.name) {
      items.push({
        id: 'sc-district',
        type: 'school',
        channel: 'district',
        unreadCount: 0,
        headline: district.name,
        preview: [district.type, 'Assigned district for this address'].filter(Boolean).join(' · '),
        timestamp: isoMinutesAgo(12),
        source: assignedSource,
        fields: [
          { label: 'District', value: district.name },
          ...(district.type ? [{ label: 'Type', value: district.type }] : []),
        ],
      })
    }

    for (const [index, school] of assigned.entries()) {
      items.push(schoolCard(school, index, 'Assigned', assignedSource, levelLabel))
    }
  }

  if (nearby.length > 0) {
    items.push({
      id: 'sc-nearby-note',
      type: 'school',
      channel: 'nearby',
      unreadCount: 0,
      headline: 'Nearby',
      preview:
        'Schools within about 5 miles of this pin — not the assigned attendance zone.',
      timestamp: isoMinutesAgo(16),
      source: nearbySource,
    })
    for (const [index, school] of nearby.entries()) {
      items.push(schoolCard(school, index, 'Nearby', nearbySource, levelLabel))
    }
  } else if (assigned.length === 0) {
    items.push({
      id: 'sc-nearby-missing',
      type: 'school',
      channel: 'nearby',
      unreadCount: 0,
      headline: 'Nearby',
      preview: 'No nearby campuses returned for this pin.',
      timestamp: isoMinutesAgo(16),
      source: nearbySource,
    })
  }

  return wrapResponse(property.id, `/api/properties/${property.id}/schools`, items)
}

function schoolKey(school: { name: string; geoIdV4?: string }) {
  return (school.geoIdV4 || school.name).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function dedupeNearbySchools(
  assigned: NonNullable<MockProperty['schools']>,
  nearby: NonNullable<MockProperty['nearbySchools']>,
) {
  const taken = new Set(assigned.map(schoolKey))
  return nearby.filter((school) => !taken.has(schoolKey(school)))
}

function schoolCard(
  school: NonNullable<MockProperty['schools']>[number],
  index: number,
  kind: 'Assigned' | 'Nearby',
  source: string,
  levelLabel: Record<string, string>,
) {
  const level = school.level || 'other'
  const grades =
    school.gradeLow || school.gradeHigh
      ? [school.gradeLow, school.gradeHigh].filter(Boolean).join('–')
      : null
  return {
    id: `${kind === 'Nearby' ? 'near' : 'sc'}-${school.id || index}`,
    type: 'school' as const,
    channel: kind === 'Nearby' ? 'nearby' : level,
    unreadCount: 0,
    headline: [kind, levelLabel[level] || 'Campus', school.name].join(' · '),
    preview: [
      grades ? `Grades ${grades}` : null,
      school.distanceMiles != null ? `${school.distanceMiles.toFixed(2)} mi` : null,
      school.type,
    ]
      .filter(Boolean)
      .join(' · '),
    timestamp: isoMinutesAgo(18 + index * 6),
    source,
    fields: [
      { label: 'Campus', value: school.name },
      { label: kind === 'Nearby' ? 'Kind' : 'Assignment', value: kind },
      ...(grades ? [{ label: 'Grades', value: grades }] : []),
      ...(school.type ? [{ label: 'Type', value: school.type }] : []),
      ...(school.distanceMiles != null
        ? [{ label: 'Distance', value: `${school.distanceMiles.toFixed(2)} mi` }]
        : []),
    ],
  }
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
