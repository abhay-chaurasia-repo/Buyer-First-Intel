export type PageSceneId =
  | 'search'
  | 'watchlist'
  | 'journey'
  | 'property'
  | 'login'
  | 'guidance'
  | 'browse'

export type PageScene = {
  id: PageSceneId
  src: string
  alt: string
}

/**
 * Atmospheric house scenes matched to each screen’s job —
 * same welcome-story language, different place feeling.
 */
export const PAGE_SCENES: Record<PageSceneId, PageScene> = {
  search: {
    id: 'search',
    src: '/scenes/bg-search.png',
    alt: 'Welcoming craftsman home at golden hour',
  },
  watchlist: {
    id: 'watchlist',
    src: '/scenes/bg-watchlist.png',
    alt: 'Cozy home with warm glowing windows at dusk',
  },
  journey: {
    id: 'journey',
    src: '/scenes/bg-journey.png',
    alt: 'Tree-lined residential street toward homes ahead',
  },
  property: {
    id: 'property',
    src: '/scenes/bg-property.png',
    alt: 'Warm golden-hour craftsman facade with glowing windows',
  },
  login: {
    id: 'login',
    src: '/scenes/bg-login.png',
    alt: 'Inviting front entry of a home at evening',
  },
  guidance: {
    id: 'guidance',
    src: '/scenes/bg-guidance.png',
    alt: 'Calm established neighborhood home',
  },
  browse: {
    id: 'browse',
    src: '/scenes/bg-guidance.png',
    alt: 'Calm established neighborhood home',
  },
}
