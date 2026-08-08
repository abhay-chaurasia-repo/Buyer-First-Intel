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
 * Open page title — same language as Search BFI / Due Diligence (no boxed panel).
 * Clears the phone notch / status area and sits on the scene backdrop.
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
      className={cn('relative z-20 shrink-0 bfi-status-pad', className)}
      data-testid={testId}
    >
      <div className="animate-bfi-rise px-5 pb-2 pt-3 text-center" data-testid="page-title-open">
        <h1 className="mx-auto max-w-[20rem] font-display text-[1.35rem] font-semibold leading-snug tracking-tight">
          <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        {description ? (
          <p className="mx-auto mt-2 max-w-[20rem] text-[0.9rem] leading-relaxed text-night-muted">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </header>
  )
}
