import { NavLink } from 'react-router-dom'
import { ClipboardCheck, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Search, label: 'Search', end: true },
  { to: '/watchlist', icon: Star, label: 'Watchlist', end: false },
  { to: '/journey', icon: ClipboardCheck, label: 'Journey', end: false },
] as const

/**
 * Bottom Search / Watchlist / Journey dock.
 */
export function PrimaryNavPanel({
  className,
  testId = 'nav-primary',
}: {
  className?: string
  testId?: string
}) {
  return (
    <nav className={className} aria-label="Primary" data-testid={testId}>
      <div className="mx-auto flex h-[3.85rem] w-full items-stretch justify-around rounded-[1.35rem] border border-white/20 bg-transparent px-1.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 transition-colors touch-manipulation',
                isActive ? 'text-saffron-glow' : 'text-night-muted active:text-saffron-glow',
              )
            }
            data-testid={`nav-${label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.4 : 1.85}
                  fill={isActive && label === 'Watchlist' ? 'currentColor' : 'none'}
                />
                <span
                  className={cn(
                    'max-w-full truncate text-[10px] leading-none',
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
