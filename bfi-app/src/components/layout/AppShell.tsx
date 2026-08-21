import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { SceneBackdrop } from './SceneBackdrop'
import type { PageSceneId } from '@/data/pageScenes'
import { cn } from '@/lib/utils'

type AppShellProps = {
  children: ReactNode
  showBottomNav?: boolean
  className?: string
  contentClassName?: string
  /** Welcome-style house photography behind the screen */
  scene?: PageSceneId
  sceneIntensity?: 'soft' | 'medium' | 'strong'
}

export function AppShell({
  children,
  showBottomNav = true,
  className,
  contentClassName,
  scene,
  sceneIntensity = 'medium',
}: AppShellProps) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden text-night-ink',
        !scene && 'bfi-ink-wash',
        className,
      )}
    >
      {scene ? <SceneBackdrop scene={scene} intensity={sceneIntensity} /> : null}
      <main
        className={cn(
          'relative z-10 flex min-h-0 flex-1 flex-col',
          scene && 'bfi-scene-type',
          showBottomNav && 'pb-[5.35rem]',
          contentClassName,
        )}
      >
        {children}
      </main>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  )
}
