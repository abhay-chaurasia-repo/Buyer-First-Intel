import { ThumbsUp } from 'lucide-react'
import { plusWatchChipClass } from '@/components/PlusWatchLegend'
import {
  labelById,
  labelRequiresVisit,
  type BuyerCommunityLabel,
} from '@/data/buyerCommunityLabels'
import { useCommunityVotes } from '@/lib/useCommunityVotes'
import { cn } from '@/lib/utils'

type RemoteInsightVoteProps = {
  propertyId: string
  /** One or more catalog label ids shown as remote insights */
  labelIds: string[]
}

/**
 * Inline upvote for catalog labels — used in County Facts living area.
 * Gross living area (requiresVisit: false) can be voted without Confirm.
 * Flag only the Watch — no vote means buyers treat listing size as matching.
 */
export function RemoteInsightVote({ propertyId, labelIds }: RemoteInsightVoteProps) {
  const labels = labelIds
    .map((id) => labelById(id))
    .filter((label): label is BuyerCommunityLabel => Boolean(label))

  const { voteState, onSiteOpen, voteCount, toggleVote } = useCommunityVotes(propertyId)

  if (labels.length === 0) return null

  return (
    <div
      className="mt-2 rounded-xl border border-white/15 bg-night-elevated/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgb(246_231_200_/0.06)]"
      data-testid="remote-insight-group"
    >
      <p className="text-[10px] font-bold tracking-[0.14em] text-saffron-glow/90 uppercase">
        Remote insight · no visit needed
      </p>
      <p className="mt-1 text-[10px] leading-snug text-night-faint">
        Compare Gross living area to Zillow/Redfin. Flag only if it looks overstated. No vote means
        buyers treat it as a match. Counts are from signed-in buyers, not this phone only.
      </p>
      <div className="mt-2 space-y-1">
        {labels.map((label) => {
          const canVote = onSiteOpen || !labelRequiresVisit(label)
          const voted = voteState.myVotes.includes(label.id)
          const count = voteCount(label.id)
          return (
            <div
              key={label.id}
              className="flex items-center gap-2 rounded-lg px-0.5 py-1"
              data-testid={`remote-insight-${label.id}`}
            >
              <span className={cn('shrink-0', plusWatchChipClass(label.tone))}>
                {label.tone === 'positive' ? 'Plus' : 'Watch'}
              </span>
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-night-ink">
                {label.text}
              </span>
              <button
                type="button"
                disabled={!canVote}
                onClick={() => void toggleVote(label.id)}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold touch-manipulation',
                  voted
                    ? 'border-saffron/50 bg-saffron/20 text-saffron-glow'
                    : 'border-white/20 bg-white/[0.04] text-night-muted hover:border-white/35 hover:text-saffron-glow',
                  !canVote && 'cursor-not-allowed opacity-55',
                )}
                aria-pressed={voted}
                data-testid={`button-upvote-${label.id}`}
              >
                <ThumbsUp
                  className="h-3.5 w-3.5"
                  strokeWidth={2.25}
                  fill={voted ? 'currentColor' : 'none'}
                />
                <span className="tabular-nums">{count}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
