// Supabase Edge Function: address search + future ATTOM property facts
// Deploy: supabase functions deploy property-lookup
// Secrets (optional for ATTOM step): ATTOM_API_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ResolvedAddress = {
  id: string
  formatted: string
  street: string
  city: string
  state: string
  zipCode: string
  lat: number
  lng: number
  source: 'census' | 'edge'
  matchedAddress?: string
}

function titleCaseToken(token: string) {
  if (!token) return token
  if (/^[NSEW]$/i.test(token)) return token.toUpperCase()
  if (/^(NE|NW|SE|SW)$/i.test(token)) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

function titleCaseStreet(raw: string) {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ')
}

function stableAddressId(parts: {
  street: string
  city: string
  state: string
  zipCode: string
}) {
  const key = [parts.street, parts.city, parts.state, parts.zipCode]
    .map((p) => p.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
    .join('--')
  return `addr-${key}`.slice(0, 96)
}

async function searchCensus(query: string, limit = 6): Promise<ResolvedAddress[]> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
  url.searchParams.set('address', query)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Census geocoder failed (${res.status})`)
  const data = await res.json()
  const matches = data?.result?.addressMatches ?? []
  const out: ResolvedAddress[] = []

  for (const match of matches) {
    const c = match.addressComponents
    const lat = match.coordinates?.y
    const lng = match.coordinates?.x
    if (!c?.city || !c?.state || lat == null || lng == null) continue

    const streetBits = [
      c.fromAddress,
      c.preDirection,
      c.preType,
      c.streetName,
      c.suffixType,
      c.suffixDirection,
    ]
      .map((v: string | undefined) => (v || '').trim())
      .filter(Boolean)
    const street = titleCaseStreet(streetBits.join(' '))
    if (!street) continue

    const city = titleCaseStreet(c.city)
    const state = String(c.state).toUpperCase()
    const zipCode = String(c.zip || '').trim()
    const formatted = zipCode
      ? `${street}, ${city}, ${state} ${zipCode}`
      : `${street}, ${city}, ${state}`

    out.push({
      id: stableAddressId({ street, city, state, zipCode }),
      formatted,
      street,
      city,
      state,
      zipCode,
      lat,
      lng,
      source: 'edge',
      matchedAddress: match.matchedAddress,
    })
    if (out.length >= limit) break
  }

  return out
}

/**
 * ATTOM Property API placeholder.
 * When ATTOM_API_KEY is set, wire Expanded Profile / Property Detail here and
 * map into the app MockProperty fields (sqft, beds, baths, yearBuilt, APN, tax…).
 */
async function fetchAttomFacts(_match: ResolvedAddress): Promise<{
  factsStatus: 'pending' | 'live'
  property?: Record<string, unknown>
}> {
  const key = Deno.env.get('ATTOM_API_KEY')
  if (!key) {
    return { factsStatus: 'pending' }
  }

  // Intentionally not calling ATTOM until key + product endpoints are confirmed.
  // Keep returning pending so the client shell stays honest.
  return { factsStatus: 'pending' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnon) {
      return new Response(JSON.stringify({ error: 'Server is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as {
      query?: string
      mode?: 'search' | 'resolve'
    }
    const query = (body.query || '').trim()
    const mode = body.mode === 'resolve' ? 'resolve' : 'search'

    if (query.length < 4) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const matches = await searchCensus(query)
    if (mode === 'search') {
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const match = matches[0] ?? null
    if (!match) {
      return new Response(JSON.stringify({ match: null, matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attom = await fetchAttomFacts(match)
    return new Response(
      JSON.stringify({
        match,
        matches,
        factsStatus: attom.factsStatus,
        property: attom.property ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
