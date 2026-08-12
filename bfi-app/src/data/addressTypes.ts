/** Shared address + property lookup types for search → detail. */

export type AddressProvider = 'census' | 'nominatim' | 'edge' | 'demo'

export type ResolvedAddress = {
  /** Stable id from normalized components (used as MockProperty.id). */
  id: string
  /** Display line: "3150 Duval St, Austin, TX 78705" */
  formatted: string
  street: string
  city: string
  state: string
  zipCode: string
  lat: number
  lng: number
  source: AddressProvider
  matchedAddress?: string
}

export type AddressSearchResult =
  | { ok: true; matches: ResolvedAddress[] }
  | { ok: false; error: string; matches: [] }
