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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper-elevated/95 shadow-shell backdrop-blur-md safe-area-pb"
      aria-label="Primary"
      data-testid="nav-bottom"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-3">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors touch-manipulation',
                isActive ? 'text-action' : 'text-ink-faint hover:text-ink-muted',
              )
            }
            data-testid={`nav-${label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn('text-[11px] font-semibold tracking-wide', isActive && 'font-bold')}>
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
