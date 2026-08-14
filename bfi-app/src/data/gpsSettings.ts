/**
 * Buyer GPS preferences (owner-scoped).
 * Nearby nudge: soft push to tap Verify when approaching the property pin.
 */

import { currentOwnerId, readScopedItem, writeScopedItem } from '@/data/ownerScope'

export const GPS_NEARBY_NUDGE_SETTING_KEY = 'bfi.gps-nearby-nudge'

/** Default ON — buyers feel a gentle push when on site. */
const DEFAULT_NEARBY_NUDGE = true

export function loadNearbyNudgeEnabled(ownerId = currentOwnerId()): boolean {
  const raw = readScopedItem(GPS_NEARBY_NUDGE_SETTING_KEY, ownerId)
  if (raw == null) return DEFAULT_NEARBY_NUDGE
  return raw === '1' || raw === 'true'
}

export function persistNearbyNudgeEnabled(
  enabled: boolean,
  ownerId = currentOwnerId(),
) {
  writeScopedItem(GPS_NEARBY_NUDGE_SETTING_KEY, enabled ? '1' : '0', ownerId)
}
