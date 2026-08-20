/**
 * Owner-scoped localStorage for diligence data.
 * Keys: `${baseKey}.${ownerId}` with one-time legacy → owner migration.
 */

import { GUEST_OWNER_ID } from './authPolicy'
import { loadAuthSession } from './authSession'
import { GPS_VERIFY_TTL_MS } from '@/lib/gpsVerify'

export { GUEST_OWNER_ID }

/** Diligence bases owned by a buyer (or guest). */
export const OWNED_STORAGE_BASES = [
  'bfi.watchlist',
  'bfi.property-notes',
  'bfi.journey-checklist',
  'bfi.buyer-community-votes.v2',
  'bfi.buyer-community-votes',
  'bfi.buyer-community-verified',
  'bfi.visit-reminders-fired',
  'bfi.search-quota',
  'bfi.gps-nearby-nudge',
] as const

const LEGACY_ALIASES: Record<string, string[]> = {
  'bfi.journey-checklist': ['bfi.audit-checklist'],
}

export function currentOwnerId(): string {
  return loadAuthSession()?.userId ?? GUEST_OWNER_ID
}

export function scopedStorageKey(baseKey: string, ownerId = currentOwnerId()) {
  return `${baseKey}.${ownerId}`
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures in demo shell
  }
}

function removeRaw(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures in demo shell
  }
}

function isEmptyPayload(raw: string | null) {
  if (raw == null || raw === '') return true
  return raw === '{}' || raw === '[]'
}

/**
 * Read a scoped item. If missing, claim unscoped/legacy keys into this owner once.
 */
export function readScopedItem(baseKey: string, ownerId = currentOwnerId()): string | null {
  const scoped = scopedStorageKey(baseKey, ownerId)
  const existing = readRaw(scoped)
  if (existing != null) return existing

  const candidates = [baseKey, ...(LEGACY_ALIASES[baseKey] ?? [])]
  for (const candidate of candidates) {
    const legacy = readRaw(candidate)
    if (legacy == null) continue
    writeRaw(scoped, legacy)
    removeRaw(candidate)
    return legacy
  }
  return null
}

export function writeScopedItem(baseKey: string, value: string, ownerId = currentOwnerId()) {
  writeRaw(scopedStorageKey(baseKey, ownerId), value)
}

function ownerHasPerPropertyPresence(ownerId: string) {
  try {
    const prefixes = [
      `bfi.gpsVerified.${ownerId}.`,
      `bfi.presenceEvents.${ownerId}.`,
    ]
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) return true
    }
  } catch {
    // Ignore storage failures
  }
  return false
}

function ownerHasDiligenceData(ownerId: string) {
  if (OWNED_STORAGE_BASES.some((base) => !isEmptyPayload(readRaw(scopedStorageKey(base, ownerId))))) {
    return true
  }
  return ownerHasPerPropertyPresence(ownerId)
}

function movePrefixedKeys(fromPrefix: string, toPrefix: string) {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(fromPrefix)) keys.push(key)
    }
    for (const key of keys) {
      const dest = `${toPrefix}${key.slice(fromPrefix.length)}`
      if (readRaw(dest) != null) continue
      const value = readRaw(key)
      if (value == null) continue
      writeRaw(dest, value)
      removeRaw(key)
    }
  } catch {
    // Ignore storage failures
  }
}

function moveOwnerBucket(fromOwner: string, toOwner: string) {
  for (const base of OWNED_STORAGE_BASES) {
    const fromKey = scopedStorageKey(base, fromOwner)
    const toKey = scopedStorageKey(base, toOwner)
    const raw = readRaw(fromKey)
    if (isEmptyPayload(raw)) continue
    if (!isEmptyPayload(readRaw(toKey))) continue
    writeRaw(toKey, raw!)
    removeRaw(fromKey)
  }

  movePrefixedKeys(`bfi.gpsVerified.${fromOwner}.`, `bfi.gpsVerified.${toOwner}.`)
  movePrefixedKeys(`bfi.presenceEvents.${fromOwner}.`, `bfi.presenceEvents.${toOwner}.`)
}

