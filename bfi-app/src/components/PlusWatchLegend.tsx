import {
  PLUS_LABEL_SHORT,
  PLUS_WATCH_LEGEND_INTRO,
  WATCH_LABEL_SHORT,
  type BuyerLabelTone,
} from '@/data/buyerCommunityLabels'
import { cn } from '@/lib/utils'

/** Shared chip styles — Plus (teal) / Watch (coral), not brand saffron.
 * Fixed min-width so meanings/sentences start on the same vertical line.
 */
export function plusWatchChipClass(tone: BuyerLabelTone | 'plus' | 'watch' | 'positive' | 'negative') {
  const isPlus = tone === 'plus' || tone === 'positive'
  return cn(
    'inline-flex min-w-[3.4rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
    isPlus ? 'bg-plus-soft text-plus-glow' : 'bg-watch-soft text-watch-glow',
  )
}

export function plusWatchTextClass(tone: BuyerLabelTone | 'plus' | 'watch' | 'positive' | 'negative') {
  const isPlus = tone === 'plus' || tone === 'positive'
  return isPlus ? 'text-plus-glow' : 'text-watch-glow'
}

type PlusWatchLegendProps = {
  /** compact = chips + one-line each; full = intro + explained rows */
  variant?: 'compact' | 'full'
  className?: string
  showIntro?: boolean
}

/**
 * Explains Plus vs Watch wherever community labels appear.
 * Label column is fixed-width so meanings start on the same vertical line.
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

      <div className={cn('grid gap-y-1.5', compact && 'gap-y-1')} style={{ gridTemplateColumns: '3.4rem 1fr' }}>
        <span className={cn('mt-0.5 justify-self-start', plusWatchChipClass('plus'))}>Plus</span>
        <p
          className={cn(
            'min-w-0 leading-snug text-night-ink',
            compact ? 'text-[10px]' : 'text-[12px]',
          )}
        >
          {PLUS_LABEL_SHORT}
        </p>

        <span className={cn('mt-0.5 justify-self-start', plusWatchChipClass('watch'))}>Watch</span>
        <p
          className={cn(
            'min-w-0 leading-snug text-night-ink',
            compact ? 'text-[10px]' : 'text-[12px]',
          )}
        >
          {WATCH_LABEL_SHORT}
        </p>
      </div>
    </div>
  )
}
