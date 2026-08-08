import { NavLink } from 'react-router-dom'
import { ClipboardCheck, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export const PRIMARY_NAV_ITEMS = [
  { to: '/', icon: Search, label: 'Search', end: true },
  { to: '/watchlist', icon: Star, label: 'Watchlist', end: false },
  { to: '/journey', icon: ClipboardCheck, label: 'Journey', end: false },
] as const

type PrimaryNavPanelProps = {
  /** Visual placement — same panel, different chrome */
  placement?: 'top' | 'bottom'
  className?: string
  testId?: string
}

/**
 * Shared Search / Watchlist / Journey switcher — used as bottom dock and top panel.
 */
export function PrimaryNavPanel({
  placement = 'bottom',
  className,
  testId = 'nav-primary',
}: PrimaryNavPanelProps) {
  const isTop = placement === 'top'

  return (
    <nav
      className={cn(isTop ? 'w-full' : undefined, className)}
      aria-label="Primary"
      data-testid={testId}
      data-placement={placement}
    >
      <div
        className={cn(
          'mx-auto flex w-full items-stretch justify-around border border-white/12 bg-ink/85 px-1.5 shadow-[0_8px_28px_rgb(0_0_0/0.35)] backdrop-blur-xl',
          isTop
            ? 'h-[3.35rem] rounded-[1.2rem]'
            : 'h-[3.85rem] rounded-[1.35rem]',
        )}
      >
        {PRIMARY_NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 transition-colors touch-manipulation',
                isActive ? 'text-saffron-bright' : 'text-night-muted active:text-saffron-glow',
              )
            }
            data-testid={`nav-${label.toLowerCase()}${isTop ? '-top' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={isTop ? 'h-5 w-5' : 'h-[22px] w-[22px]'}
                  strokeWidth={isActive ? 2.4 : 1.85}
                  fill={isActive && label === 'Watchlist' ? 'currentColor' : 'none'}
                />
                <span
                  className={cn(
                    'max-w-full truncate leading-none',
                    isTop ? 'text-[10px]' : 'text-[10px]',
                    isActive ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
