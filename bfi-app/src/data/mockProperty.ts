import { BUYER_LABEL_CATEGORIES } from '@/data/buyerCommunityLabels'

export type PropertyChannelId =
  | '01-property-summary'
  | '02-owner-details'
  | '03-sales-and-deed'
  | '04-tax-assessment'
  | '05-school-ratings'
  | '06-neighborhood-vibe'
  | '07-verified-buyer-insights'
  | '08-personal-notes'

export type PropertyChannel = {
  id: PropertyChannelId
  number: string
  name: string
  label: string
  unread?: number
  description: string
}

export type HistoryAddress = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  saved: boolean
  hasPrivateNotes: boolean
  lastViewed: string
}

export type MetricCardId =
  | 'county-facts'
  | 'sales-history'
  | 'tax-history'
  | 'verified-visits'
  | 'buyer-insights'
  | 'schools'

export type MetricCard = {
  id: MetricCardId
  title: string
  subtitle: string
  /** Compact Slack-style corner badge (count or short status) */
  badge?: string
  detail: string
  accent: MetricCardId
}

export type ChannelField = {
  label: string
  value: string
  source?: string
}

export type ChannelCanvasData = {
  id: PropertyChannelId
  title: string
  subtitle: string
  fields: ChannelField[]
  notes?: string[]
  /** Reserved for future API payload binding */
  apiStub?: {
    endpoint: string
    method: 'GET' | 'POST'
    resourceKey: string
  }
}

export type PropertySaleEvent = {
  id: string
  /** Transaction / transfer date */
  date: string
  recordedDate?: string
  deedType: string
  documentNumber?: string
  buyerName?: string
  sellerName?: string
  /** Buyer-first: never show raw sale amount */
  amountLabel: string
}

export type MockProperty = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  /** WGS84 from address match (GPS Verify will use these). */
  lat?: number
  lng?: number
  /** How the street/city/state were obtained */
  addressSource?: 'census' | 'nominatim' | 'edge' | 'demo' | 'unresolved' | 'google'
  /** County/ATTOM facts: demo shell, pending live bind, or live */
  factsStatus?: 'demo' | 'live' | 'pending'
  /** ATTOM identifier when facts are live */
  attomId?: number
  saleDocumentNumber?: string
  taxLandLabel?: string
  taxImprovementLabel?: string
  /** Annual tax amount label from ATTOM assessment */
  taxAmountLabel?: string
  /** Market value label when assessor publishes it */
  marketValueLabel?: string
  /** Recorded transfers for Sales History (prices hidden) */
  salesHistory?: PropertySaleEvent[]
  sqft: number
  bedrooms: number
  bathrooms: number
  /** ATTOM bathsFull when present (basicprofile) */
  bathsFull?: number
  /** ATTOM bathsPartial when present (basicprofile) */
  bathsPartial?: number
  yearBuilt: number
  claimedSqft?: number
  verifiedVisits: number
  ownerName: string
  /** Assessor mailing address one-line when published */
  ownerMailingAddress?: string
  ownerOccupied: boolean
  lastSaleDate: string
  lastSalePriceLabel: string
  deedType: string
  taxAssessedValueLabel: string
  taxYear: number
  lotSizeSqft: number
  apn: string
  zoning: string
  starred: boolean
}

export const PROPERTY_CHANNELS: PropertyChannel[] = [
  {
    id: '01-property-summary',
    number: '01',
    name: 'property-summary',
    label: '01-property-summary',
    unread: 2,
    description: 'County facts and size discrepancies',
  },
  {
    id: '02-owner-details',
    number: '02',
    name: 'owner-details',
    label: '02-owner-details',
    description: 'Owner of record and occupancy',
  },
  {
    id: '03-sales-and-deed',
    number: '03',
    name: 'sales-and-deed',
    label: '03-sales-and-deed',
    unread: 1,
    description: 'Sale history and deed instruments',
  },
  {
    id: '04-tax-assessment',
    number: '04',
    name: 'tax-assessment',
    label: '04-tax-assessment',
    description: 'Assessed value and tax context',
  },
  {
    id: '05-school-ratings',
    number: '05',
    name: 'school-ratings',
    label: '05-school-ratings',
    description: 'Assigned schools and district context',
  },
  {
    id: '06-neighborhood-vibe',
    number: '06',
    name: 'neighborhood-vibe',
    label: '06-neighborhood-vibe',
    unread: 3,
    description: 'Structured neighborhood buyer signals',
  },
  {
    id: '07-verified-buyer-insights',
    number: '07',
    name: 'verified-buyer-insights',
    label: '07-verified-buyer-insights',
    description: 'Aggregated verified buyer observations',
  },
  {
    id: '08-personal-notes',
    number: '08',
    name: 'personal-notes',
    label: '08-personal-notes',
    description: 'Private notes only you can see',
  },
]

