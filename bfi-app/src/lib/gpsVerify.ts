/**
 * On-site GPS Verify: compare device position to the property pin.
 * Unlocks Buyer Community on-site votes when within radius.
 */

export const GPS_VERIFY_RADIUS_METERS = 100
/** Reject fixes that are too imprecise to trust a 100m gate. */
export const GPS_VERIFY_MAX_ACCURACY_METERS = 80
/** Verification expires so presence stays visit-scoped. */
export const GPS_VERIFY_TTL_MS = 48 * 60 * 60 * 1000

const EARTH_RADIUS_M = 6371000

export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

export type GpsVerifyFailureReason =
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'no_pin'
  | 'inaccurate'
  | 'too_far'

export type GpsVerifyAttempt =
  | {
      ok: true
      distanceMeters: number
      accuracyMeters: number
      latitude: number
      longitude: number
    }
  | {
      ok: false
      reason: GpsVerifyFailureReason
      message: string
      distanceMeters?: number
      accuracyMeters?: number
    }

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    })
  })
}

export async function attemptGpsVerify(property: {
  lat?: number
  lng?: number
}): Promise<GpsVerifyAttempt> {
  const pinLat = property.lat
  const pinLng = property.lng
  if (
    pinLat == null ||
    pinLng == null ||
    !Number.isFinite(pinLat) ||
    !Number.isFinite(pinLng)
  ) {
    return {
      ok: false,
      reason: 'no_pin',
      message:
        'This address has no map pin yet. Resolve the address again, then try GPS Verify on site.',
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'This browser cannot share location. Try Safari or Chrome on your phone.',
    }
  }

  try {
    const position = await readPosition()
    const { latitude, longitude, accuracy } = position.coords
    const accuracyMeters = Number.isFinite(accuracy) ? accuracy : Number.POSITIVE_INFINITY
    const distance = distanceMeters(latitude, longitude, pinLat, pinLng)

    if (accuracyMeters > GPS_VERIFY_MAX_ACCURACY_METERS) {
      return {
        ok: false,
        reason: 'inaccurate',
        message: `GPS accuracy is ±${Math.round(accuracyMeters)}m — move outdoors and try again (need ≤${GPS_VERIFY_MAX_ACCURACY_METERS}m).`,
        distanceMeters: Math.round(distance),
        accuracyMeters: Math.round(accuracyMeters),
      }
    }

    if (distance > GPS_VERIFY_RADIUS_METERS) {
      return {
        ok: false,
        reason: 'too_far',
        message: `You are about ${Math.round(distance)}m from the home pin. Move within ${GPS_VERIFY_RADIUS_METERS}m and try again.`,
        distanceMeters: Math.round(distance),
        accuracyMeters: Math.round(accuracyMeters),
      }
    }

    return {
      ok: true,
      distanceMeters: Math.round(distance),
      accuracyMeters: Math.round(accuracyMeters),
      latitude,
      longitude,
    }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? Number((error as GeolocationPositionError).code)
        : undefined

    if (code === 1) {
      return {
        ok: false,
        reason: 'denied',
        message: 'Location permission is off. Allow location for this site, then tap Verify again.',
      }
    }
    if (code === 3) {
      return {
        ok: false,
        reason: 'timeout',
        message: 'GPS timed out. Step outside for a clearer signal, then try again.',
      }
    }
    return {
      ok: false,
      reason: 'unavailable',
      message: 'Could not read your location. Check Location Services and try again on site.',
    }
  }
}
