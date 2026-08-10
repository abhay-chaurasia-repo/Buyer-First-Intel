import type { PageSceneId } from './pageScenes'

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
  /** Same atmospheric scenes as inner app screens */
  scene: PageSceneId
  snippet: 'size' | 'visits' | 'community'
}

export const IMPACT_PAGES: ImpactPage[] = [
  {
    id: 'size',
    eyebrow: 'County vs listing',
    title: 'County living area first — then check the listing.',
    body: 'See the county sqft on Due Diligence, compare it with Zillow or Redfin, and upvote whether the published size matches or looks overstated. No typed numbers.',
    scene: 'property',
    snippet: 'size',
  },
  {
    id: 'visits',
    eyebrow: 'Verified visits',
    title: 'Know who actually showed up — and when.',
    body: 'Every GPS-verified visit logs date and time. Spot natural diligence patterns, not manufactured urgency, before you commit.',
    scene: 'journey',
    snippet: 'visits',
  },
  {
    id: 'community',
    eyebrow: 'Buyer community',
    title: 'Read what verified buyers labeled on site.',
    body: 'Plus and Watch labels — from high-tension lines to quiet nights — come from people who confirmed presence. Structured signals, not marketing blurbs.',
    scene: 'search',
    snippet: 'community',
  },
]
