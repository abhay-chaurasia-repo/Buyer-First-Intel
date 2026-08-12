import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'

/** Hard gate — waits for auth restore so Stripe return doesn’t false-redirect to login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isSignedIn, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-night-muted">
        Restoring your session…
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return children
}
