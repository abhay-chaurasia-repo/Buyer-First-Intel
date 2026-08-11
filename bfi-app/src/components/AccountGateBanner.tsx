import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

/**
 * Soft account gate — diligence screens stay usable as guest,
 * but prompt sign-in so data lands under a stable owner id.
 */
export function AccountGateBanner({ surface }: { surface: 'watchlist' | 'journey' }) {
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()

  if (isSignedIn) return null

  const copy =
    surface === 'watchlist'
      ? 'Sign in to keep Homes in Diligence, visit plans, and notes under your account on this device.'
      : 'Sign in to keep Journey progress under your account on this device.'

  return (
    <div
      className="mx-3 mt-3 rounded-2xl border border-saffron/35 bg-saffron/15 px-3.5 py-3"
      data-testid="account-gate-banner"
      data-surface={surface}
    >
      <p className="text-[13px] leading-relaxed text-night-ink">{copy}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-saffron px-4 text-[13px] font-semibold text-white touch-manipulation"
          data-testid="button-account-gate-login"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/30 px-4 text-[13px] font-semibold text-night-ink touch-manipulation"
          data-testid="button-account-gate-signup"
        >
          Sign up
        </button>
      </div>
    </div>
  )
}
