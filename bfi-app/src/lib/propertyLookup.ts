/**
 * Load a property shell from a searched address.
 * 1) Local Vite /api/property-lookup (dev — ATTOM_API_KEY server-side)
 * 2) Supabase Edge Function property-lookup
 * 3) Client Census/Nominatim address match (facts pending)
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

type LookupPayload = {
  match?: ResolvedAddress | null
  matches?: ResolvedAddress[]
  property?: Partial<MockProperty> | null
  factsStatus?: 'demo' | 'live' | 'pending'
  attomError?: string | null
  error?: string
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
    lat: extras?.lat ?? resolved.lat,
    lng: extras?.lng ?? resolved.lng,
    addressSource: extras?.addressSource ?? resolved.source,
    factsStatus: extras?.factsStatus ?? 'pending',
    starred: false,
    // Clear demo listing discrepancy unless explicitly provided
    claimedSqft: extras?.claimedSqft,
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

function statusFor(property: MockProperty, warning?: string): PropertyLookupStatus {
  if (property.factsStatus === 'live') {
    return {
      addressMatched: true,
      factsStatus: 'live',
      sourceLabel: 'Live county facts · ATTOM',
      warning,
    }
  }
  return {
    addressMatched: true,
    factsStatus: property.factsStatus ?? 'pending',
    sourceLabel: warning
      ? 'Address matched · county facts unavailable'
      : 'Address matched · county facts pending ATTOM',
    warning,
  }
}

function resultFromPayload(payload: LookupPayload): PropertyLookupResult | null {
  if (!payload.match) return null
  const factsStatus = payload.factsStatus ?? (payload.property ? 'live' : 'pending')
  const property = propertyFromResolvedAddress(payload.match, {
    ...payload.property,
    factsStatus,
  })
  return {
    property,
    resolved: payload.match,
    status: statusFor(
      property,
      payload.attomError
        ? `ATTOM: ${payload.attomError}. Showing matched address; county facts stay illustrative.`
        : undefined,
    ),
  }
}

async function lookupViaLocalApi(query: string, mode: 'search' | 'resolve') {
  try {
    const res = await fetch('/api/property-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode }),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    return (await res.json()) as LookupPayload
  } catch {
    return null
  }
}

async function lookupViaEdge(query: string, mode: 'search' | 'resolve') {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('property-lookup', {
      method: 'POST',
      body: { query, mode },
    })
    if (error) return null
    return data as LookupPayload
  } catch {
    return null
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

  const local = await lookupViaLocalApi(trimmed, 'resolve')
  if (local && !local.error) {
    const fromLocal = resultFromPayload(local)
    if (fromLocal) {
      writeCache(trimmed, fromLocal)
      return fromLocal
    }
  }

  const edge = await lookupViaEdge(trimmed, 'resolve')
  if (edge && !edge.error) {
    const fromEdge = resultFromPayload(edge)
    if (fromEdge) {
      writeCache(trimmed, fromEdge)
      return fromEdge
    }
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
    status: statusFor(property),
  }
  writeCache(trimmed, result)
  return result
}

export async function suggestAddresses(query: string) {
  const trimmed = query.trim()
  if (trimmed.length < 4) return searchAddresses(trimmed)

  const local = await lookupViaLocalApi(trimmed, 'search')
  if (local?.matches && local.matches.length > 0) {
    return { ok: true as const, matches: local.matches }
  }

  const edge = await lookupViaEdge(trimmed, 'search')
  if (edge?.matches && edge.matches.length > 0) {
    return { ok: true as const, matches: edge.matches }
  }

  return searchAddresses(trimmed)
}
