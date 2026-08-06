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
    <div className={cn('relative mx-auto flex min-h-dvh w-full max-w-lg flex-col', className)}>
      <main
        className={cn(
          'flex flex-1 flex-col',
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
