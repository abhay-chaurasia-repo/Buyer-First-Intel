/**
 * Server-backed Buyer Community: presence events + one structured observation
 * per signed-in buyer per property. Local storage is a cache.
 */

import { persistCommunityObservation } from '@/data/buyerCommunityStorage'
import {
  parseObservationAnswers,
  type ObservationAnswers,
  type ObservationFieldId,
} from '@/data/observationFields'
import { loadAuthSession } from '@/data/authSession'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { isSupabaseOwnerId } from '@/lib/searchQuotaApi'

export type ObservationTallies = Record<ObservationFieldId, Record<string, number>>

export type CommunitySummary = {
  propertyId: string
  canContribute: boolean
  myLatestPresence: string | null
  presenceCount: number
  observationCount: number
  myObservation: ObservationAnswers | null
  fields: ObservationTallies
}

export type PresenceLogEvent = {
  id: string
  confirmedAt: string
  distanceMeters: number
  accuracyMeters: number
  isYou: boolean
  observation: ObservationAnswers | null
}

type RpcSummary = {
  propertyId?: string
  canContribute?: boolean
  myLatestPresence?: string | null
  presenceCount?: number
  observationCount?: number
  myObservation?: ObservationAnswers | null
  fields?: Partial<Record<ObservationFieldId, Record<string, number>>>
}

function emptyTallies(): ObservationTallies {
  return { noise: {}, parking: {}, basement: {}, moisture: {} }
}

function canUseCommunityRemote() {
  const session = loadAuthSession()
  return isSupabaseConfigured() && isSupabaseOwnerId(session?.userId)
}

function parseTallies(raw: RpcSummary['fields']): ObservationTallies {
  const next = emptyTallies()
  for (const fieldId of Object.keys(next) as ObservationFieldId[]) {
    const row = raw?.[fieldId]
    if (!row || typeof row !== 'object') continue
    const counts: Record<string, number> = {}
    for (const [optionId, count] of Object.entries(row)) {
      counts[optionId] = Number(count ?? 0)
    }
    next[fieldId] = counts
  }
  return next
}

function parseSummary(propertyId: string, raw: RpcSummary | null | undefined): CommunitySummary {
  const myObservation = parseObservationAnswers(raw?.myObservation)
  return {
    propertyId: raw?.propertyId || propertyId,
    canContribute: Boolean(raw?.canContribute),
    myLatestPresence: raw?.myLatestPresence ?? null,
    presenceCount: Number(raw?.presenceCount ?? 0),
    observationCount: Number(raw?.observationCount ?? 0),
    myObservation,
    fields: parseTallies(raw?.fields),
  }
}

function cacheSummary(summary: CommunitySummary) {
  if (!summary.myObservation) return
  persistCommunityObservation(summary.propertyId, {
    answers: summary.myObservation,
    submittedAt: new Date().toISOString(),
  })
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

export async function upsertCommunityObservation(
  propertyId: string,
  answers: ObservationAnswers,
): Promise<{ ok: boolean; reason?: string; summary: CommunitySummary | null }> {
  if (!canUseCommunityRemote()) {
    return { ok: false, reason: 'local_only', summary: null }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'unavailable', summary: null }

  const { data, error } = await supabase.rpc('upsert_community_observation', {
    p_property_id: propertyId,
    p_noise: answers.noise,
    p_parking: answers.parking,
    p_basement: answers.basement,
    p_moisture: answers.moisture,
  })
  if (error) {
    console.warn('upsert_community_observation failed', error.message)
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
  const raw = data as { ok?: boolean; events?: Array<PresenceLogEvent & { observation?: unknown }> } | null
  if (!raw || raw.ok === false || !Array.isArray(raw.events)) return []

  return raw.events.map((event, index) => ({
    id: String(event.id ?? `pe-${index}`),
    confirmedAt: String(event.confirmedAt),
    distanceMeters: Number(event.distanceMeters ?? 0),
    accuracyMeters: Number(event.accuracyMeters ?? 0),
    isYou: Boolean(event.isYou),
    observation: parseObservationAnswers(event.observation),
  }))
}

export { canUseCommunityRemote }
