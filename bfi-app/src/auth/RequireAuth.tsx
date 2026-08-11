import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'

/** Hard gate — core product requires a signed-in account (no guest mode). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth()
  const location = useLocation()

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return children
}