/**
 * On first sign-in into an empty account, fold device guest (and any remaining
 * legacy unscoped keys) into that account so diligence isn’t lost.
 */
export function claimGuestDataForUser(userId: string): { claimed: boolean } {
  for (const base of OWNED_STORAGE_BASES) {
    readScopedItem(base, GUEST_OWNER_ID)
  }

  // Legacy GPS flags → guest
  try {
    const legacyGps: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('bfi.gpsVerified.')) continue
      const rest = key.slice('bfi.gpsVerified.'.length)
      if (!rest.includes('.')) legacyGps.push(key)
    }
    for (const key of legacyGps) {
      const propertyId = key.slice('bfi.gpsVerified.'.length)
      const dest = `bfi.gpsVerified.${GUEST_OWNER_ID}.${propertyId}`
      if (readRaw(dest) == null) {
        const value = readRaw(key)
        if (value != null) writeRaw(dest, value)
      }
      removeRaw(key)
    }
  } catch {
    // Ignore
  }

  if (ownerHasDiligenceData(userId)) return { claimed: false }
  if (!ownerHasDiligenceData(GUEST_OWNER_ID)) return { claimed: false }
  moveOwnerBucket(GUEST_OWNER_ID, userId)
  return { claimed: true }
}

export function gpsVerifiedKey(propertyId: string, ownerId = currentOwnerId()) {
  return `bfi.gpsVerified.${ownerId}.${propertyId}`
}

export function presenceEventsKey(propertyId: string, ownerId = currentOwnerId()) {
  return `bfi.presenceEvents.${ownerId}.${propertyId}`
}

export type GpsVerifyRecord = {
  verified: true
  verifiedAt: string
  distanceMeters?: number
  accuracyMeters?: number
}

/** Immutable Presence Confirmed log — one dated event per successful Confirm. */
export type PresenceEvent = {
  id: string
  confirmedAt: string
  distanceMeters?: number
  accuracyMeters?: number
}

function parseGpsRecord(raw: string | null): GpsVerifyRecord | null {
  if (raw == null || raw === '0' || raw === '' || raw === '1') {
    // Legacy boolean '1' was a manual toggle — require a real GPS pass.
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GpsVerifyRecord>
    if (parsed && parsed.verified === true && typeof parsed.verifiedAt === 'string') {
      return {
        verified: true,
        verifiedAt: parsed.verifiedAt,
        distanceMeters:
          typeof parsed.distanceMeters === 'number' ? parsed.distanceMeters : undefined,
        accuracyMeters:
          typeof parsed.accuracyMeters === 'number' ? parsed.accuracyMeters : undefined,
      }
    }
  } catch {
    // ignore
  }
  return null
}

function parsePresenceEvents(raw: string | null): PresenceEvent[] {
  if (raw == null || raw === '' || raw === '0' || raw === '[]') return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is PresenceEvent => {
      if (!item || typeof item !== 'object') return false
      const event = item as Partial<PresenceEvent>
      return typeof event.id === 'string' && typeof event.confirmedAt === 'string'
    })
  } catch {
    return []
  }
}

function isContributionFresh(iso: string) {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return false
  return Date.now() - at <= GPS_VERIFY_TTL_MS
}

function readLegacyGpsRecord(propertyId: string, ownerId: string): GpsVerifyRecord | null {
  const scoped = gpsVerifiedKey(propertyId, ownerId)
  let raw = readRaw(scoped)
  if (raw == null) {
    const legacy = readRaw(`bfi.gpsVerified.${propertyId}`)
    if (legacy == null) return null
    writeRaw(scoped, legacy)
    removeRaw(`bfi.gpsVerified.${propertyId}`)
    raw = legacy
  }
  return parseGpsRecord(raw)
}

function sortPresenceEvents(events: PresenceEvent[]) {
  return [...events].sort(
    (a, b) => Date.parse(a.confirmedAt) - Date.parse(b.confirmedAt) || a.id.localeCompare(b.id),
  )
}

