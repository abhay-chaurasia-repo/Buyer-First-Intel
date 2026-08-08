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
 * Centered page header matching Search branding.
 * Nav already names the tab, so headers show purpose only (e.g. Saved properties).
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
      className={cn(
        'sticky top-0 z-20 border-b border-white/15 bg-coastal/90 backdrop-blur-md',
        className,
      )}
      data-testid={testId}
    >
      <div className="px-4 py-3.5 text-center">
        <h1 className="font-display text-[1.65rem] font-extrabold leading-none tracking-tight">
          <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-white/75">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </header>
  )
}
