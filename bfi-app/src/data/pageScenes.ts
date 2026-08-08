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
    alt: 'Warm craftsman home at dusk with softened glow for readable type',
  },
  watchlist: {
    id: 'watchlist',
    src: '/scenes/bg-watchlist.png',
    alt: 'Calm house under soft blue sky for readable saved homes',
  },
  journey: {
    id: 'journey',
    src: '/scenes/bg-journey.png',
    alt: 'Calm dusk street toward neighborhood homes ahead',
  },
  property: {
    id: 'property',
    src: '/scenes/bg-property.png',
    alt: 'Premium clear-day house facade for property diligence',
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
