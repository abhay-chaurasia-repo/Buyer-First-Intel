/**
 * Server-backed search quota via Supabase RPCs.
 * Used when the signed-in owner is a real auth.users UUID (phone login).
 */

import { SEARCH_PLAN } from '@/data/authPolicy'
import {
  currentMonthKey,
  getSearchQuotaSnapshot as getLocalSnapshot,
  monthLabel,
  tryConsumeSearch as tryConsumeLocal,
  activateSearchSubscription as activateLocalSubscription,
  type SearchAccess,
  type SearchQuotaSnapshot,
} from '@/data/searchQuota'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isSupabaseOwnerId(ownerId: string | undefined | null) {
  return Boolean(ownerId && UUID_RE.test(ownerId))
}

function useRemoteQuota(ownerId?: string) {
  return isSupabaseConfigured() && isSupabaseOwnerId(ownerId)
}

type RpcQuota = {
  monthKey?: string
  used?: number
  freeCap?: number
  remaining?: number | null
  subscribed?: boolean
}

function snapshotFromRpc(raw: RpcQuota | null | undefined): SearchQuotaSnapshot {
  const monthKey = raw?.monthKey || currentMonthKey()
  const used = Number(raw?.used ?? 0)
  const freeCap = Number(raw?.freeCap ?? SEARCH_PLAN.freeSearchesPerMonth) as SearchQuotaSnapshot['freeCap']
  const subscribed = Boolean(raw?.subscribed)
  const remaining = subscribed
    ? ('unlimited' as const)
    : Math.max(0, typeof raw?.remaining === 'number' ? raw.remaining : freeCap - used)

  return {
    monthKey,
    monthLabel: monthLabel(monthKey),
    used,
    freeCap,
    remaining,
    subscribed,
    unlimited: subscribed,
    priceLabel: SEARCH_PLAN.priceLabel,
    priceUsd: SEARCH_PLAN.subscriptionPriceUsd,
  }
}

export async function ensureRemoteProfile() {
  const supabase = getSupabase()
  if (!supabase) return { ok: false as const, error: 'Supabase not configured' }
  const { error } = await supabase.rpc('ensure_profile')
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function fetchSearchQuotaSnapshot(ownerId?: string): Promise<SearchQuotaSnapshot> {
  if (!useRemoteQuota(ownerId)) {
    return getLocalSnapshot(ownerId)
  }

  const supabase = getSupabase()
  if (!supabase) return getLocalSnapshot(ownerId)

  await supabase.rpc('ensure_profile')
  const { data, error } = await supabase.rpc('get_search_quota')
  if (error) {
    console.warn('get_search_quota failed, falling back local', error.message)
    return getLocalSnapshot(ownerId)
  }
  return snapshotFromRpc(data as RpcQuota)
}

type RpcConsume = {
  ok?: boolean
  reason?: string
  used?: number
  remaining?: number | null
}

export async function consumeSearch(
  address: string,
  ownerId?: string,
): Promise<SearchAccess> {
  if (!useRemoteQuota(ownerId)) {
    return tryConsumeLocal(address, ownerId)
  }

  const supabase = getSupabase()
  if (!supabase) return tryConsumeLocal(address, ownerId)

  const { data, error } = await supabase.rpc('consume_search', { p_address: address })
  if (error) {
    console.warn('consume_search failed, falling back local', error.message)
    return tryConsumeLocal(address, ownerId)
  }

  const raw = data as RpcConsume
  const used = Number(raw.used ?? 0)
  const remaining =
    raw.remaining == null ? ('unlimited' as const) : Math.max(0, Number(raw.remaining))

  if (!raw.ok) {
    return { ok: false, remaining: 0, reason: 'quota_exceeded', used }
  }

  const reason =
    raw.reason === 'subscribed'
      ? 'subscribed'
      : raw.reason === 'repeat'
        ? 'repeat'
        : 'free'

  return { ok: true, remaining, reason, used }
}

export async function activateRemoteSearchSubscription(ownerId?: string) {
  if (!useRemoteQuota(ownerId)) {
    activateLocalSubscription(ownerId)
    return fetchSearchQuotaSnapshot(ownerId)
  }

  const supabase = getSupabase()
  if (!supabase) {
    activateLocalSubscription(ownerId)
    return fetchSearchQuotaSnapshot(ownerId)
  }

  const { data, error } = await supabase.rpc('activate_search_subscription')
  if (error) {
    console.warn('activate_search_subscription failed, falling back local', error.message)
    activateLocalSubscription(ownerId)
    return fetchSearchQuotaSnapshot(ownerId)
  }
  return snapshotFromRpc(data as RpcQuota)
}
