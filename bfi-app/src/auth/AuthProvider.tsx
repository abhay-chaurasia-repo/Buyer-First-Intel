import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { GUEST_OWNER_ID } from '@/data/authPolicy'
import {
  loadAuthSession,
  signInWithMethod,
  signInWithSupabasePhone,
  signOut as clearSession,
  type AuthMethodId,
  type AuthSession,
} from '@/data/authSession'
import { claimGuestDataForUser } from '@/data/ownerScope'
import {
  getSupabasePhoneUser,
  isSupabaseConfigured,
  sendPhoneOtp,
  signOutSupabase,
  verifyPhoneOtp,
} from '@/lib/phoneAuth'
import { ensureRemoteProfile } from '@/lib/searchQuotaApi'
import { getSupabase } from '@/lib/supabaseClient'

type AuthContextValue = {
  session: AuthSession | null
  isSignedIn: boolean
  /** Active diligence owner — always a signed-in userId in core product flows */
  ownerId: string
  supabaseReady: boolean
  signIn: (method: AuthMethodId) => AuthSession
  /** Send SMS OTP via Supabase + Twilio */
  requestPhoneOtp: (phone: string) => Promise<{ ok: true; phone: string } | { ok: false; error: string }>
  /** Verify SMS OTP and establish app session */
  confirmPhoneOtp: (
    phone: string,
    token: string,
  ) => Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }>
  signOut: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession())

  const applySupabaseUser = useCallback((userId: string, phone?: string | null) => {
    const next = signInWithSupabasePhone({ userId, phone })
    claimGuestDataForUser(next.userId)
    setSession(next)
    void ensureRemoteProfile()
    return next
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false

    void (async () => {
      const user = await getSupabasePhoneUser()
      if (cancelled || !user) return
      applySupabaseUser(user.userId, user.phone)
    })()

    const supabase = getSupabase()
    if (!supabase) return

    const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!supabaseSession?.user) return
      applySupabaseUser(supabaseSession.user.id, supabaseSession.user.phone)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [applySupabaseUser])

  const signIn = useCallback((method: AuthMethodId) => {
    const next = signInWithMethod(method)
    claimGuestDataForUser(next.userId)
    setSession(next)
    return next
  }, [])

  const requestPhoneOtp = useCallback(async (phone: string) => {
    const result = await sendPhoneOtp(phone)
    if (!result.ok) return result
    return { ok: true as const, phone: result.phone }
  }, [])

  const confirmPhoneOtp = useCallback(
    async (phone: string, token: string) => {
      const result = await verifyPhoneOtp(phone, token)
      if (!result.ok) return result
      const next = applySupabaseUser(result.userId, result.phone)
      return { ok: true as const, session: next }
    },
    [applySupabaseUser],
  )

  const signOut = useCallback(async () => {
    await signOutSupabase()
    clearSession()
    setSession(null)
  }, [])

  const refresh = useCallback(() => {
    setSession(loadAuthSession())
  }, [])

  const value = useMemo(
    () => ({
      session,
      isSignedIn: Boolean(session),
      ownerId: session?.userId ?? GUEST_OWNER_ID,
      supabaseReady: isSupabaseConfigured(),
      signIn,
      requestPhoneOtp,
      confirmPhoneOtp,
      signOut,
      refresh,
    }),
    [session, signIn, requestPhoneOtp, confirmPhoneOtp, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return value
}