export const DEMO_PROPERTY: MockProperty = {
  id: 'demo-2924-oak',
  address: '2924 Oak Ridge Ave',
  city: 'Austin',
  state: 'TX',
  zipCode: '78704',
  lat: 30.2431,
  lng: -97.7692,
  addressSource: 'demo',
  factsStatus: 'demo',
  sqft: 2509,
  bedrooms: 4,
  bathrooms: 2.5,
  yearBuilt: 1998,
  claimedSqft: 2924,
  verifiedVisits: 6,
  ownerName: 'Rivera Family Trust',
  ownerOccupied: true,
  lastSaleDate: '2019-06-14',
  lastSalePriceLabel: 'Not shown (buyer-first)',
  deedType: 'Warranty Deed',
  taxAssessedValueLabel: 'County assessed · 2025',
  taxYear: 2025,
  lotSizeSqft: 8276,
  apn: '0410120809',
  zoning: 'SF-3',
  starred: false,
}

export const SEARCH_HISTORY: HistoryAddress[] = [
  {
    id: 'hist-1',
    address: '2924 Oak Ridge Ave',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    saved: true,
    hasPrivateNotes: true,
    lastViewed: 'Today',
  },
  {
    id: 'hist-2',
    address: '1187 Barton Hills Dr',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    saved: true,
    hasPrivateNotes: true,
    lastViewed: 'Yesterday',
  },
  {
    id: 'hist-3',
    address: '4502 Duval St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78751',
    saved: false,
    hasPrivateNotes: false,
    lastViewed: '3 days ago',
  },
  {
    id: 'hist-4',
    address: '901 W Mary St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    saved: true,
    hasPrivateNotes: false,
    lastViewed: 'Last week',
  },
  {
    id: 'hist-5',
    address: '2104 Travis Heights Blvd',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    saved: false,
    hasPrivateNotes: true,
    lastViewed: 'Last week',
  },
  {
    id: 'hist-6',
    address: '3401 Cherrywood Rd',
    city: 'Austin',
    state: 'TX',
    zipCode: '78722',
    saved: true,
    hasPrivateNotes: false,
    lastViewed: '2 weeks ago',
  },
  {
    id: 'hist-7',
    address: '1609 West Ave',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    saved: false,
    hasPrivateNotes: false,
    lastViewed: '2 weeks ago',
  },
  {
    id: 'hist-8',
    address: '4805 Rosedale Ave',
    city: 'Austin',
    state: 'TX',
    zipCode: '78756',
    saved: true,
    hasPrivateNotes: true,
    lastViewed: '3 weeks ago',
  },
  {
    id: 'hist-9',
    address: '2207 Scenic Dr',
    city: 'Austin',
    state: 'TX',
    zipCode: '78703',
    saved: false,
    hasPrivateNotes: false,
    lastViewed: 'Last month',
  },
  {
    id: 'hist-10',
    address: '7612 Meadowood Dr',
    city: 'Austin',
    state: 'TX',
    zipCode: '78745',
    saved: true,
    hasPrivateNotes: false,
    lastViewed: 'Last month',
  },
]

export function getMetricCards(property: MockProperty): MetricCard[] {
  const hasDiscrepancy = Boolean(
    property.claimedSqft && property.sqft && property.claimedSqft !== property.sqft,
  )

  return [
    {
      id: 'county-facts',
      title: "County's Fact",
      subtitle: 'Public records',
      badge: hasDiscrepancy ? '1' : undefined,
      detail: `County ${property.sqft.toLocaleString()} sqft · ${property.bedrooms}/${property.bathrooms}`,
      accent: 'county-facts',
    },
    {
      id: 'sales-history',
      title: 'Sales History',
      subtitle: 'Deed transfers',
      badge: '2',
      detail: `${property.deedType} · ${property.lastSaleDate}`,
      accent: 'sales-history',
    },
    {
      id: 'tax-history',
      title: 'Tax History',
      subtitle: 'Assessments',
      badge: '2',
      detail: `${property.taxYear} · ${property.taxAssessedValueLabel}`,
      accent: 'tax-history',
    },
    {
      id: 'verified-visits',
      title: 'Verified Visits',
      subtitle: 'GPS presence',
      badge: String(property.verifiedVisits),
          detail: 'Dated GPS presence · community labels when a visit has them',
      accent: 'verified-visits',
    },
    {
      id: 'buyer-insights',
      title: 'Buyer Community',
      subtitle: 'Label votes',
      badge: String(BUYER_LABEL_CATEGORIES.length),
      detail: 'Plus = upsides · Watch = watch-outs · buyers upvote fixed labels',
      accent: 'buyer-insights',
    },
    {
      id: 'schools',
      title: 'Schools',
      subtitle: 'Associated',
      badge: '2',
      detail: 'Assigned campuses for this address',
      accent: 'schools',
    },
  ]
}

