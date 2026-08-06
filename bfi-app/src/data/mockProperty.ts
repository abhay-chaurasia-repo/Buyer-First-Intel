export type PropertyChannelId =
  | 'catch-up'
  | 'huddle'
  | 'later'
  | 'threads'
  | 'announcements'
  | 'schools'
  | 'neighborhood'
  | 'verified-visits'
  | 'personal-notes'

export type PropertyChannel = {
  id: PropertyChannelId
  name: string
  unread?: number
  description: string
}

export type MockProperty = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  sqft: number
  bedrooms: number
  bathrooms: number
  yearBuilt: number
  claimedSqft?: number
  verifiedVisits: number
}

export const PROPERTY_CHANNELS: PropertyChannel[] = [
  {
    id: 'catch-up',
    name: 'catch-up',
    unread: 3,
    description: 'What changed since your last look',
  },
  {
    id: 'huddle',
    name: 'huddle',
    unread: 2,
    description: 'Discrepancies to pressure-test before an offer',
  },
  {
    id: 'later',
    name: 'later',
    description: 'Deferred diligence items',
  },
  {
    id: 'threads',
    name: 'threads',
    unread: 1,
    description: 'Structured observation threads',
  },
  {
    id: 'announcements',
    name: 'announcements',
    description: 'Property-level alerts and record updates',
  },
  {
    id: 'schools',
    name: 'schools',
    description: 'District and campus context',
  },
  {
    id: 'neighborhood',
    name: 'neighborhood',
    description: 'Buyer-reported neighborhood signals',
  },
  {
    id: 'verified-visits',
    name: 'verified-visits',
    description: 'GPS-confirmed presence at the property',
  },
  {
    id: 'personal-notes',
    name: 'personal-notes',
    description: 'Private notes only you can see',
  },
]

export const DEMO_PROPERTY: MockProperty = {
  id: 'demo-2924-oak',
  address: '2924 Oak Ridge Ave',
  city: 'Austin',
  state: 'TX',
  zipCode: '78704',
  sqft: 2509,
  bedrooms: 4,
  bathrooms: 2.5,
  yearBuilt: 1998,
  claimedSqft: 2924,
  verifiedVisits: 3,
}

export function resolvePropertyFromQuery(query: string): MockProperty {
  const trimmed = query.trim()
  if (!trimmed) return DEMO_PROPERTY

  return {
    ...DEMO_PROPERTY,
    id: `lookup-${encodeURIComponent(trimmed.toLowerCase()).slice(0, 48)}`,
    address: trimmed.includes(',') ? trimmed.split(',')[0]!.trim() : trimmed,
  }
}
