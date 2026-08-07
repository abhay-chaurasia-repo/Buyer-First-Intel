export const IMPACT_SEEN_KEY = 'bfi.impact-seen'

export function hasSeenImpact(): boolean {
  try {
    return localStorage.getItem(IMPACT_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markImpactSeen() {
  try {
    localStorage.setItem(IMPACT_SEEN_KEY, '1')
  } catch {
    // Ignore storage failures in demo shell
  }
}

export type ImpactPage = {
  id: string
  eyebrow: string
  title: string
  body: string
  image: string
  imageAlt: string
  snippet: 'size' | 'visits' | 'community'
}

export const IMPACT_PAGES: ImpactPage[] = [
  {
    id: 'size',
    eyebrow: 'County vs listing',
    title: 'See when the listing size doesn’t match the county.',
    body: 'BFI puts county living area next to what’s claimed in the listing — so you catch sqft gaps before you tour, offer, or talk to an agent.',
    image: '/impact/impact-georgian-home.png',
    imageAlt: 'Georgian-style home facade',
    snippet: 'size',
  },
  {
    id: 'visits',
    eyebrow: 'Verified visits',
    title: 'Know who actually showed up — and when.',
    body: 'Every GPS-verified visit logs date and time. Spot natural diligence patterns, not manufactured urgency, before you commit.',
    image: '/impact/impact-visits.png',
    imageAlt: 'Quiet residential street at dusk',
    snippet: 'visits',
  },
  {
    id: 'community',
    eyebrow: 'Buyer community',
    title: 'Read what verified buyers labeled on site.',
    body: 'Plus and Watch labels — from high-tension lines to quiet nights — come from people who confirmed presence. Structured signals, not marketing blurbs.',
    image: '/impact/impact-community.png',
    imageAlt: 'Neighborhood community atmosphere',
    snippet: 'community',
  },
]
