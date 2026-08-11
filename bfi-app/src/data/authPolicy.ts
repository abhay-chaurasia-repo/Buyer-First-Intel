/**
 * Auth access + monetization contract.
 * No guest product path — core diligence requires a signed-in account.
 */

export type AuthAccessLevel = 'public' | 'account-required'

/**
 * public — welcome / auth / education only.
 * account-required — must be signed in (search, property, diligence, journey).
 */
export const AUTH_ROUTE_ACCESS: Record<string, AuthAccessLevel> = {
  '/welcome': 'public',
  '/login': 'public',
  '/signup': 'public',
  '/rules': 'public',
  '/guidance': 'public',
  '/': 'account-required',
  '/property': 'account-required',
  '/watchlist': 'account-required',
  '/journey': 'account-required',
}

export function accessForPath(pathname: string): AuthAccessLevel {
  if (pathname.startsWith('/property')) return 'account-required'
  if (pathname.startsWith('/guidance')) return 'public'
  return AUTH_ROUTE_ACCESS[pathname] ?? 'account-required'
}

/**
 * Sign-out clears the session only.
 * Diligence + quota stay under the method’s stable local userId.
 */
export const SIGN_OUT_POLICY = {
  clearsSession: true,
  keepsLastAuthMethod: true,
  clearsOwnedDiligenceData: false,
} as const

/** Legacy guest bucket — migrated into account on first sign-in; not a product mode. */
export const GUEST_OWNER_ID = 'guest'

/** Search plan — 10 free lookups / month, then $4.99 unlimited for that month. */
export const SEARCH_PLAN = {
  freeSearchesPerMonth: 10,
  unlimitedPriceUsd: 4.99,
  currencyLabel: '$4.99',
} as const
