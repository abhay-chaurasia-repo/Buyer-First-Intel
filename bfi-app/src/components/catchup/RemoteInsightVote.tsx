import { useEffect, useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { PlusWatchLegend } from '@/components/PlusWatchLegend'
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
  /** One or more catalog label ids shown as remote insights */
  labelIds: string[]
}

/**
 * Inline upvote for catalog labels — used in County Facts living area.
 * Labels with requiresVisit: false can be voted without an on-site visit.
 * Within this group, choosing one clears the others (Plus vs Watch).
 */
export function RemoteInsightVote({ propertyId, labelIds }: RemoteInsightVoteProps) {
  const { ownerId } = useAuth()
  const labels = labelIds
    .map((id) => labelById(id))
    .filter((label): label is BuyerCommunityLabel => Boolean(label))

  const [voteState, setVoteState] = useState<BuyerVoteState>(() => loadBuyerVoteState(propertyId))
  const [verified, setVerified] = useState(() => loadBuyerVerified(propertyId))

  useEffect(() => {
    setVoteState(loadBuyerVoteState(propertyId))
    setVerified(loadBuyerVerified(propertyId))
  }, [propertyId, ownerId])

  if (labels.length === 0) return null

  const groupIds = new Set(labels.map((label) => label.id))

  function handleToggle(label: BuyerCommunityLabel) {
    const canVote = verified || !labelRequiresVisit(label)
    if (!canVote) return

    setVoteState((prev) => {
      const already = prev.myVotes.includes(label.id)
      let myVotes = [...prev.myVotes]
      const localBoosts = { ...prev.localBoosts }

      if (already) {
        myVotes = myVotes.filter((id) => id !== label.id)
        localBoosts[label.id] = (localBoosts[label.id] ?? 0) - 1
      } else {
        // Mutual exclusion inside this remote pair/group
        for (const otherId of groupIds) {
          if (otherId === label.id) continue
          if (!myVotes.includes(otherId)) continue
          myVotes = myVotes.filter((id) => id !== otherId)
          localBoosts[otherId] = (localBoosts[otherId] ?? 0) - 1
        }
        myVotes = [...myVotes, label.id]
        localBoosts[label.id] = (localBoosts[label.id] ?? 0) + 1
      }

      const next = { myVotes, localBoosts }
      persistBuyerVoteState(propertyId, next)
      return next
    })
  }

  return (
    <div
      className="mt-1.5 rounded-xl border border-saffron/35 bg-saffron/10 px-2.5 py-2"
      data-testid="remote-insight-group"
    >
      <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
        Remote insight · no visit needed
      </p>
      <p className="mt-1 text-[10px] text-night-faint">
        Compare county sqft with the published size on Zillow or Redfin, then upvote one.
      </p>
      <PlusWatchLegend variant="compact" showIntro={false} className="mt-1.5" />
      <div className="mt-1.5 space-y-1">
        {labels.map((label) => {
          const canVote = verified || !labelRequiresVisit(label)
          const voted = voteState.myVotes.includes(label.id)
          const count = voteCount(label, voteState)
          return (
            <div
              key={label.id}
              className="flex items-center gap-2 rounded-lg px-1 py-1"
              data-testid={`remote-insight-${label.id}`}
            >
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
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-night-ink">
                {label.text}
              </span>
              <button
                type="button"
                disabled={!canVote}
                onClick={() => handleToggle(label)}
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
          )
        })}
      </div>
    </div>
  )
}
