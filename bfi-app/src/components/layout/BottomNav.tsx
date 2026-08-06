import { NavLink } from 'react-router-dom'
import { ClipboardCheck, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Search, label: 'Search', end: true },
  { to: '/watchlist', icon: Star, label: 'Watchlist', end: false },
  { to: '/audit', icon: ClipboardCheck, label: 'Audit', end: false },
] as const

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-night-line bg-night safe-area-pb"
      aria-label="Primary"
      data-testid="nav-bottom"
    >
      <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-2 transition-colors touch-manipulation',
                isActive ? 'text-saffron-bright' : 'text-night-muted hover:text-saffron-glow',
              )
            }
            data-testid={`nav-${label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.35 : 1.85}
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
