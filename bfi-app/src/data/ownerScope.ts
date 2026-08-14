/**
 * Owner-scoped localStorage for diligence data.
 * Keys: `${baseKey}.${ownerId}` with one-time legacy → owner migration.
 */

import { GUEST_OWNER_ID } from './authPolicy'
import { loadAuthSession } from './authSession'

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

function ownerHasDiligenceData(ownerId: string) {
  return OWNED_STORAGE_BASES.some((base) => !isEmptyPayload(readRaw(scopedStorageKey(base, ownerId))))
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

  // Move GPS verification flags: bfi.gpsVerified.{owner}.{propertyId}
  try {
    const prefix = `bfi.gpsVerified.${fromOwner}.`
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) {
      const propertyId = key.slice(prefix.length)
      const dest = `bfi.gpsVerified.${toOwner}.${propertyId}`
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

export type GpsVerifyRecord = {
  verified: true
  verifiedAt: string
  distanceMeters?: number
  accuracyMeters?: number
}

/** 48h visit-scoped presence — matches GPS_VERIFY_TTL_MS in gpsVerify.ts */
const GPS_VERIFY_TTL_MS = 48 * 60 * 60 * 1000

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

function isGpsRecordFresh(record: GpsVerifyRecord): boolean {
  const at = Date.parse(record.verifiedAt)
  if (!Number.isFinite(at)) return false
  return Date.now() - at <= GPS_VERIFY_TTL_MS
}

export function loadGpsVerifyRecord(
  propertyId: string,
  ownerId = currentOwnerId(),
): GpsVerifyRecord | null {
  try {
    const scoped = gpsVerifiedKey(propertyId, ownerId)
    let raw = readRaw(scoped)
    if (raw == null) {
      const legacy = readRaw(`bfi.gpsVerified.${propertyId}`)
      if (legacy == null) return null
      writeRaw(scoped, legacy)
      removeRaw(`bfi.gpsVerified.${propertyId}`)
      raw = legacy
    }
    const record = parseGpsRecord(raw)
    if (!record) return null
    if (!isGpsRecordFresh(record)) {
      removeRaw(scoped)
      return null
    }
    return record
  } catch {
    return null
  }
}

export function loadGpsVerified(propertyId: string, ownerId = currentOwnerId()): boolean {
  return loadGpsVerifyRecord(propertyId, ownerId) != null
}

export function persistGpsVerified(
  propertyId: string,
  verified: boolean,
  ownerId = currentOwnerId(),
  meta?: { distanceMeters?: number; accuracyMeters?: number },
) {
  const key = gpsVerifiedKey(propertyId, ownerId)
  if (!verified) {
    writeRaw(key, '0')
    return
  }
  const record: GpsVerifyRecord = {
    verified: true,
    verifiedAt: new Date().toISOString(),
    distanceMeters: meta?.distanceMeters,
    accuracyMeters: meta?.accuracyMeters,
  }
  writeRaw(key, JSON.stringify(record))
}
