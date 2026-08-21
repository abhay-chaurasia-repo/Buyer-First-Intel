import { PAGE_SCENES, type PageSceneId } from '@/data/pageScenes'
import { cn } from '@/lib/utils'

type SceneBackdropProps = {
  scene: PageSceneId
  /** Stronger ink wash keeps dense UI readable */
  intensity?: 'soft' | 'medium' | 'strong'
  /** Optional photo override — same wash as the named scene */
  src?: string
  className?: string
}

/** Dark warm washes — matched to Search so champagne text stays forward */
const overlays: Record<NonNullable<SceneBackdropProps['intensity']>, string> = {
  soft: 'from-ink/48 via-ink/40 to-ink/80',
  medium: 'from-ink/55 via-ink/48 to-ink/86',
  strong: 'from-ink/62 via-ink/55 to-ink/90',
}

/** Same saffron warmth as Search on every scene, including login */
const accentWash =
  'bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgb(232_145_58/0.14),transparent_55%)]'

/**
 * Welcome-style house photography behind app screens.
 * Graded dark + warm so champagne parchment type stays readable.
 */
export function SceneBackdrop({
  scene,
  intensity = 'medium',
  src,
  className,
}: SceneBackdropProps) {
  const page = PAGE_SCENES[scene]

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
      data-testid={`scene-backdrop-${scene}`}
    >
      <img
        src={src || page.src}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
      <div
        className={cn('absolute inset-0 bg-gradient-to-b', overlays[intensity])}
      />
      <div className={cn('absolute inset-0', accentWash)} />
    </div>
  )
}
