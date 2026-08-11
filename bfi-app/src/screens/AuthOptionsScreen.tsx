import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Phone, UserRoundPlus } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { SceneBackdrop } from '@/components/layout/SceneBackdrop'
import {
  authMethodLabel,
  loadLastAuthMethod,
  type AuthMethodId,
} from '@/data/authSession'
import { APP_NAME, APP_TAGLINE } from '@/data/brand'
import { markImpactSeen } from '@/data/impactStory'
import { cn } from '@/lib/utils'

type AuthMode = 'signup' | 'login'

type AuthMethod = {
  id: AuthMethodId
  label: string
  testId: string
  tone: 'primary' | 'dark' | 'facebook'
  icon: ReactNode
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.88-2.12 1.56-3.24 1.46-.14-1.1.44-2.26 1.18-3.06.8-.88 2.2-1.52 3.24-1.42ZM20.5 17.2c-.56 1.28-.84 1.84-1.58 2.96-1.02 1.5-2.46 3.38-4.24 3.4-1.58.02-2 .96-3.74.96s-2.24-.94-3.74-.98c-1.86-.06-3.28-1.92-4.3-3.42-2.86-4.2-3.16-9.12-1.4-11.74 1.24-1.86 3.2-2.94 5.04-2.94 1.88 0 3.06 1.02 4.62 1.02 1.5 0 2.42-1.04 4.58-1.04 1.64 0 3.36.88 4.58 2.4-4.02 2.2-3.36 7.94.18 9.38Z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14 8.2h2.4V5H14c-2.42 0-4 1.7-4 4.2V11H7.5v3.2H10V22h3.4v-7.8h2.7l.5-3.2H13.4V9.4c0-.7.3-1.2.6-1.2Z" />
    </svg>
  )
}

const toneClass: Record<AuthMethod['tone'], string> = {
  primary:
    'bg-saffron text-white shadow-[0_10px_28px_rgb(232_145_58/0.35)] hover:bg-saffron-deep',
  dark: 'bg-[#1a1415] text-white hover:bg-[#241c1d] border border-white/10',
  facebook: 'bg-[#1877F2] text-white hover:bg-[#166fe0]',
}

type AuthOptionsScreenProps = {
  mode: AuthMode
}

/**
 * Auth method chooser — signup for new buyers, login for returning.
 * Step 1: creates a local session. Later each method plugs into a real IdP / OTP.
 */
export function AuthOptionsScreen({ mode }: AuthOptionsScreenProps) {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const isSignup = mode === 'signup'
  const lastMethod = loadLastAuthMethod()

  const methods: AuthMethod[] = [
    ...(isSignup
      ? []
      : [
          {
            id: 'quick' as const,
            label: 'Quick sign in',
            testId: 'button-auth-quick',
            tone: 'primary' as const,
            icon: <UserRoundPlus className="h-5 w-5" strokeWidth={2.25} />,
          },
        ]),
    {
      id: 'apple',
      label: 'Continue with Apple ID',
      testId: 'button-auth-apple',
      tone: 'dark',
      icon: <AppleIcon className="h-5 w-5" />,
    },
    {
      id: 'facebook',
      label: 'Continue with Facebook',
      testId: 'button-auth-facebook',
      tone: 'facebook',
      icon: <FacebookIcon className="h-5 w-5" />,
    },
    {
      id: 'mobile',
      label: 'Use mobile number',
      testId: 'button-auth-mobile',
      tone: 'dark',
      icon: <Phone className="h-5 w-5" strokeWidth={2.25} />,
    },
  ]

  function enterApp(methodId: AuthMethodId) {
    signIn(methodId)
    markImpactSeen()
    navigate('/')
  }

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden text-night-ink bfi-scene-type"
      data-testid={isSignup ? 'signup-screen' : 'login-screen'}
      data-auth-mode={mode}
    >
      <SceneBackdrop scene="login" intensity={isSignup ? 'soft' : 'medium'} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,calc(var(--bfi-status-pad)+0.25rem))]">
        <header className="flex items-center">
          <button
            type="button"
            onClick={() => navigate('/welcome')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white text-ink shadow-sm touch-manipulation"
            aria-label="Back to story"
            data-testid="button-auth-back"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.35} />
          </button>
        </header>

        <div className="mt-6 flex flex-1 flex-col items-center">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size={64} />
            <p className="mt-4 font-display text-[1.85rem] font-bold tracking-tight text-night-ink">
              {APP_NAME}
            </p>
            <p className="mt-1 font-display text-[0.95rem] font-semibold tracking-tight text-saffron-glow">
              {APP_TAGLINE}
            </p>
            {isSignup ? (
              <p className="mt-2 max-w-[17rem] text-[0.95rem] leading-relaxed text-night-muted">
                Create an account to keep Homes in Diligence, Journey progress, and private notes.
              </p>
            ) : (
              <div className="mt-3 max-w-[18rem]">
                <p className="font-display text-[1.2rem] font-semibold tracking-tight text-night-ink">
                  Welcome back
                </p>
                <p className="mt-1.5 text-[0.92rem] leading-relaxed text-night-muted">
                  Pick up where you left off on your property journey.
                </p>
              </div>
            )}
          </div>

          {!isSignup ? (
            <p
              className="mt-8 text-center text-[13px] font-medium text-night-ink/90"
              data-testid="auth-last-method"
            >
              {lastMethod
                ? `You last signed in with ${authMethodLabel(lastMethod)}.`
                : 'Choose how you want to sign in.'}
            </p>
          ) : (
            <div className="mt-10" />
          )}

          <div
            className={cn('w-full max-w-[21rem] space-y-3', isSignup ? 'mt-2' : 'mt-4')}
            data-testid="auth-methods"
          >
            {methods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => enterApp(method.id)}
                className={cn(
                  'inline-flex min-h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-full px-5 text-[0.98rem] font-semibold transition-colors touch-manipulation',
                  toneClass[method.tone],
                )}
                data-testid={method.testId}
              >
                {method.icon}
                {method.label}
              </button>
            ))}
          </div>

          <div className="mt-auto w-full max-w-[21rem] pt-8">
            <p className="text-center text-[11px] leading-relaxed text-night-faint">
              By {isSignup ? 'signing up' : 'logging in'}, you agree to our{' '}
              <button type="button" className="underline underline-offset-2">
                Terms
              </button>
              . See how we use your data in our{' '}
              <button type="button" className="underline underline-offset-2">
                Privacy Policy
              </button>
              .
            </p>
            <p className="mt-2 text-center text-[11px] text-night-faint">
              Step 1 · local session on this device. Apple, Facebook, and phone OTP come next.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SignupScreen() {
  return <AuthOptionsScreen mode="signup" />
}

export function LoginScreen() {
  return <AuthOptionsScreen mode="login" />
}
