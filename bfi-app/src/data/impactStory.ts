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
    title: 'Compare county size with the listing.',
    body: 'Open County’s Fact and read Gross living area. Compare it with Zillow or Redfin yourself. Size notes belong on this home’s checklist — not a popularity vote.',
    snippet: 'size',
    scene: 'property',
    image: '/scenes/bg-property.png?v=darkwarm',
  },
  {
    id: 'visits',
    eyebrow: 'Presence Confirmed',
    title: 'See how many phones were near the pin — and when.',
    body: 'Presence Confirmed means a device was within about 100 meters of the property pin. It logs date and time, and that date stays. You can submit one observation form for two weeks after Confirm. It does not prove anyone entered the home or completed a tour. Identities stay hidden.',
    snippet: 'visits',
    scene: 'journey',
    image: '/scenes/bg-journey.png?v=darkwarm',
  },
  {
    id: 'community',
    eyebrow: 'Buyer Community',
    title: 'Buyers record what they saw on site — once.',
    body: 'Noise, parking, basement, and moisture. One structured form per buyer after Confirm. Tallies are property-level. No ratings, no Plus/Watch, no free text.',
    snippet: 'community',
    scene: 'watchlist',
    image: '/scenes/bg-community-cables.png',
  },
]
