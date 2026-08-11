/**
 * Auth Step 2 — session contract.
 * Locked decisions before real IdP / OTP wiring.
 */

export type AuthAccessLevel = 'public' | 'account-soft'

/**
 * public — guests may use fully (browse / education / auth).
 * account-soft — usable as guest with device-local `guest` data, but we prompt
 * to sign in so diligence lives under a stable account owner id.
 */
export const AUTH_ROUTE_ACCESS: Record<string, AuthAccessLevel> = {
  '/welcome': 'public',
  '/login': 'public',
  '/signup': 'public',
  '/': 'public',
  '/rules': 'public',
  '/guidance': 'public',
  '/property': 'public',
  '/watchlist': 'account-soft',
  '/journey': 'account-soft',
}

export function accessForPath(pathname: string): AuthAccessLevel {
  if (pathname.startsWith('/property')) return 'public'
  if (pathname.startsWith('/guidance')) return 'public'
  return AUTH_ROUTE_ACCESS[pathname] ?? 'public'
}

/**
 * Sign-out clears the session cookie/key only.
 * Diligence data stays under the method’s stable local userId so the same
 * method can restore it on sign-in. lastAuthMethod is kept for login hints.
 */
export const SIGN_OUT_POLICY = {
  clearsSession: true,
  keepsLastAuthMethod: true,
  clearsOwnedDiligenceData: false,
} as const

/** Device-local guest bucket when no session is active. */
export const GUEST_OWNER_ID = 'guest'
