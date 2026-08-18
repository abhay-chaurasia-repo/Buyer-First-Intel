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
}

export const IMPACT_PAGES: ImpactPage[] = [
  {
    id: 'size',
    eyebrow: "County's Fact",
    title: 'Gross living area first — then check the listing.',
    body: 'Open County’s Fact, compare Gross living area with Zillow or Redfin, and upvote whether the published size matches or looks overstated. No typed numbers.',
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
    title: 'Read Plus and Watch signals from buyers.',
    body: 'Plus labels flag upsides buyers noticed. Watch labels flag watch-outs to dig into. Most need an on-site visit; listing-vs-county size labels can be upvoted remotely.',
    snippet: 'community',
    scene: 'watchlist',
  },
]
