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
          : `County living area is ${property.sqft.toLocaleString()} sqft. Compare with the published size on Zillow or Redfin, then upvote whether it matches or looks overstated.`
        : `Demo shell shows ${property.sqft.toLocaleString()} sqft — replace by searching a live address with ATTOM bound.`,
      timestamp: isoMinutesAgo(18),
      source,
      fields: [
        {
          label: live ? 'Living area' : 'Living area (demo)',
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
        ...(property.majorImprovementsYear != null
          ? [
              {
                label: 'Major improvements year',
                value: String(property.majorImprovementsYear),
              },
            ]
          : []),
        ...(property.architecturalStyle
          ? [{ label: 'Architecture', value: property.architecturalStyle }]
          : []),
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
        ...(property.lotNumber ? [{ label: 'Lot #', value: property.lotNumber }] : []),
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
        property.architecturalStyle,
        property.subdivisionName ? `Subdivision ${property.subdivisionName}` : null,
        property.municipalityName ||
          (property.countyName ? `${property.countyName} County` : null),
      ]
        .filter(Boolean)
        .join(' · ') || 'County identity fields when published.',
      timestamp: isoMinutesAgo(55),
      source: live ? 'ATTOM basicprofile / expandedprofile' : 'Demo county shell',
      fields: [
        ...(property.propertyTypeLabel
          ? [{ label: 'Property type', value: property.propertyTypeLabel }]
          : []),
        ...(property.architecturalStyle
          ? [{ label: 'Architecture', value: property.architecturalStyle }]
          : []),
        ...(property.subdivisionName
          ? [{ label: 'Subdivision', value: property.subdivisionName }]
          : []),
        ...(property.legalDescription
          ? [{ label: 'Legal', value: property.legalDescription }]
          : []),
        ...(property.countyName ? [{ label: 'County', value: property.countyName }] : []),
        ...(property.municipalityName
          ? [{ label: 'Municipality', value: property.municipalityName }]
          : []),
        ...(property.taxCodeArea
          ? [{ label: 'Tax code area', value: property.taxCodeArea }]
          : []),
        ...(property.lotNumber ? [{ label: 'Lot #', value: property.lotNumber }] : []),
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
        ...(property.majorImprovementsYear != null
          ? [
              {
                label: 'Major improvements year',
                value: String(property.majorImprovementsYear),
              },
            ]
          : []),
      ],
    },
    {
      id: 'cf-title-finance',
      type: 'spec',
      channel: 'title-finance-cues',
      unreadCount: live ? 1 : 0,
      headline: 'Title, transfer & financing cues',
      preview: live
        ? [
            property.quitClaimFlag != null
              ? `Quitclaim ${property.quitClaimFlag ? 'Yes' : 'No'}`
              : null,
            property.reoFlag != null ? `REO ${property.reoFlag ? 'Yes' : 'No'}` : null,
            property.lastSaleSellerName ? `Seller ${property.lastSaleSellerName}` : null,
            property.mortgageLender ? `Lender ${property.mortgageLender}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Expanded-profile title and mortgage metadata when published.'
        : 'Demo shell — bind ATTOM expandedprofile.',
      timestamp: isoMinutesAgo(80),
      source: live ? 'ATTOM /property/expandedprofile' : 'Demo county shell',
      fields: [
        ...(property.quitClaimFlag != null
          ? [{ label: 'Quitclaim flag', value: property.quitClaimFlag ? 'Yes' : 'No' }]
          : []),
        ...(property.reoFlag != null
          ? [{ label: 'REO flag', value: property.reoFlag ? 'Yes' : 'No' }]
          : []),
        ...(property.lastSaleSellerName
          ? [{ label: 'Last seller', value: property.lastSaleSellerName }]
          : []),
        ...(property.mortgageLender
          ? [{ label: 'Mortgage lender', value: property.mortgageLender }]
          : []),
        ...(property.mortgageLoanType
          ? [{ label: 'Loan type', value: property.mortgageLoanType }]
          : []),
        ...(property.mortgageDate
          ? [{ label: 'Mortgage date', value: property.mortgageDate }]
          : []),
        ...(property.mortgageDueDate
          ? [{ label: 'Mortgage due', value: property.mortgageDueDate }]
          : []),
        ...(!live
          ? [{ label: 'Status', value: 'Demo — search a live address' }]
          : property.quitClaimFlag == null &&
              property.reoFlag == null &&
              !property.lastSaleSellerName &&
              !property.mortgageLender
            ? [{ label: 'Status', value: 'None published for this parcel' }]
            : []),
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
        ...(property.lastSaleSellerName
          ? [{ label: 'Last seller', value: property.lastSaleSellerName }]
          : []),
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
      preview: `${property.deedType} recorded ${property.lastSaleDate}${
        property.lastSalePriceLabel && property.lastSalePriceLabel !== '—'
          ? ` · ${property.lastSalePriceLabel}`
          : ''
      }.`,
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
    for (const [index, event] of history.slice(0, 8).entries()) {
      const headlineBits = [
        event.deedType,
        event.deedCode ? `(${event.deedCode})` : null,
      ]
        .filter(Boolean)
        .join(' ')
      items.push({
        id: event.id || `sh-event-${index}`,
        type: 'legal',
        channel: 'prior-transfers',
        unreadCount: index === 0 ? 1 : 0,
        headline: headlineBits,
        preview: [
          event.date,
          event.documentNumber ? `Doc ${event.documentNumber}` : null,
          event.sellerName ? `Seller ${event.sellerName}` : null,
          event.deedInLieu ? 'Deed-in-lieu' : null,
          event.sellerCarryBack ? 'Seller carry-back' : null,
          event.lenderName ? `Lender ${event.lenderName}` : null,
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
          { label: 'Transfer type', value: event.deedType },
          ...(event.deedCode ? [{ label: 'Deed code', value: event.deedCode }] : []),
          ...(event.documentType
            ? [{ label: 'Document type', value: event.documentType }]
            : []),
          {
            label: 'Document #',
            value: event.documentNumber || 'Not on file',
          },
          { label: 'Amount', value: event.amountLabel },
          ...(event.buyerName ? [{ label: 'Buyer', value: event.buyerName }] : []),
          ...(event.sellerName ? [{ label: 'Seller', value: event.sellerName }] : []),
          ...(event.deedInLieu != null
            ? [{ label: 'Deed in lieu', value: event.deedInLieu ? 'Yes' : 'No' }]
            : []),
          ...(event.sellerCarryBack != null
            ? [{ label: 'Seller carry-back', value: event.sellerCarryBack ? 'Yes' : 'No' }]
            : []),
          ...(event.titleCompany
            ? [{ label: 'Title company', value: event.titleCompany }]
            : []),
          ...(event.lenderName ? [{ label: 'Lender', value: event.lenderName }] : []),
          ...(event.loanType ? [{ label: 'Loan type', value: event.loanType }] : []),
          ...(event.loanTermMonths
            ? [{ label: 'Loan term (months)', value: event.loanTermMonths }]
            : []),
          ...(event.loanDueDate
            ? [{ label: 'Loan due', value: event.loanDueDate }]
            : []),
          ...(event.loanDocumentNumber
            ? [{ label: 'Loan document #', value: event.loanDocumentNumber }]
            : []),
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
  const live = property.factsStatus === 'live'
  const schools = property.schools || []
  const district = property.schoolDistrict
  const source = live
    ? 'ATTOM /property/detailwithschools'
    : 'GET /api/properties/:id/schools'

  if (schools.length === 0) {
    const items: CatchUpCard[] = live
      ? [
          {
            id: 'sc-pending',
            type: 'school',
            channel: 'assigned',
            unreadCount: 0,
            headline: 'Assigned schools',
            preview: district?.name
              ? `District ${district.name}. Campus list not returned for this address.`
              : 'ATTOM did not return assigned campuses for this address. Verify boundaries with the district.',
            timestamp: isoMinutesAgo(20),
            source,
            fields: [
              ...(district?.name
                ? [{ label: 'District', value: district.name }]
                : [{ label: 'District', value: '—' }]),
            ],
          },
        ]
      : [
          {
            id: 'sc-elementary',
            type: 'school',
            channel: 'elementary',
            unreadCount: 1,
            headline: 'Assigned elementary',
            preview:
              'Oak Ridge Elementary — verify current boundary with the district before deciding.',
            timestamp: isoMinutesAgo(20),
            source,
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
            preview:
              'South Austin Middle → Austin High School. Ratings are contextual — not a rankings marketplace.',
            timestamp: isoMinutesAgo(55),
            source,
            fields: [
              { label: 'Middle', value: 'South Austin Middle' },
              { label: 'High', value: 'Austin High School' },
            ],
          },
        ]
    return wrapResponse(property.id, `/api/properties/${property.id}/schools`, items)
  }

  const levelLabel: Record<string, string> = {
    elementary: 'Elementary',
    middle: 'Middle',
    high: 'High',
    other: 'Campus',
  }

  const items: CatchUpCard[] = []
  if (district?.name) {
    items.push({
      id: 'sc-district',
      type: 'school',
      channel: 'district',
      unreadCount: 1,
      headline: district.name,
      preview: [district.type, 'Assigned district for this address']
        .filter(Boolean)
        .join(' · '),
      timestamp: isoMinutesAgo(12),
      source,
      fields: [
        { label: 'District', value: district.name },
        ...(district.type ? [{ label: 'Type', value: district.type }] : []),
      ],
    })
  }

  for (const [index, school] of schools.entries()) {
    const level = school.level || 'other'
    const grades =
      school.gradeLow || school.gradeHigh
        ? [school.gradeLow, school.gradeHigh].filter(Boolean).join('–')
        : null
    items.push({
      id: school.id || `sc-${index}`,
      type: 'school',
      channel: level,
      unreadCount: index === 0 ? 1 : 0,
      headline: [levelLabel[level] || 'Campus', school.name].join(' · '),
      preview: [
        school.rating ? `Rating ${school.rating}` : null,
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
        ...(school.rating ? [{ label: 'Rating', value: school.rating }] : []),
        ...(school.gsTestRating != null
          ? [{ label: 'GreatSchools test', value: String(school.gsTestRating) }]
          : []),
        ...(grades ? [{ label: 'Grades', value: grades }] : []),
        ...(school.type ? [{ label: 'Type', value: school.type }] : []),
        ...(school.distanceMiles != null
          ? [{ label: 'Distance', value: `${school.distanceMiles.toFixed(2)} mi` }]
          : []),
        ...(district?.name ? [{ label: 'District', value: district.name }] : []),
      ],
    })
  }

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
