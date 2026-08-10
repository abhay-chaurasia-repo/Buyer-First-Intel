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
 * same subject meaning, dark warm grade for readable champagne type.
 */
export const PAGE_SCENES: Record<PageSceneId, PageScene> = {
  search: {
    id: 'search',
    src: '/scenes/bg-search.png',
    alt: 'Warm craftsman home at dusk with softened glow for readable type',
  },
  watchlist: {
    id: 'watchlist',
    src: '/scenes/bg-watchlist.png?v=darkwarm',
    alt: 'Saved-homes craftsman house, darkened and warmed for readable type',
  },
  journey: {
    id: 'journey',
    src: '/scenes/bg-journey.png?v=darkwarm',
    alt: 'Dusk street toward neighborhood homes, darkened and warmed for readable type',
  },
  property: {
    id: 'property',
    src: '/scenes/bg-property.png?v=darkwarm',
    alt: 'Premium house facade for diligence, darkened and warmed for readable type',
  },
  login: {
    id: 'login',
    src: '/scenes/bg-login.png?v=darkwarm',
    alt: 'Inviting front entry at evening, darkened and warmed for readable type',
  },
  guidance: {
    id: 'guidance',
    src: '/scenes/bg-guidance.png?v=darkwarm',
    alt: 'Calm neighborhood home, darkened and warmed for readable type',
  },
  browse: {
    id: 'browse',
    src: '/scenes/bg-guidance.png?v=darkwarm',
    alt: 'Calm neighborhood home, darkened and warmed for readable type',
  },
}
