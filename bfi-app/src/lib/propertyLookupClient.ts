/**
 * Call the property-lookup Edge Function from web or native shells.
 * iOS WKWebView (capacitor:// origin) often CORS-blocks supabase-js fetch;
 * CapacitorHttp uses native networking and bypasses that.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { ResolvedAddress } from '@/data/addressTypes'
import type { MockProperty } from '@/data/mockProperty'
import {
  getSupabase,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabaseClient'

export type PropertyLookupPayload = {
  match?: ResolvedAddress | null
  matches?: ResolvedAddress[]
  property?: Partial<MockProperty> | null
  factsStatus?: 'demo' | 'live' | 'pending'
  attomError?: string | null
  error?: string
}

/**
 * Why the last Edge call failed. Native shells have no devtools by default,
 * so the property screen surfaces this instead of silently showing "pending".
 */
export type LookupDiagnostic =
  | { kind: 'no_keys' }
  | { kind: 'http_error'; status: number; body?: string }
  | { kind: 'network_error'; message: string }
  | { kind: 'bad_payload' }
  | { kind: 'edge_error'; message: string }

let lastDiagnostic: LookupDiagnostic | null = null

export function getLastLookupDiagnostic() {
  return lastDiagnostic
}

/** Short, buyer-readable explanation for the property status banner. */
export function describeLookupDiagnostic(diagnostic: LookupDiagnostic | null) {
  if (!diagnostic) return undefined
  switch (diagnostic.kind) {
    case 'no_keys':
      return 'This build has no Supabase keys, so county records cannot load. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to bfi-app/.env.local, then rebuild the app.'
    case 'http_error':
      return `County records service returned HTTP ${diagnostic.status}. Confirm the property-lookup Edge Function is deployed and its ATTOM key secret is set.`
    case 'network_error':
      return `Could not reach the county records service (${diagnostic.message}). Check the device connection and try again.`
    case 'edge_error':
      return `County records service reported: ${diagnostic.message}`
    case 'bad_payload':
      return 'County records service replied in an unexpected format. Redeploy the property-lookup Edge Function.'
  }
}

function edgeFunctionUrl() {
  const base = getSupabaseUrl()?.replace(/\/$/, '')
  if (!base) return null
  return `${base}/functions/v1/property-lookup`
}

function truncateBody(body: unknown) {
  if (typeof body !== 'string') return undefined
  return body.slice(0, 160)
}

async function invokeViaNativeHttp(
  query: string,
  mode: 'search' | 'resolve',
): Promise<PropertyLookupPayload | null> {
  const url = edgeFunctionUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) {
    lastDiagnostic = { kind: 'no_keys' }
    return null
  }

  try {
    const res = await CapacitorHttp.post({
      url,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      data: { query, mode },
    })

    if (res.status < 200 || res.status >= 300) {
      lastDiagnostic = {
        kind: 'http_error',
        status: res.status,
        body: truncateBody(res.data),
      }
      return null
    }

    const data = res.data
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as PropertyLookupPayload
      } catch {
        lastDiagnostic = { kind: 'bad_payload' }
        return null
      }
    }
    if (data && typeof data === 'object') return data as PropertyLookupPayload

    lastDiagnostic = { kind: 'bad_payload' }
    return null
  } catch (error) {
    lastDiagnostic = {
      kind: 'network_error',
      message: error instanceof Error ? error.message : 'unknown error',
    }
    return null
  }
}

async function invokeViaSupabaseJs(
  query: string,
  mode: 'search' | 'resolve',
): Promise<PropertyLookupPayload | null> {
  if (!isSupabaseConfigured()) {
    lastDiagnostic = { kind: 'no_keys' }
    return null
  }
  const supabase = getSupabase()
  if (!supabase) {
    lastDiagnostic = { kind: 'no_keys' }
    return null
  }
  try {
    const { data, error } = await supabase.functions.invoke('property-lookup', {
      method: 'POST',
      body: { query, mode },
    })
    if (error) {
      lastDiagnostic = { kind: 'edge_error', message: error.message }
      return null
    }
    return data as PropertyLookupPayload
  } catch (error) {
    lastDiagnostic = {
      kind: 'network_error',
      message: error instanceof Error ? error.message : 'unknown error',
    }
    return null
  }
}

/** Resolve / search via Edge. Native uses CapacitorHttp first. */
export async function invokePropertyLookup(
  query: string,
  mode: 'search' | 'resolve',
): Promise<PropertyLookupPayload | null> {
  if (Capacitor.isNativePlatform()) {
    const native = await invokeViaNativeHttp(query, mode)
    if (native && !native.error) {
      lastDiagnostic = null
      return native
    }
    if (native?.error) {
      lastDiagnostic = { kind: 'edge_error', message: native.error }
    }
  }

  const viaJs = await invokeViaSupabaseJs(query, mode)
  if (viaJs && !viaJs.error) {
    lastDiagnostic = null
    return viaJs
  }
  if (viaJs?.error) {
    lastDiagnostic = { kind: 'edge_error', message: viaJs.error }
  }
  return viaJs
}
