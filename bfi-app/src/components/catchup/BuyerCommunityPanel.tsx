import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ThumbsUp } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { plusWatchChipClass } from '@/components/PlusWatchLegend'
import {
  BUYER_LABEL_CATEGORIES,
  BUYER_COMMUNITY_LABELS,
  labelRequiresVisit,
  type BuyerLabelCategoryId,
  type BuyerCommunityLabel,
} from '@/data/buyerCommunityLabels'
import {
  loadBuyerVerified,
  loadBuyerVoteState,
  persistBuyerVoteState,
  type BuyerVoteState,
} from '@/data/buyerCommunityStorage'
import { formatPresenceDay, latestPresenceEvent } from '@/data/ownerScope'
import { cn } from '@/lib/utils'

function voteCount(label: BuyerCommunityLabel, state: BuyerVoteState) {
  const boost = state.localBoosts[label.id] ?? 0
  return label.seedVotes + boost
}

function sortLabelsByVotes(labels: BuyerCommunityLabel[], voteState: BuyerVoteState) {
  return [...labels].sort((a, b) => {
    const voteDiff = voteCount(b, voteState) - voteCount(a, voteState)
    if (voteDiff !== 0) return voteDiff
    if (a.tone !== b.tone) return a.tone === 'positive' ? -1 : 1
    return a.text.localeCompare(b.text)
  })
}

function labelsInFrozenOrder(labels: BuyerCommunityLabel[], frozenIds: string[]) {
  const byId = new Map(labels.map((label) => [label.id, label]))
  const seen = new Set<string>()
  const ordered: BuyerCommunityLabel[] = []
  for (const id of frozenIds) {
    const label = byId.get(id)
    if (!label) continue
    ordered.push(label)
    seen.add(id)
  }
  for (const label of labels) {
    if (!seen.has(label.id)) ordered.push(label)
  }
  return ordered
}

function CategoryBlock({
  categoryId,
  title,
  blurb,
  labels,
  voteState,
  verified,
  onToggleVote,
}: {
  categoryId: BuyerLabelCategoryId
  title: string
  blurb: string
  labels: BuyerCommunityLabel[]
  voteState: BuyerVoteState
  verified: boolean
  onToggleVote: (labelId: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [frozenIds] = useState(() => sortLabelsByVotes(labels, voteState).map((label) => label.id))
  const displayLabels = useMemo(
    () => labelsInFrozenOrder(labels, frozenIds),
    [labels, frozenIds],
  )

  return (
    <section data-testid={`buyer-category-${categoryId}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
        aria-expanded={open}
        data-testid={`button-toggle-buyer-category-${categoryId}`}
      >
        <ChevronDown
          className={cn('h-4 w-4 text-saffron-glow transition-transform', !open && '-rotate-90')}
        />
        <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          {title}
        </span>
        <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
          {labels.length}
        </span>
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-white/25 bg-transparent p-2">
          <p className="px-2 pb-1 text-[11px] text-night-faint">{blurb}</p>
          {displayLabels.map((label) => {
            const count = voteCount(label, voteState)
            const voted = voteState.myVotes.includes(label.id)
            const needsVisit = labelRequiresVisit(label)
            const canVote = verified || !needsVisit
            return (
              <div
                key={label.id}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-2"
                data-testid={`buyer-label-${label.id}`}
              >
                <span
                  className={cn('shrink-0', plusWatchChipClass(label.tone))}
                  data-testid={`tone-${label.id}`}
                >
                  {label.tone === 'positive' ? 'Plus' : 'Watch'}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-night-ink">
                  {label.text}
                  {!needsVisit ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-saffron-glow/90">
                      Remote · no visit needed
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={!canVote}
                  onClick={() => onToggleVote(label.id)}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors touch-manipulation',
                    voted
                      ? 'border-saffron/55 bg-saffron/25 text-saffron-glow'
                      : 'border-white/25 bg-transparent text-night-muted hover:border-saffron/40 hover:text-saffron-glow',
                    !canVote &&
                      'cursor-not-allowed opacity-55 hover:border-white/20 hover:text-night-muted',
                  )}
                  aria-pressed={voted}
                  aria-label={
                    canVote
                      ? voted
                        ? `Remove upvote from ${label.text}`
                        : `Upvote ${label.text}`
                      : `Confirm presence on site to upvote ${label.text}`
                  }
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
      ) : null}
    </section>
  )
}

type BuyerCommunityPanelProps = {
  propertyId: string
}

/**
 * Buyer Community: fixed labels only. On-site votes require Presence Confirmed
 * (device within ~100m of the pin — not a manual check-in or proof of a tour).
 */
export function BuyerCommunityPanel({ propertyId }: BuyerCommunityPanelProps) {
  const { ownerId } = useAuth()
  const [voteState, setVoteState] = useState<BuyerVoteState>(() => loadBuyerVoteState(propertyId))
  const [verified, setVerified] = useState(() => loadBuyerVerified(propertyId))
  const latestPresence = latestPresenceEvent(propertyId)

  useEffect(() => {
    setVoteState(loadBuyerVoteState(propertyId))
    setVerified(loadBuyerVerified(propertyId))
  }, [propertyId, ownerId])

  useEffect(() => {
    const refresh = () => setVerified(loadBuyerVerified(propertyId))
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [propertyId])

  function handleToggleVote(labelId: string) {
    const label = BUYER_COMMUNITY_LABELS.find((entry) => entry.id === labelId)
    if (!label) return
    if (labelRequiresVisit(label) && !verified) return

    setVoteState((prev) => {
      const already = prev.myVotes.includes(labelId)
      const myVotes = already
        ? prev.myVotes.filter((id) => id !== labelId)
        : [...prev.myVotes, labelId]
      const currentBoost = prev.localBoosts[labelId] ?? 0
      const localBoosts = {
        ...prev.localBoosts,
        [labelId]: already ? currentBoost - 1 : currentBoost + 1,
      }
      const next = { myVotes, localBoosts }
      persistBuyerVoteState(propertyId, next)
      return next
    })
  }

  return (
    <div className="mt-6 space-y-4 px-3 pt-1" data-testid="buyer-community-panel">
      <div
        className="flex min-h-11 items-center justify-center px-2 py-1.5"
        data-testid="buyer-community-page-title"
      >
        <h2 className="text-center font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          Buyer Community Insights
        </h2>
      </div>

      {latestPresence ? (
        <p
          className="rounded-xl border border-white/20 bg-transparent px-3 py-2 text-[12px] leading-snug text-night-ink"
          data-testid="buyer-community-window-note"
        >
          {verified
            ? `You confirmed presence on ${formatPresenceDay(latestPresence.confirmedAt)}. That date stays. You can add or update on-site labels for 2 weeks — including after you already shared.`
            : `You confirmed presence on ${formatPresenceDay(latestPresence.confirmedAt)}. That date stays on the log. The 2-week labeling window has ended — Confirm on site to add more.`}
        </p>
      ) : null}

      {BUYER_LABEL_CATEGORIES.map((category) => (
        <CategoryBlock
          key={`${propertyId}-${ownerId}-${category.id}`}
          categoryId={category.id}
          title={category.title}
          blurb={category.blurb}
          labels={BUYER_COMMUNITY_LABELS.filter((label) => label.categoryId === category.id)}
          voteState={voteState}
          verified={verified}
          onToggleVote={handleToggleVote}
        />
      ))}
    </div>
  )
}
