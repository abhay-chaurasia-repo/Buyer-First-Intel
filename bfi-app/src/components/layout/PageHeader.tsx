import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  /** Primary page name — saffron gradient like Search “BFI” */
  title: string
  /** Supporting line — warm cream that matches the palette */
  subtitle: string
  description?: string
  testId?: string
  className?: string
  children?: ReactNode
}

/**
 * Centered page header matching Search branding: saffron title + warm subtitle.
 */
export function PageHeader({
  title,
  subtitle,
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
        <p className="mt-1.5 font-display text-[15px] font-semibold tracking-tight text-saffron-glow">
          {subtitle}
        </p>
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