export function getChannelCanvas(
  channelId: PropertyChannelId,
  property: MockProperty,
): ChannelCanvasData {
  const canvases: Record<PropertyChannelId, ChannelCanvasData> = {
    '01-property-summary': {
      id: '01-property-summary',
      title: 'Property Summary',
      subtitle: 'Public-record facts vs externally claimed size',
      apiStub: {
        endpoint: '/api/properties/:id',
        method: 'GET',
        resourceKey: 'property.summary',
      },
      fields: [
        {
          label: 'County living area',
          value: `${property.sqft.toLocaleString()} sqft`,
          source: 'ATTOM basicprofile',
        },
        {
          label: 'Claimed living area',
          value: property.claimedSqft ? `${property.claimedSqft.toLocaleString()} sqft` : '—',
          source: 'External claim',
        },
        { label: 'Bedrooms', value: String(property.bedrooms), source: 'ATTOM basicprofile' },
        {
          label: 'Bathrooms',
          value:
            property.bathsFull != null || property.bathsPartial != null
              ? `${property.bathrooms} (${[
                  property.bathsFull != null ? `${property.bathsFull} full` : null,
                  property.bathsPartial != null ? `${property.bathsPartial} partial` : null,
                ]
                  .filter(Boolean)
                  .join(', ')})`
              : String(property.bathrooms),
          source: 'ATTOM basicprofile',
        },
        { label: 'Year built', value: String(property.yearBuilt), source: 'ATTOM basicprofile' },
        { label: 'Lot size', value: `${property.lotSizeSqft.toLocaleString()} sqft`, source: 'County' },
        { label: 'Zoning', value: property.zoning, source: 'County' },
        { label: 'APN', value: property.apn, source: 'County' },
      ],
      notes: [
        'Size discrepancy flagged for buyer huddle before offer.',
        'Living-area classification (basement / garage) not confirmed.',
      ],
    },
    '02-owner-details': {
      id: '02-owner-details',
      title: 'Owner Details',
      subtitle: 'Owner of record from public sources',
      apiStub: {
        endpoint: '/api/properties/:id',
        method: 'GET',
        resourceKey: 'property.owner',
      },
      fields: [
        { label: 'Owner of record', value: property.ownerName, source: 'ATTOM basicprofile' },
        {
          label: 'Owner occupied',
          value: property.ownerOccupied ? 'Yes' : 'No',
          source: 'ATTOM basicprofile',
        },
        {
          label: 'Mailing address',
          value: property.ownerMailingAddress || 'Same as property (stub)',
          source: property.ownerMailingAddress ? 'ATTOM basicprofile' : 'County',
        },
        { label: 'Ownership type', value: 'Trust', source: 'Deed stub' },
      ],
      notes: ['Owner identity is public-record only — not for outreach tooling.'],
    },
    '03-sales-and-deed': {
      id: '03-sales-and-deed',
      title: 'Sales & Deed',
      subtitle: 'Transfer history useful for diligence, not pricing advice',
      apiStub: {
        endpoint: '/api/properties/:id',
        method: 'GET',
        resourceKey: 'property.sales',
      },
      fields: [
        { label: 'Last sale date', value: property.lastSaleDate, source: 'County recorder' },
        { label: 'Sale amount', value: property.lastSalePriceLabel, source: 'Policy' },
        { label: 'Deed type', value: property.deedType, source: 'County recorder' },
        { label: 'Document #', value: '2019-084221 (stub)', source: 'Recorder stub' },
      ],
      notes: ['Due Diligence intentionally de-emphasizes sale price as a decision signal.'],
    },
    '04-tax-assessment': {
      id: '04-tax-assessment',
      title: 'Tax Assessment',
      subtitle: 'Assessed value context from county tax rolls',
      apiStub: {
        endpoint: '/api/properties/:id',
        method: 'GET',
        resourceKey: 'property.tax',
      },
      fields: [
        { label: 'Tax year', value: String(property.taxYear), source: 'Assessor' },
        { label: 'Assessed value', value: property.taxAssessedValueLabel, source: 'Assessor' },
        { label: 'Land assessed', value: 'Stub — bind ATTOM land value', source: 'Assessor' },
        { label: 'Improvement assessed', value: 'Stub — bind ATTOM improvement value', source: 'Assessor' },
        { label: 'Exemptions', value: 'Homestead (stub)', source: 'Assessor' },
      ],
    },
    '05-school-ratings': {
      id: '05-school-ratings',
      title: 'School Ratings',
      subtitle: 'Assigned campuses for planning — verify boundaries directly',
      apiStub: {
        endpoint: '/api/properties/:id/schools',
        method: 'GET',
        resourceKey: 'property.schools',
      },
      fields: [
        { label: 'Elementary', value: 'Oak Ridge Elementary', source: 'District stub' },
        { label: 'Middle', value: 'South Austin Middle', source: 'District stub' },
        { label: 'High', value: 'Austin High School', source: 'District stub' },
        { label: 'District', value: 'Austin ISD', source: 'District stub' },
      ],
      notes: ['Ratings are contextual only — not a ranking marketplace.'],
    },
    '06-neighborhood-vibe': {
      id: '06-neighborhood-vibe',
      title: 'Neighborhood Vibe',
      subtitle: 'Structured buyer signals — aggregated, not sentiment scores',
      apiStub: {
        endpoint: '/api/flags/:propertyId',
        method: 'GET',
        resourceKey: 'property.neighborhoodSignals',
      },
      fields: [
        { label: 'Evening street noise', value: '3 buyers observed', source: 'Aggregated' },
        { label: 'Driveway depth', value: '4 buyers noted limited depth', source: 'Aggregated' },
        { label: 'Parking after 6pm', value: '2 buyers noted tight street parking', source: 'Aggregated' },
        { label: 'Public free text', value: 'Not shown', source: 'Policy' },
      ],
    },
    '07-verified-buyer-insights': {
      id: '07-verified-buyer-insights',
      title: 'Verified Buyer Insights',
      subtitle: 'Observations weighted by GPS-verified presence',
      apiStub: {
        endpoint: '/api/flags/:propertyId',
        method: 'GET',
        resourceKey: 'property.verifiedInsights',
      },
      fields: [
        { label: 'Verified visits', value: String(property.verifiedVisits), source: 'GPS' },
        { label: 'Possible garage conversion', value: '1 verified buyer flagged', source: 'Insight' },
        { label: 'Ceiling height concern', value: '0 verified buyers', source: 'Insight' },
        { label: 'Basement present', value: '2 verified buyers confirmed', source: 'Insight' },
      ],
      notes: ['Insights stay structured. No ratings, upvotes, or public comment feed.'],
    },
    '08-personal-notes': {
      id: '08-personal-notes',
      title: 'Personal Notes',
      subtitle: 'Private workspace notes for this address',
      apiStub: {
        endpoint: '/api/notes/:propertyId',
        method: 'GET',
        resourceKey: 'property.personalNotes',
      },
      fields: [
        { label: 'Visibility', value: 'Only you', source: 'Local / future RLS' },
        { label: 'Note count', value: '3', source: 'Stub' },
      ],
      notes: [
        `Touring ${property.address} Saturday morning.`,
        'Ask about foundation report and water heater age.',
        'Compare claimed living area against county living area only.',
      ],
    },
  }

  return canvases[channelId]
}

/** Sync stub — prefer `loadPropertyFromQuery` for live address matching. */
export function resolvePropertyFromQuery(query: string): MockProperty {
  const trimmed = query.trim()
  if (!trimmed) return DEMO_PROPERTY

  const street = trimmed.includes(',') ? trimmed.split(',')[0]!.trim() : trimmed

  return {
    ...DEMO_PROPERTY,
    id: `lookup-${encodeURIComponent(trimmed.toLowerCase()).slice(0, 48)}`,
    address: street,
    addressSource: 'unresolved',
    factsStatus: 'pending',
    starred: false,
  }
}
