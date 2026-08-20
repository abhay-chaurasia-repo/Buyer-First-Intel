/**
 * Server-backed Buyer Community: presence events + structured label votes.
 * Local storage is a cache. After a successful pull, Supabase is source of truth.
 * Remote GLA labels do not need Presence Confirmed; on-site labels do.
 */

import { persistBuyerVoteState } from '@/data/buyerCommunityStorage'
import { loadAuthSession } from '@/data/authSession'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { isSupabaseOwnerId } from '@/lib/searchQuotaApi'

export const REMOTE_GLA_LABEL_IDS = [
  'published-listing-size-matches-county',
  'published-listing-size-overstated',
] as const

export function isRemoteGlaLabel(labelId: string) {
  return (REMOTE_GLA_LABEL_IDS as readonly string[]).includes(labelId)
}

export type CommunityLabelTally = {
  id: string
  count: number
  mine: boolean
}

export type CommunitySummary = {
  propertyId: string
  canContribute: boolean
  myLatestPresence: string | null
  presenceCount: number
  labels: Record<string, CommunityLabelTally>
}

export type PresenceLogEvent = {
  id: string
  confirmedAt: string
  distanceMeters: number
  accuracyMeters: number
  isYou: boolean
  communityLabelIds: string[]
}

type RpcSummary = {
  propertyId?: string
  canContribute?: boolean
  myLatestPresence?: string | null
  presenceCount?: number
  labels?: Array<{ id?: string; count?: number; mine?: boolean }>
}

function canUseCommunityRemote() {
  const session = loadAuthSession()
  return isSupabaseConfigured() && isSupabaseOwnerId(session?.userId)
}

function parseSummary(propertyId: string, raw: RpcSummary | null | undefined): CommunitySummary {
  const labels: Record<string, CommunityLabelTally> = {}
  for (const row of raw?.labels ?? []) {
    if (!row?.id) continue
    labels[row.id] = {
      id: row.id,
      count: Number(row.count ?? 0),
      mine: Boolean(row.mine),
    }
  }
  return {
    propertyId: raw?.propertyId || propertyId,
    canContribute: Boolean(raw?.canContribute),
    myLatestPresence: raw?.myLatestPresence ?? null,
    presenceCount: Number(raw?.presenceCount ?? 0),
    labels,
  }
}

function cacheSummary(summary: CommunitySummary) {
  const myVotes = Object.values(summary.labels)
    .filter((row) => row.mine)
    .map((row) => row.id)
  persistBuyerVoteState(summary.propertyId, { myVotes, localBoosts: {} })
}

export function displayedVoteCount(
  labelId: string,
  myVotes: string[],
  summary: CommunitySummary | null,
) {
  const tally = summary?.labels[labelId]
  const mineNow = myVotes.includes(labelId)
  if (tally) {
    if (mineNow && !tally.mine) return tally.count + 1
    if (!mineNow && tally.mine) return Math.max(0, tally.count - 1)
    return tally.count
  }
  return mineNow ? 1 : 0
}

function applyExclusiveGla(myVotes: string[], labelId: string, turningOn: boolean) {
  if (!turningOn || !isRemoteGlaLabel(labelId)) return myVotes
  return myVotes.filter((id) => !isRemoteGlaLabel(id) || id === labelId)
}

export function optimisticToggleVotes(
  myVotes: string[],
  labelId: string,
): { myVotes: string[]; turningOn: boolean } {
  const already = myVotes.includes(labelId)
  if (already) {
    return { myVotes: myVotes.filter((id) => id !== labelId), turningOn: false }
  }
  return {
    myVotes: applyExclusiveGla([...myVotes, labelId], labelId, true),
    turningOn: true,
  }
}

export async function fetchCommunitySummary(
  propertyId: string,
): Promise<CommunitySummary | null> {
  if (!canUseCommunityRemote()) return null
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.rpc('get_community_summary', {
    p_property_id: propertyId,
  })
  if (error) {
    console.warn('get_community_summary failed', error.message)
    return null
  }
  const summary = parseSummary(propertyId, data as RpcSummary)
  cacheSummary(summary)
  return summary
}

export async function toggleCommunityVote(
  propertyId: string,
  labelId: string,
): Promise<{ ok: boolean; reason?: string; summary: CommunitySummary | null }> {
  if (!canUseCommunityRemote()) {
    return { ok: false, reason: 'local_only', summary: null }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'unavailable', summary: null }

  const { data, error } = await supabase.rpc('toggle_community_vote', {
    p_property_id: propertyId,
    p_label_id: labelId,
  })
  if (error) {
    console.warn('toggle_community_vote failed', error.message)
    return { ok: false, reason: error.message, summary: null }
  }
  const raw = data as { ok?: boolean; reason?: string; summary?: RpcSummary } | null
  if (!raw || raw.ok === false) {
    const summary = raw?.summary ? parseSummary(propertyId, raw.summary) : null
    if (summary) cacheSummary(summary)
    return { ok: false, reason: raw?.reason || 'rejected', summary }
  }
  const summary = raw.summary ? parseSummary(propertyId, raw.summary) : null
  if (summary) cacheSummary(summary)
  return { ok: true, summary }
}

export async function recordPresenceRemote(input: {
  propertyId: string
  deviceLat: number
  deviceLng: number
  pinLat: number
  pinLng: number
  accuracyMeters: number
}): Promise<{ ok: boolean; reason?: string; summary: CommunitySummary | null }> {
  if (!canUseCommunityRemote()) {
    return { ok: false, reason: 'local_only', summary: null }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'unavailable', summary: null }

  const { data, error } = await supabase.rpc('record_presence', {
    p_property_id: input.propertyId,
    p_device_lat: input.deviceLat,
    p_device_lng: input.deviceLng,
    p_pin_lat: input.pinLat,
    p_pin_lng: input.pinLng,
    p_accuracy_meters: input.accuracyMeters,
  })
  if (error) {
    console.warn('record_presence failed', error.message)
    return { ok: false, reason: error.message, summary: null }
  }
  const raw = data as { ok?: boolean; reason?: string; summary?: RpcSummary } | null
  if (!raw || raw.ok === false) {
    return { ok: false, reason: raw?.reason || 'rejected', summary: null }
  }
  const summary = raw.summary ? parseSummary(input.propertyId, raw.summary) : null
  if (summary) cacheSummary(summary)
  return { ok: true, summary }
}

export async function fetchPresenceLog(propertyId: string): Promise<PresenceLogEvent[] | null> {
  if (!canUseCommunityRemote()) return null
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.rpc('get_presence_log', {
    p_property_id: propertyId,
  })
  if (error) {
    console.warn('get_presence_log failed', error.message)
    return null
  }
  const raw = data as { ok?: boolean; events?: PresenceLogEvent[] } | null
  if (!raw || raw.ok === false || !Array.isArray(raw.events)) return []

  return raw.events.map((event, index) => ({
    id: String(event.id ?? `pe-${index}`),
    confirmedAt: String(event.confirmedAt),
    distanceMeters: Number(event.distanceMeters ?? 0),
    accuracyMeters: Number(event.accuracyMeters ?? 0),
    isYou: Boolean(event.isYou),
    communityLabelIds: Array.isArray(event.communityLabelIds)
      ? event.communityLabelIds.map(String)
      : [],
  }))
}

export { canUseCommunityRemote }