/**
 * Permanent presence log. Never deleted when the 2-week labeling window ends.
 */
export function loadPresenceEvents(
  propertyId: string,
  ownerId = currentOwnerId(),
): PresenceEvent[] {
  try {
    const key = presenceEventsKey(propertyId, ownerId)
    let events = parsePresenceEvents(readRaw(key))
    const legacy = readLegacyGpsRecord(propertyId, ownerId)
    if (legacy && !events.some((event) => event.confirmedAt === legacy.verifiedAt)) {
      events = sortPresenceEvents([
        ...events,
        {
          id: `legacy-${legacy.verifiedAt}`,
          confirmedAt: legacy.verifiedAt,
          distanceMeters: legacy.distanceMeters,
          accuracyMeters: legacy.accuracyMeters,
        },
      ])
      writeRaw(key, JSON.stringify(events))
    }
    return sortPresenceEvents(events)
  } catch {
    return []
  }
}

export function latestPresenceEvent(
  propertyId: string,
  ownerId = currentOwnerId(),
): PresenceEvent | null {
  const events = loadPresenceEvents(propertyId, ownerId)
  return events.length > 0 ? events[events.length - 1]! : null
}

/** True while on-site Plus/Watch votes are allowed (2 weeks from latest Confirm). */
export function canContributeOnSite(
  propertyId: string,
  ownerId = currentOwnerId(),
): boolean {
  const latest = latestPresenceEvent(propertyId, ownerId)
  return Boolean(latest && isContributionFresh(latest.confirmedAt))
}

export function contributionDeadlineMs(
  propertyId: string,
  ownerId = currentOwnerId(),
): number | null {
  const latest = latestPresenceEvent(propertyId, ownerId)
  if (!latest) return null
  const at = Date.parse(latest.confirmedAt)
  if (!Number.isFinite(at)) return null
  return at + GPS_VERIFY_TTL_MS
}

export function formatPresenceDay(iso: string) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export function appendPresenceEvent(
  propertyId: string,
  meta?: { distanceMeters?: number; accuracyMeters?: number },
  ownerId = currentOwnerId(),
): PresenceEvent {
  const events = loadPresenceEvents(propertyId, ownerId)
  const event: PresenceEvent = {
    id: `pe-${Date.now()}`,
    confirmedAt: new Date().toISOString(),
    distanceMeters: meta?.distanceMeters,
    accuracyMeters: meta?.accuracyMeters,
  }
  const next = sortPresenceEvents([...events, event])
  writeRaw(presenceEventsKey(propertyId, ownerId), JSON.stringify(next))
  writeRaw(
    gpsVerifiedKey(propertyId, ownerId),
    JSON.stringify({
      verified: true,
      verifiedAt: event.confirmedAt,
      distanceMeters: event.distanceMeters,
      accuracyMeters: event.accuracyMeters,
    } satisfies GpsVerifyRecord),
  )
  return event
}

/** Latest event only while the contribution window is still open. History is never deleted. */
export function loadGpsVerifyRecord(
  propertyId: string,
  ownerId = currentOwnerId(),
): GpsVerifyRecord | null {
  const latest = latestPresenceEvent(propertyId, ownerId)
  if (!latest || !isContributionFresh(latest.confirmedAt)) return null
  return {
    verified: true,
    verifiedAt: latest.confirmedAt,
    distanceMeters: latest.distanceMeters,
    accuracyMeters: latest.accuracyMeters,
  }
}

/** Contribution window — not whether a presence event exists. */
export function loadGpsVerified(propertyId: string, ownerId = currentOwnerId()): boolean {
  return canContributeOnSite(propertyId, ownerId)
}

export function persistGpsVerified(
  propertyId: string,
  verified: boolean,
  ownerId = currentOwnerId(),
  meta?: { distanceMeters?: number; accuracyMeters?: number },
) {
  if (!verified) {
    // Do not delete presence history or close the log. Window still follows latest event age.
    return
  }
  appendPresenceEvent(propertyId, meta, ownerId)
}
