/**
 * Call the property-lookup Edge Function from web or native shells.
 * iOS WKWebView (capacitor:// origin) often CORS-blocks supabase-js fetch;
 * CapacitorHttp uses native networking and bypasses that.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { ResolvedAddress } from '@/data/addressTypes'
import type { MockProperty } from '@/data/mockProperty'
import { getSupabase, getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '@/lib/supabaseClient'

export type PropertyLookupPayload = {
  match?: ResolvedAddress | null
  matches?: ResolvedAddress[]
  property?: Partial<MockProperty> | null
  factsStatus?: 'demo' | 'live' | 'pending'
  attomError?: string | null
  error?: string
}

function edgeFunctionUrl() {
  const base = getSupabaseUrl()?.replace(/\/$/, '')
  if (!base) return null
  return `${base}/functions/v1/property-lookup`
}

async function invokeViaNativeHttp(
  query: string,
  mode: 'search' | 'resolve',
): Promise<PropertyLookupPayload | null> {
  const url = edgeFunctionUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) return null

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
    if (res.status < 200 || res.status >= 300) return null
    const data = res.data
    if (data == null) return null
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as PropertyLookupPayload
      } catch {
        return null
      }
    }
    if (typeof data === 'object') return data as PropertyLookupPayload
    return null
  } catch {
    return null
  }
}

async function invokeViaSupabaseJs(
  query: string,
  mode: 'search' | 'resolve',
): Promise<PropertyLookupPayload | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('property-lookup', {
      method: 'POST',
      body: { query, mode },
    })
    if (error) return null
    return data as PropertyLookupPayload
  } catch {
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
    if (native && !native.error) return native
  }
  return invokeViaSupabaseJs(query, mode)
}
