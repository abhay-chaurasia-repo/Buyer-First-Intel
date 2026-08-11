import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'

/** Normalize to E.164-ish input; user should include country code. */
export function normalizePhoneInput(raw: string) {
  const trimmed = raw.trim().replace(/[^\d+]/g, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) return trimmed
  return `+${trimmed}`
}

export async function sendPhoneOtp(phone: string) {
  const supabase = getSupabase()
  if (!supabase) {
    return {
      ok: false as const,
      error: 'Supabase is not configured. Add VITE_SUPABASE_ANON_KEY to .env.local.',
    }
  }

  const normalized = normalizePhoneInput(phone)
  if (normalized.length < 8) {
    return { ok: false as const, error: 'Enter a valid mobile number with country code.' }
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

  const normalized = normalizePhoneInput(phone)
  const code = token.trim()
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
