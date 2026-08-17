/**
 * On-site GPS Verify: compare device position to the property pin.
 * Unlocks Buyer Community on-site votes when within radius.
 * Uses Capacitor Geolocation on iOS/Android, browser geolocation on web.
 */

import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export const GPS_VERIFY_RADIUS_METERS = 100
/** Reject fixes that are too imprecise to trust a 100m gate. */
export const GPS_VERIFY_MAX_ACCURACY_METERS = 80
/** Soft “you’re near — tap Verify” zone (wider than the pass radius). */
export const GPS_NEARBY_NUDGE_METERS = 300
/** Verification expires so presence stays visit-scoped. */
export const GPS_VERIFY_TTL_DAYS = 14
export const GPS_VERIFY_TTL_MS = GPS_VERIFY_TTL_DAYS * 24 * 60 * 60 * 1000
export const GPS_VERIFY_TTL_LABEL = '2 weeks'

const EARTH_RADIUS_M = 6371000
/** Farther than a walk — usually Simulator GPS or a computer, not standing at the house. */
const FAR_FROM_HOME_METERS = 5_000

function formatDistanceFromPin(meters: number) {
  if (meters < 1000) return `about ${Math.round(meters)}m`
  const miles = meters / 1609.344
  if (miles >= 10) return `about ${Math.round(miles).toLocaleString()} miles`
  return `about ${miles.toFixed(1)} miles`
}

function tooFarMessage(distance: number) {
  if (distance >= FAR_FROM_HOME_METERS && Capacitor.isNativePlatform()) {
    return `This GPS reading is ${formatDistanceFromPin(distance)} from the home — not at the house. The iOS Simulator does not use your laptop’s location. In Simulator: Features → Location → Custom Location, enter this home’s coordinates. Or tap Verify on an iPhone while you are at the property.`
  }
  if (distance >= FAR_FROM_HOME_METERS) {
    return `This GPS reading is ${formatDistanceFromPin(distance)} from the home. A computer’s location is not the house pin. Open the app on your phone at the property, then tap Verify.`
  }
  return `You are about ${Math.round(distance)}m from the home pin. Move within ${GPS_VERIFY_RADIUS_METERS}m and try again.`
}

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

type PositionFix = {
  latitude: number
  longitude: number
  accuracy: number
}

async function readPosition(): Promise<PositionFix> {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions()
    const location = permission.location || permission.coarseLocation
    if (location === 'denied') {
      const err = new Error('Location permission denied') as Error & { code: number }
      err.code = 1
      throw err
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    })
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? Number.POSITIVE_INFINITY,
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    const err = new Error('Geolocation unsupported') as Error & { code: number }
    err.code = 2
    throw err
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    })
  })
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : Number.POSITIVE_INFINITY,
  }
}

/** True when native location is already granted (does not show the system sheet). */
export async function locationPermissionGranted(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
  }
  try {
    const status = await Geolocation.checkPermissions()
    const location = status.location || status.coarseLocation
    return location === 'granted'
  } catch {
    return false
  }
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

  if (
    !Capacitor.isNativePlatform() &&
    (typeof navigator === 'undefined' || !navigator.geolocation)
  ) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'This browser cannot share location. Try Safari or Chrome on your phone.',
    }
  }

  try {
    const { latitude, longitude, accuracy } = await readPosition()
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
        message: tooFarMessage(distance),
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
        ? Number((error as { code?: number }).code)
        : undefined

    if (code === 1) {
      return {
        ok: false,
        reason: 'denied',
        message: 'Location permission is off. Allow location for this app, then tap Verify again.',
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

export type NearbyWatchUpdate = {
  nearby: boolean
  distanceMeters: number | null
  accuracyMeters: number | null
  error?: string
}

/**
 * Watch device position while the property page is open.
 * Used for the soft Verify nudge (not the pass/fail gate).
 */
export function watchNearbyProperty(
  property: { lat?: number; lng?: number },
  onUpdate: (update: NearbyWatchUpdate) => void,
  options?: { nudgeMeters?: number },
): () => void {
  const pinLat = property.lat
  const pinLng = property.lng
  const nudgeMeters = options?.nudgeMeters ?? GPS_NEARBY_NUDGE_METERS

  if (
    pinLat == null ||
    pinLng == null ||
    !Number.isFinite(pinLat) ||
    !Number.isFinite(pinLng)
  ) {
    onUpdate({
      nearby: false,
      distanceMeters: null,
      accuracyMeters: null,
      error: 'no_pin',
    })
    return () => undefined
  }

  let cancelled = false
  let browserWatchId: number | null = null
  let nativeWatchId: string | null = null

  const emitFix = (latitude: number, longitude: number, accuracy: number | null) => {
    if (cancelled) return
    const distance = distanceMeters(latitude, longitude, pinLat, pinLng)
    onUpdate({
      nearby: distance <= nudgeMeters,
      distanceMeters: Math.round(distance),
      accuracyMeters: accuracy != null && Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    })
  }

  if (Capacitor.isNativePlatform()) {
    void (async () => {
      try {
        const status = await Geolocation.checkPermissions()
        const granted =
          status.location === 'granted' || status.coarseLocation === 'granted'
        if (!granted) {
          if (!cancelled) {
            onUpdate({
              nearby: false,
              distanceMeters: null,
              accuracyMeters: null,
              error: 'prompt',
            })
          }
          return
        }
        if (cancelled) return
        nativeWatchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 25_000,
            maximumAge: 15_000,
          },
          (position, err) => {
            if (cancelled) return
            if (err || !position) {
              onUpdate({
                nearby: false,
                distanceMeters: null,
                accuracyMeters: null,
                error: 'unavailable',
              })
              return
            }
            emitFix(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy ?? null,
            )
          },
        )
      } catch {
        if (!cancelled) {
          onUpdate({
            nearby: false,
            distanceMeters: null,
            accuracyMeters: null,
            error: 'denied',
          })
        }
      }
    })()

    return () => {
      cancelled = true
      if (nativeWatchId) {
        void Geolocation.clearWatch({ id: nativeWatchId })
      }
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onUpdate({
      nearby: false,
      distanceMeters: null,
      accuracyMeters: null,
      error: 'unsupported',
    })
    return () => undefined
  }

  browserWatchId = navigator.geolocation.watchPosition(
    (position) => {
      emitFix(
        position.coords.latitude,
        position.coords.longitude,
        Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      )
    },
    (error) => {
      onUpdate({
        nearby: false,
        distanceMeters: null,
        accuracyMeters: null,
        error: error.code === 1 ? 'denied' : 'unavailable',
      })
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 25_000,
    },
  )

  return () => {
    cancelled = true
    if (browserWatchId != null) {
      navigator.geolocation.clearWatch(browserWatchId)
    }
  }
}
