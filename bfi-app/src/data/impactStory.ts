import type { PageSceneId } from '@/data/pageScenes'

export const IMPACT_SEEN_KEY = 'bfi.impact-seen'
const IMPACT_LAUNCH_KEY = 'bfi.impact-seen-launch'

/** True after the buyer finishes welcome in this app launch. */
export function hasSeenImpact(): boolean {
  try {
    return sessionStorage.getItem(IMPACT_LAUNCH_KEY) === '1'
  } catch {
    return false
  }
}

export function markImpactSeen() {
  try {
    sessionStorage.setItem(IMPACT_LAUNCH_KEY, '1')
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
    title: 'Compare county size with the listing — flag it only if it looks off.',
    body: 'Open County’s Fact, check Gross living area against Zillow or Redfin, and flag if the published size looks larger than county. No flag means the next buyer treats it as a match.',
    snippet: 'size',
    scene: 'property',
    image: '/scenes/bg-property.png?v=darkwarm',
  },
  {
    id: 'visits',
    eyebrow: 'Presence Confirmed',
    title: 'See how many phones were near the pin — and when.',
    body: 'Presence Confirmed means a device was within about 100 meters of the property pin. It logs date and time, and that date stays. You can add labels for two weeks after Confirm. It does not prove anyone entered the home or completed a tour. Identities stay hidden.',
    snippet: 'visits',
    scene: 'journey',
    image: '/scenes/bg-journey.png?v=darkwarm',
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
