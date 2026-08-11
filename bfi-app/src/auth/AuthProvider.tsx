import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { GUEST_OWNER_ID } from '@/data/authPolicy'
import {
  loadAuthSession,
  signInWithMethod,
  signOut as clearSession,
  type AuthMethodId,
  type AuthSession,
} from '@/data/authSession'
import { claimGuestDataForUser } from '@/data/ownerScope'

type AuthContextValue = {
  session: AuthSession | null
  isSignedIn: boolean
  /** Active diligence owner — signed-in userId or guest */
  ownerId: string
  signIn: (method: AuthMethodId) => AuthSession
  signOut: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession())

  const signIn = useCallback((method: AuthMethodId) => {
    const next = signInWithMethod(method)
    claimGuestDataForUser(next.userId)
    setSession(next)
    return next
  }, [])

  const signOut = useCallback(() => {
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
      signIn,
      signOut,
      refresh,
    }),
    [session, signIn, signOut, refresh],
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
