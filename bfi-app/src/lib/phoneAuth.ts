import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'

/** Keep at most 10 US national digits (strip leading country 1 if pasted). */
export function usNationalDigits(raw: string) {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  if (digits.startsWith('1') && digits.length > 10) {
    digits = digits.slice(1)
  }
  return digits.slice(0, 10)
}

/** Display helper: (555) 123-4567 */
export function formatUsNationalDisplay(raw: string) {
  const digits = usNationalDigits(raw)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/**
 * Normalize a US mobile number to E.164 (+1XXXXXXXXXX).
 * Accepts national 10-digit, 1XXXXXXXXXX, or +1XXXXXXXXXX paste.
 */
export function normalizeUsPhoneInput(raw: string): string | null {
  const digits = usNationalDigits(raw)
  if (digits.length !== 10) return null
  // NANP: area code and exchange cannot start with 0 or 1
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return `+1${digits}`
}

/** @deprecated use normalizeUsPhoneInput — kept for callers that need a string */
export function normalizePhoneInput(raw: string) {
  return normalizeUsPhoneInput(raw) ?? ''
}

export function formatE164ForDisplay(e164: string) {
  const digits = usNationalDigits(e164)
  if (digits.length === 10) return `+1 ${formatUsNationalDisplay(digits)}`
  return e164
}

export async function sendPhoneOtp(phone: string) {
  const supabase = getSupabase()
  if (!supabase) {
    return {
      ok: false as const,
      error: 'Supabase is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local.',
    }
  }

  const normalized = normalizeUsPhoneInput(phone)
  if (!normalized) {
    return { ok: false as const, error: 'Enter a valid 10-digit US mobile number.' }
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
  if (error) {
    return { ok: false as const, error: error.message }
  }
  return { ok: true as const, phone: normalized }
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const supabase = getSupabase()
  if (!supabase) {
    return {
      ok: false as const,
      error: 'Supabase is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local.',
    }
  }

  const normalized = normalizeUsPhoneInput(phone)
  const code = token.trim()
  if (!normalized) {
    return { ok: false as const, error: 'Enter a valid 10-digit US mobile number.' }
  }
  if (!code) {
    return { ok: false as const, error: 'Enter the verification code from your text.' }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: code,
    type: 'sms',
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }
  if (!data.user) {
    return { ok: false as const, error: 'Verification failed. Try again.' }
  }

  return {
    ok: true as const,
    userId: data.user.id,
    phone: data.user.phone ?? normalized,
  }
}

export async function signOutSupabase() {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSupabasePhoneUser() {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null
  return {
    userId: user.id,
    phone: user.phone ?? null,
  }
}

export { isSupabaseConfigured }
