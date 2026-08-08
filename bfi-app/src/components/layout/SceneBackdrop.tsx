import { PAGE_SCENES, type PageSceneId } from '@/data/pageScenes'
import { cn } from '@/lib/utils'

type SceneBackdropProps = {
  scene: PageSceneId
  /** Stronger ink wash keeps dense UI readable */
  intensity?: 'soft' | 'medium' | 'strong'
  className?: string
}

const overlays: Record<NonNullable<SceneBackdropProps['intensity']>, string> = {
  soft: 'from-ink/35 via-ink/28 to-ink/72',
  medium: 'from-ink/42 via-ink/35 to-ink/78',
  strong: 'from-ink/52 via-ink/45 to-ink/85',
}

/**
 * Welcome-style house photography behind app screens.
 */
export function SceneBackdrop({
  scene,
  intensity = 'medium',
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
        src={page.src}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
      <div
        className={cn('absolute inset-0 bg-gradient-to-b', overlays[intensity])}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgb(232_145_58/0.14),transparent_55%)]" />
    </div>
  )
}
