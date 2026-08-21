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

const APP_CANVAS = '/scenes/bg-search.png'
const APP_CANVAS_ALT =
  'Warm craftsman home at dusk — same Search canvas on every in-app screen'

/**
 * In-app screens share the Search photo so the wash and hue stay identical.
 * Login keeps its own entry photo. Welcome slides pin their own images.
 */
export const PAGE_SCENES: Record<PageSceneId, PageScene> = {
  search: {
    id: 'search',
    src: APP_CANVAS,
    alt: APP_CANVAS_ALT,
  },
  watchlist: {
    id: 'watchlist',
    src: APP_CANVAS,
    alt: APP_CANVAS_ALT,
  },
  journey: {
    id: 'journey',
    src: APP_CANVAS,
    alt: APP_CANVAS_ALT,
  },
  property: {
    id: 'property',
    src: APP_CANVAS,
    alt: APP_CANVAS_ALT,
  },
  login: {
    id: 'login',
    src: '/scenes/bg-login.png?v=darkwarm',
    alt: 'Inviting front entry at evening, darkened and warmed for readable type',
  },
  guidance: {
    id: 'guidance',
    src: APP_CANVAS,
    alt: APP_CANVAS_ALT,
  },
  browse: {
    id: 'browse',
    src: APP_CANVAS,
    alt: APP_CANVAS_ALT,
  },
}
