import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { SceneBackdrop } from '@/components/layout/SceneBackdrop'
import { markImpactSeen } from '@/data/impactStory'
import { cn } from '@/lib/utils'

/**
 * Login shell only — auth logic comes later.
 */
export function LoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Placeholder: no auth yet — enter the app after acknowledging the story.
    markImpactSeen()
    navigate('/')
  }

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden text-night-ink"
      data-testid="login-screen"
    >
      <SceneBackdrop scene="login" intensity="medium" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-8 sm:px-6">
        <header className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.35)]">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <span className="font-display text-sm font-semibold tracking-[0.14em] text-night-muted uppercase">
            BFI
          </span>
        </header>

        <div className="mt-8 flex-1">
          <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
            Buyer-only
          </p>
          <h1 className="mt-2 font-display text-[1.35rem] font-semibold tracking-tight">
            <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
              Log in
            </span>
          </h1>
          <p className="mt-2 max-w-sm text-[0.95rem] leading-relaxed text-white/80">
            Sign in to sync Watchlist, Journey, and private notes. Auth wiring comes next — for now,
            continue into due diligence.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3" data-testid="login-form">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-night-faint uppercase">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
                className="min-h-12 w-full rounded-2xl border border-white/25 bg-coastal/90 px-4 text-night-ink outline-none placeholder:text-night-faint backdrop-blur-md focus:border-saffron focus:ring-4 focus:ring-saffron/25"
                data-testid="input-login-email"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-night-faint uppercase">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="min-h-12 w-full rounded-2xl border border-white/25 bg-coastal/90 px-4 text-night-ink outline-none placeholder:text-night-faint backdrop-blur-md focus:border-saffron focus:ring-4 focus:ring-saffron/25"
                data-testid="input-login-password"
              />
            </label>

            <button
              type="submit"
              className={cn(
                'mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-saffron text-base font-semibold text-white shadow-[0_10px_28px_rgb(232_145_58/0.4)] transition-colors hover:bg-saffron-deep touch-manipulation',
              )}
              data-testid="button-login-submit"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-night-faint">
            Login is a preview shell. No account is created yet.
          </p>
        </div>

        <Link
          to="/welcome"
          className="mt-4 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-saffron-glow touch-manipulation"
          data-testid="link-back-to-story"
        >
          Back to story
        </Link>
      </div>
    </div>
  )
}
