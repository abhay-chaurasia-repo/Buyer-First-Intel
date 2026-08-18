import type { PageSceneId } from '@/data/pageScenes'

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
  snippet: 'size' | 'visits' | 'community'
  /** Same house scene + wash as the matching in-app screen */
  scene: PageSceneId
  /** Optional photo override; overlay wash still matches `scene` */
  image?: string
}

export const IMPACT_PAGES: ImpactPage[] = [
  {
    id: 'size',
    eyebrow: "County's Fact",
    title: 'Compare county size with the listing — then help the next buyer.',
    body: 'Open County’s Fact, check Gross living area against Zillow or Redfin, then upvote. Your vote is for the next buyer walking this address — no typed numbers.',
    snippet: 'size',
    scene: 'property',
  },
  {
    id: 'visits',
    eyebrow: 'Verified Visits',
    title: 'See how many buyers actually showed up — and when.',
    body: 'Every GPS-verified visit logs date and time so you can spot natural diligence patterns, not manufactured urgency. Visitor identities stay hidden — buyers can’t contact each other.',
    snippet: 'visits',
    scene: 'journey',
  },
  {
    id: 'community',
    eyebrow: 'Buyer Community',
    title: 'Buyers flag what they actually saw on site.',
    body: 'This Watch label is High-tension cables nearby — the lines sit over the house. Structured signals from visits, not listing copy.',
    snippet: 'community',
    scene: 'watchlist',
    image: '/scenes/bg-community-cables.png',
  },
]
