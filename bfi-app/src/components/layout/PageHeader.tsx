import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  /** Primary heading — saffron gradient like Search “BFI” */
  title: string
  description?: string
  testId?: string
  className?: string
  children?: ReactNode
}

/**
 * Centered page header that clears the phone notch / status area.
 * Title + description sit inside the same glass panel language as the bottom nav.
 */
export function PageHeader({
  title,
  description,
  testId,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header
      className={cn('sticky top-0 z-20 bfi-status-pad', className)}
      data-testid={testId}
    >
      <div className="px-3 pb-2.5 pt-2">
        <div
          className="mx-auto rounded-[1.35rem] border border-white/12 bg-ink/85 px-4 py-3.5 text-center shadow-[0_8px_28px_rgb(0_0_0/0.35)] backdrop-blur-xl"
          data-testid="page-title-panel"
        >
          <h1 className="mx-auto max-w-[18rem] font-display text-[1.05rem] font-semibold leading-snug tracking-tight">
            <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
          {description ? (
            <p className="mx-auto mt-1.5 max-w-[19rem] text-[11px] leading-relaxed text-night-muted">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  )
}
