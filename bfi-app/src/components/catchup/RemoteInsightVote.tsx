import { useEffect, useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import {
  labelById,
  labelRequiresVisit,
  type BuyerCommunityLabel,
} from '@/data/buyerCommunityLabels'
import {
  loadBuyerVerified,
  loadBuyerVoteState,
  persistBuyerVoteState,
  type BuyerVoteState,
} from '@/data/buyerCommunityStorage'
import { cn } from '@/lib/utils'

function voteCount(label: BuyerCommunityLabel, state: BuyerVoteState) {
  return label.seedVotes + (state.localBoosts[label.id] ?? 0)
}

type RemoteInsightVoteProps = {
  propertyId: string
  labelId: string
}

/**
 * Inline upvote for a catalog label — used in County Facts living area.
 * Labels with requiresVisit: false can be voted without an on-site visit.
 */
export function RemoteInsightVote({ propertyId, labelId }: RemoteInsightVoteProps) {
  const label = labelById(labelId)
  const [voteState, setVoteState] = useState<BuyerVoteState>(() => loadBuyerVoteState(propertyId))
  const [verified, setVerified] = useState(() => loadBuyerVerified(propertyId))

  useEffect(() => {
    setVoteState(loadBuyerVoteState(propertyId))
    setVerified(loadBuyerVerified(propertyId))
  }, [propertyId])

  if (!label) return null

  const canVote = verified || !labelRequiresVisit(label)
  const voted = voteState.myVotes.includes(label.id)
  const count = voteCount(label, voteState)

  function handleToggle() {
    if (!canVote) return
    setVoteState((prev) => {
      const already = prev.myVotes.includes(label!.id)
      const myVotes = already
        ? prev.myVotes.filter((id) => id !== label!.id)
        : [...prev.myVotes, label!.id]
      const currentBoost = prev.localBoosts[label!.id] ?? 0
      const next = {
        myVotes,
        localBoosts: {
          ...prev.localBoosts,
          [label!.id]: already ? currentBoost - 1 : currentBoost + 1,
        },
      }
      persistBuyerVoteState(propertyId, next)
      return next
    })
  }

  return (
    <div
      className="mt-1.5 rounded-xl border border-saffron/35 bg-saffron/10 px-2.5 py-2"
      data-testid={`remote-insight-${label.id}`}
    >
      <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
        Remote insight · no visit needed
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
            label.tone === 'positive'
              ? 'bg-saffron/20 text-saffron-glow'
              : 'bg-night-ink/12 text-night-muted',
          )}
        >
          {label.tone === 'positive' ? 'Plus' : 'Watch'}
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-snug text-night-ink">{label.text}</span>
        <button
          type="button"
          disabled={!canVote}
          onClick={handleToggle}
          className={cn(
            'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold touch-manipulation',
            voted
              ? 'border-saffron/55 bg-saffron/25 text-saffron-glow'
              : 'border-white/25 bg-transparent text-night-muted hover:border-saffron/40 hover:text-saffron-glow',
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
      <p className="mt-1.5 text-[10px] text-night-faint">
        Compare county sqft with the published size on Zillow or Redfin, then upvote if it looks off.
        Same label appears in Buyer Community.
      </p>
    </div>
  )
}
