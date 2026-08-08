import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { cn } from '@/lib/utils'

type AppShellProps = {
  children: ReactNode
  showBottomNav?: boolean
  className?: string
  contentClassName?: string
}

export function AppShell({
  children,
  showBottomNav = true,
  className,
  contentClassName,
}: AppShellProps) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden bfi-ink-wash text-night-ink',
        className,
      )}
    >
      <main
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          showBottomNav && 'pb-[4.75rem]',
          contentClassName,
        )}
      >
        {children}
      </main>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  )
}
