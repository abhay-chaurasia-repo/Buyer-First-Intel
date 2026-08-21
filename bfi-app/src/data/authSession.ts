/** Local auth session — step 1 foundation before a real auth SaaS. */

export const AUTH_SESSION_KEY = 'bfi.auth-session'
export const AUTH_LAST_METHOD_KEY = 'bfi.lastAuthMethod'
/** Stay signed in this long after OTP — then ask for a code again. */
export const AUTH_SESSION_TTL_MS = 24 * 60 * 60 * 1000

export type AuthMethodId = 'apple' | 'facebook' | 'mobile' | 'quick'

export type AuthSession = {
  userId: string
  /** Buyer-facing label — not a legal name until real identity lands */
  displayName: string
  method: AuthMethodId
  signedInAt: string
}

const METHOD_LABELS: Record<AuthMethodId, string> = {
  apple: 'Apple ID',
  facebook: 'Facebook',
  mobile: 'a mobile number',
  quick: 'Quick sign in',
}

export function authMethodLabel(method: AuthMethodId | string) {
  return METHOD_LABELS[method as AuthMethodId] ?? method
}

/**
 * Stable local owner ids per method so sign-out → same-method sign-in restores
 * diligence data. Real IdP subjects replace these later.
 */
function localUserId(method: AuthMethodId) {
  return `buyer_local_${method}`
}

function displayNameFor(method: AuthMethodId) {
  if (method === 'mobile') return 'Buyer'
  if (method === 'quick') return 'Buyer'
  if (method === 'apple') return 'Apple buyer'
  return 'Facebook buyer'
}

export function isAuthSessionFresh(session: AuthSession) {
  const started = Date.parse(session.signedInAt)
  if (!Number.isFinite(started)) return false
  return Date.now() - started < AUTH_SESSION_TTL_MS
}

export function peekStoredAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.userId || !parsed?.method) return null
    return parsed
  } catch {
    return null
  }
}

export function loadAuthSession(): AuthSession | null {
  const parsed = peekStoredAuthSession()
  if (!parsed) return null
  if (!isAuthSessionFresh(parsed)) {
    clearAuthSession()
    return null
  }
  return parsed
}

export function persistAuthSession(session: AuthSession) {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
    localStorage.setItem(AUTH_LAST_METHOD_KEY, session.method)
  } catch {
    // Ignore storage failures in demo shell
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY)
  } catch {
    // Ignore storage failures in demo shell
  }
}

export function loadLastAuthMethod(): AuthMethodId | null {
  try {
    const raw = localStorage.getItem(AUTH_LAST_METHOD_KEY)
    if (raw === 'apple' || raw === 'facebook' || raw === 'mobile' || raw === 'quick') {
      return raw
    }
    return null
  } catch {
    return null
  }
}

/**
 * Creates a local signed-in session for the chosen method.
 * Apple / Facebook / quick stay local until those IdPs are wired.
 * Sign-out clears session only — owned diligence stays under this userId.
 */
export function signInWithMethod(method: AuthMethodId): AuthSession {
  const existing = loadAuthSession()
  const session: AuthSession = {
    userId: localUserId(method),
    displayName: displayNameFor(method),
    method,
    signedInAt: existing?.method === method ? existing.signedInAt : new Date().toISOString(),
  }
  persistAuthSession(session)
  return session
}

/**
 * Maps a verified Supabase phone user into the app session.
 * userId is the Supabase auth subject — diligence data scopes to it.
 */
export function signInWithSupabasePhone(params: {
  userId: string
  phone?: string | null
  /** OTP success starts a new 24h window. Session restore keeps the original. */
  renewTtl?: boolean
}): AuthSession {
  const existing = peekStoredAuthSession()
  const keepWindow =
    !params.renewTtl &&
    existing?.userId === params.userId &&
    existing.method === 'mobile' &&
    isAuthSessionFresh(existing)
  const session: AuthSession = {
    userId: params.userId,
    displayName: 'Buyer',
    method: 'mobile',
    signedInAt: keepWindow ? existing.signedInAt : new Date().toISOString(),
  }
  persistAuthSession(session)
  return session
}

/** Clears session only. Does not wipe diligence or lastAuthMethod. */
export function signOut() {
  clearAuthSession()
}
