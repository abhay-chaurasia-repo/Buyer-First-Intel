import {
  PLUS_LABEL_SHORT,
  PLUS_WATCH_LEGEND_INTRO,
  WATCH_LABEL_SHORT,
} from '@/data/buyerCommunityLabels'
import { cn } from '@/lib/utils'

type PlusWatchLegendProps = {
  /** compact = chips + one-line each; full = intro + explained rows */
  variant?: 'compact' | 'full'
  className?: string
  showIntro?: boolean
}

/**
 * Explains Plus vs Watch wherever community labels appear.
 * Matches the Buyer Community header key.
 */
export function PlusWatchLegend({
  variant = 'full',
  className,
  showIntro = variant === 'full',
}: PlusWatchLegendProps) {
  const compact = variant === 'compact'

  return (
    <div
      className={cn(compact ? 'space-y-1.5' : 'space-y-2', className)}
      data-testid="plus-watch-legend"
      data-variant={variant}
    >
      {showIntro ? (
        <p className={cn('leading-snug text-night-muted', compact ? 'text-[10px]' : 'text-[12px]')}>
          {PLUS_WATCH_LEGEND_INTRO}
        </p>
      ) : null}

      <div className={cn('space-y-1.5', compact && 'space-y-1')}>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-md bg-saffron/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-saffron-glow">
            Plus
          </span>
          <p
            className={cn(
              'min-w-0 leading-snug text-night-ink',
              compact ? 'text-[10px]' : 'text-[12px]',
            )}
          >
            = {PLUS_LABEL_SHORT}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-md bg-night-ink/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-night-muted">
            Watch
          </span>
          <p
            className={cn(
              'min-w-0 leading-snug text-night-ink',
              compact ? 'text-[10px]' : 'text-[12px]',
            )}
          >
            = {WATCH_LABEL_SHORT}
          </p>
        </div>
      </div>
    </div>
  )
}
