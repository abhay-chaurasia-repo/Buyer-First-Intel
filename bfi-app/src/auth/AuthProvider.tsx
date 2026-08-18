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
  isAuthSessionFresh,
  loadAuthSession,
  peekStoredAuthSession,
  signInWithMethod,
  signInWithSupabasePhone,
  signOut as clearSession,
  type AuthMethodId,
  type AuthSession,
} from '@/data/authSession'
import { claimGuestDataForUser } from '@/data/ownerScope'
import {
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
  /** False until local + Supabase session restore has finished once */
  authReady: boolean
  ownerId: string
  supabaseReady: boolean
  signIn: (method: AuthMethodId) => AuthSession
  requestPhoneOtp: (phone: string) => Promise<{ ok: true; phone: string } | { ok: false; error: string }>
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
  const [authReady, setAuthReady] = useState(() => !isSupabaseConfigured())

  const applySupabaseUser = useCallback(
    (userId: string, phone?: string | null, renewTtl = false) => {
      const next = signInWithSupabasePhone({ userId, phone, renewTtl })
      claimGuestDataForUser(next.userId)
      setSession(next)
      void ensureRemoteProfile()
      void import('@/lib/diligenceSync')
        .then((mod) => mod.pullDiligenceFromCloud())
        .catch(() => {
          // ignore
        })
      return next
    },
    [],
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true)
      return
    }

    let cancelled = false
    const supabase = getSupabase()
    if (!supabase) {
      setAuthReady(true)
      return
    }

    void (async () => {
      try {
        const stored = peekStoredAuthSession()
        if (stored && !isAuthSessionFresh(stored)) {
          await signOutSupabase()
          clearSession()
          if (!cancelled) setSession(null)
          return
        }

        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session?.user && stored && isAuthSessionFresh(stored)) {
          applySupabaseUser(data.session.user.id, data.session.user.phone, false)
        } else if (!data.session?.user) {
          const local = loadAuthSession()
          if (local?.method === 'mobile' && !local.userId.startsWith('buyer_local_')) {
            setSession(local)
          }
        } else if (data.session?.user && !stored) {
          // Supabase still has a JWT but our 24h window ended — require OTP again.
          await signOutSupabase()
          clearSession()
          setSession(null)
        }
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()

    const { data } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      if (supabaseSession?.user) {
        const stored = peekStoredAuthSession()
        if (!stored || !isAuthSessionFresh(stored)) {
          if (event !== 'SIGNED_IN' && event !== 'USER_UPDATED') {
            void signOutSupabase().then(() => {
              clearSession()
              setSession(null)
            })
          }
          return
        }
        applySupabaseUser(supabaseSession.user.id, supabaseSession.user.phone, false)
        return
      }
      if (event === 'SIGNED_OUT') {
        const local = loadAuthSession()
        if (local?.method === 'mobile' && !local.userId.startsWith('buyer_local_')) {
          clearSession()
          setSession(null)
        }
      }
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
      const next = applySupabaseUser(result.userId, result.phone, true)
      return { ok: true as const, session: next }
    },
    [applySupabaseUser],
  )

  const signOut = useCallback(async () => {
    await signOutSupabase()
    clearSession()
    setSession(null)
  }, [])

  useEffect(() => {
    const tick = () => {
      if (!session) return
      if (isAuthSessionFresh(session)) return
      void signOut()
    }
    const id = window.setInterval(tick, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session, signOut])

  const refresh = useCallback(() => {
    setSession(loadAuthSession())
  }, [])

  const value = useMemo(
    () => ({
      session,
      isSignedIn: Boolean(session),
      authReady,
      ownerId: session?.userId ?? GUEST_OWNER_ID,
      supabaseReady: isSupabaseConfigured(),
      signIn,
      requestPhoneOtp,
      confirmPhoneOtp,
      signOut,
      refresh,
    }),
    [session, authReady, signIn, requestPhoneOtp, confirmPhoneOtp, signOut, refresh],
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
