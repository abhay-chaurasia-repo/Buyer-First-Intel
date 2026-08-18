import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { BrandLogo } from '@/components/BrandLogo'
import { SceneBackdrop } from '@/components/layout/SceneBackdrop'
import { APP_NAME, APP_TAGLINE } from '@/data/brand'
import { SEARCH_PLAN } from '@/data/authPolicy'
import { markImpactSeen } from '@/data/impactStory'
import {
  formatE164ForDisplay,
  formatUsNationalDisplay,
  normalizeUsPhoneInput,
  usNationalDigits,
} from '@/lib/phoneAuth'

type AuthMode = 'signup' | 'login'

type AuthOptionsScreenProps = {
  mode: AuthMode
}

/**
 * Phone-only auth — signup and login are the same two steps
 * (number → OTP). First verified number creates the account.
 */
export function AuthOptionsScreen({ mode }: AuthOptionsScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { supabaseReady, requestPhoneOtp, confirmPhoneOtp } = useAuth()
  const isSignup = mode === 'signup'
  const from =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? (location.state as { from: string }).from
      : '/'

  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone')
  const [nationalPhone, setNationalPhone] = useState('')
  const [e164Phone, setE164Phone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nationalDigits = usNationalDigits(nationalPhone)
  const canSendCode = Boolean(normalizeUsPhoneInput(nationalDigits))

  async function handleSendCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const normalized = normalizeUsPhoneInput(nationalDigits)
    if (!normalized) {
      setError('Enter a valid 10-digit US mobile number.')
      return
    }
    if (!supabaseReady) {
      setError('Phone sign-in is not configured on this build.')
      return
    }
    setBusy(true)
    const result = await requestPhoneOtp(normalized)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setE164Phone(result.phone)
    setNationalPhone(usNationalDigits(result.phone))
    setPhoneStep('code')
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const result = await confirmPhoneOtp(e164Phone || nationalDigits, code)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    markImpactSeen()
    navigate(from.startsWith('/') ? from : '/', { replace: true })
  }

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden text-night-ink bfi-scene-type"
      data-testid={isSignup ? 'signup-screen' : 'login-screen'}
      data-auth-mode={mode}
    >
      <SceneBackdrop scene="login" intensity="medium" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,calc(var(--bfi-status-pad)+0.25rem))]">
        <header className="flex items-center">
          <button
            type="button"
            onClick={() => {
              if (phoneStep === 'code') {
                setPhoneStep('phone')
                setError(null)
                setCode('')
                return
              }
              navigate('/welcome')
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white text-ink shadow-sm touch-manipulation"
            aria-label={phoneStep === 'code' ? 'Back to mobile number' : 'Back to story'}
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
            <div className="mt-3 max-w-[18rem]">
              <p className="font-display text-[1.2rem] font-semibold tracking-tight text-night-ink">
                {phoneStep === 'code'
                  ? 'Enter code'
                  : isSignup
                    ? 'Start with your mobile number'
                    : 'Welcome back'}
              </p>
              <p className="mt-1.5 text-[0.92rem] leading-relaxed text-night-muted">
                {phoneStep === 'code'
                  ? `We texted a code to ${formatE164ForDisplay(e164Phone || nationalDigits)}.`
                  : isSignup
                    ? 'US numbers only. We’ll text a code — that number is your account. 10 free searches each month.'
                    : 'Enter your US mobile number and we’ll text a code.'}
              </p>
            </div>
          </div>

          {phoneStep === 'phone' ? (
            <form
              onSubmit={handleSendCode}
              className="mt-8 w-full max-w-[21rem] space-y-3"
              data-testid="phone-otp-form"
            >
              <label className="sr-only" htmlFor="auth-phone">
                US mobile number
              </label>
              <div
                className="flex min-h-[3.4rem] w-full items-center gap-2 rounded-full border border-white/25 bg-transparent px-4 focus-within:border-saffron focus-within:ring-4 focus-within:ring-saffron/20"
                data-testid="phone-us-field"
              >
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-2.5 py-1 text-[0.85rem] font-semibold text-night-ink"
                  aria-hidden
                  data-testid="phone-us-prefix"
                >
                  <span className="text-[0.7rem] tracking-wide text-night-faint uppercase">US</span>
                  <span>+1</span>
                </span>
                <input
                  id="auth-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="(555) 555-0100"
                  value={formatUsNationalDisplay(nationalPhone)}
                  onChange={(event) => setNationalPhone(usNationalDigits(event.target.value))}
                  className="min-w-0 flex-1 bg-transparent py-3 text-[1rem] text-night-ink outline-none placeholder:text-night-faint"
                  data-testid="input-auth-phone"
                  maxLength={14}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !canSendCode}
                className="inline-flex min-h-[3.4rem] w-full items-center justify-center rounded-full bg-saffron px-5 text-[0.98rem] font-semibold text-[#2a1f20] touch-manipulation disabled:bg-saffron/40 disabled:text-[#2a1f20]/70"
                data-testid="button-send-otp"
              >
                {busy ? 'Sending…' : 'Text me a code'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleVerifyCode}
              className="mt-8 w-full max-w-[21rem] space-y-3"
              data-testid="phone-code-form"
            >
              <label className="sr-only" htmlFor="auth-otp">
                Verification code
              </label>
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="min-h-[3.4rem] w-full rounded-full border border-white/25 bg-transparent px-5 text-center text-[1.15rem] tracking-[0.2em] text-night-ink outline-none placeholder:tracking-normal placeholder:text-night-faint focus:border-saffron focus:ring-4 focus:ring-saffron/20"
                data-testid="input-auth-otp"
              />
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="inline-flex min-h-[3.4rem] w-full items-center justify-center rounded-full bg-saffron px-5 text-[0.98rem] font-semibold text-[#2a1f20] touch-manipulation disabled:bg-saffron/40 disabled:text-[#2a1f20]/70"
                data-testid="button-verify-otp"
              >
                {busy ? 'Verifying…' : isSignup ? 'Verify and start' : 'Verify and continue'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPhoneStep('phone')
                  setCode('')
                  setError(null)
                }}
                className="w-full text-center text-[12px] font-medium text-night-muted underline underline-offset-2 touch-manipulation"
              >
                Use a different number
              </button>
            </form>
          )}

          {error ? (
            <p className="mt-3 max-w-[21rem] text-center text-[12px] text-red-300" data-testid="auth-error">
              {error}
            </p>
          ) : null}

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
              One number, one account. {SEARCH_PLAN.freeSearchesPerMonth} free searches each month,
              then {SEARCH_PLAN.priceLabel} for unlimited while you keep looking.
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
