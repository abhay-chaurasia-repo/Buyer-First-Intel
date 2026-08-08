import type { ReactNode } from 'react'
import { PrimaryNavPanel } from './PrimaryNavPanel'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  /** Primary heading — saffron gradient like Search “BFI” */
  title: string
  description?: string
  testId?: string
  className?: string
  children?: ReactNode
  /** Show Search / Watchlist / Journey panel under the status area */
  showPrimaryNav?: boolean
}

/**
 * Centered page header that clears the phone notch / status area.
 */
export function PageHeader({
  title,
  description,
  testId,
  className,
  children,
  showPrimaryNav = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-white/15 bg-coastal/80 backdrop-blur-md bfi-status-pad',
        className,
      )}
      data-testid={testId}
    >
      <div className="px-4 pb-3 pt-2.5">
        {showPrimaryNav ? (
          <div className="mb-3" data-testid="page-header-primary-nav">
            <PrimaryNavPanel placement="top" testId="nav-top-panel" />
          </div>
        ) : null}
        <div className="text-center">
          <h1 className="mx-auto max-w-[16rem] font-display text-[1.05rem] font-semibold leading-snug tracking-tight">
            <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
          {description ? (
            <p className="mx-auto mt-1 max-w-[18rem] text-[11px] leading-relaxed text-white/75">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  )
}
