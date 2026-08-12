/**
 * Load a property shell from a searched address.
 * Address components come from live geocoding; county facts stay demo until ATTOM.
 */

import type { ResolvedAddress } from '@/data/addressTypes'
import { DEMO_PROPERTY, type MockProperty } from '@/data/mockProperty'
import { resolveAddress, searchAddresses } from '@/lib/addressSearch'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'

const LOOKUP_CACHE_KEY = 'bfi.propertyLookupCache'

export type PropertyLookupStatus = {
  addressMatched: boolean
  factsStatus: 'demo' | 'live' | 'pending'
  sourceLabel: string
  warning?: string
}

export type PropertyLookupResult = {
  property: MockProperty
  resolved: ResolvedAddress | null
  status: PropertyLookupStatus
}

type CacheEntry = {
  query: string
  result: PropertyLookupResult
  savedAt: number
}

function readCache(query: string): PropertyLookupResult | null {
  try {
    const raw = sessionStorage.getItem(LOOKUP_CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (entry.query !== query.trim().toLowerCase()) return null
    if (Date.now() - entry.savedAt > 30 * 60 * 1000) return null
    return entry.result
  } catch {
    return null
  }
}

function writeCache(query: string, result: PropertyLookupResult) {
  try {
    const entry: CacheEntry = {
      query: query.trim().toLowerCase(),
      result,
      savedAt: Date.now(),
    }
    sessionStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore
  }
}

export function propertyFromResolvedAddress(
  resolved: ResolvedAddress,
  extras?: Partial<MockProperty>,
): MockProperty {
  return {
    ...DEMO_PROPERTY,
    ...extras,
    id: resolved.id,
    address: resolved.street,
    city: resolved.city,
    state: resolved.state,
    zipCode: resolved.zipCode,
    lat: resolved.lat,
    lng: resolved.lng,
    addressSource: resolved.source,
    factsStatus: extras?.factsStatus ?? 'pending',
    starred: false,
  }
}

/** Sync fallback used before async lookup finishes (or when geocode fails). */
export function propertyFromUnresolvedQuery(query: string): MockProperty {
  const trimmed = query.trim()
  if (!trimmed) return { ...DEMO_PROPERTY, factsStatus: 'demo', addressSource: 'demo' }

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

export async function loadPropertyFromQuery(query: string): Promise<PropertyLookupResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      property: { ...DEMO_PROPERTY, factsStatus: 'demo', addressSource: 'demo' },
      resolved: null,
      status: {
        addressMatched: true,
        factsStatus: 'demo',
        sourceLabel: 'Demo property',
      },
    }
  }

  const cached = readCache(trimmed)
  if (cached) return cached

  // Prefer Edge Function resolve (ATTOM-ready) when it returns a property shell.
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase()
      if (supabase) {
        const { data } = await supabase.functions.invoke('property-lookup', {
          method: 'POST',
          body: { query: trimmed, mode: 'resolve' },
        })
        const payload = data as {
          match?: ResolvedAddress
          property?: Partial<MockProperty>
          factsStatus?: 'demo' | 'live' | 'pending'
        } | null
        if (payload?.match) {
          const property = propertyFromResolvedAddress(payload.match, {
            ...payload.property,
            factsStatus: payload.factsStatus ?? 'pending',
          })
          const result: PropertyLookupResult = {
            property,
            resolved: payload.match,
            status: {
              addressMatched: true,
              factsStatus: property.factsStatus ?? 'pending',
              sourceLabel:
                property.factsStatus === 'live'
                  ? 'Live county facts'
                  : 'Address matched · county facts pending ATTOM',
            },
          }
          writeCache(trimmed, result)
          return result
        }
      }
    }
  } catch {
    // fall through to client geocode
  }

  const resolved = await resolveAddress(trimmed)
  if (!resolved) {
    const result: PropertyLookupResult = {
      property: propertyFromUnresolvedQuery(trimmed),
      resolved: null,
      status: {
        addressMatched: false,
        factsStatus: 'pending',
        sourceLabel: 'Address not matched',
        warning:
          'No US address match found. Try a fuller street + city + state. County facts stay illustrative until matched.',
      },
    }
    writeCache(trimmed, result)
    return result
  }

  const property = propertyFromResolvedAddress(resolved)
  const result: PropertyLookupResult = {
    property,
    resolved,
    status: {
      addressMatched: true,
      factsStatus: 'pending',
      sourceLabel: 'Address matched · county facts pending ATTOM',
    },
  }
  writeCache(trimmed, result)
  return result
}

export async function suggestAddresses(query: string) {
  return searchAddresses(query)
}
