import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadAuthSession,
  signInWithMethod,
  signOut as clearSession,
  type AuthMethodId,
  type AuthSession,
} from '@/data/authSession'

type AuthContextValue = {
  session: AuthSession | null
  isSignedIn: boolean
  signIn: (method: AuthMethodId) => AuthSession
  signOut: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession())

  const signIn = useCallback((method: AuthMethodId) => {
    const next = signInWithMethod(method)
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
