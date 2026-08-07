import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ShieldCheck, ThumbsUp } from 'lucide-react'
import {
  BUYER_LABEL_CATEGORIES,
  BUYER_COMMUNITY_LABELS,
  type BuyerLabelCategoryId,
  type BuyerCommunityLabel,
} from '@/data/buyerCommunityLabels'
import {
  loadBuyerVerified,
  loadBuyerVoteState,
  persistBuyerVerified,
  persistBuyerVoteState,
  type BuyerVoteState,
} from '@/data/buyerCommunityStorage'
import { cn } from '@/lib/utils'

function voteCount(label: BuyerCommunityLabel, state: BuyerVoteState) {
  const boost = state.localBoosts[label.id] ?? 0
  return label.seedVotes + boost
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

  const sorted = useMemo(
    () =>
      [...labels].sort((a, b) => {
        const voteDiff = voteCount(b, voteState) - voteCount(a, voteState)
        if (voteDiff !== 0) return voteDiff
        // Prefer positive labels when votes tie — keeps the surface from reading all-caution
        if (a.tone !== b.tone) return a.tone === 'positive' ? -1 : 1
        return a.text.localeCompare(b.text)
      }),
    [labels, voteState],
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
        <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
          {title}
        </span>
        <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
          {labels.length}
        </span>
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-night-line bg-coastal-deep/55 p-2 shadow-sm backdrop-blur-sm">
          <p className="px-2 pb-1 text-[11px] text-night-faint">{blurb}</p>
          {sorted.map((label) => {
            const count = voteCount(label, voteState)
            const voted = voteState.myVotes.includes(label.id)
            return (
              <div
                key={label.id}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-2"
                data-testid={`buyer-label-${label.id}`}
              >
                <span
                  className={cn(
                    'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                    label.tone === 'positive'
                      ? 'bg-saffron/20 text-saffron-glow'
                      : 'bg-night-ink/12 text-night-muted',
                  )}
                  data-testid={`tone-${label.id}`}
                >
                  {label.tone === 'positive' ? 'Plus' : 'Watch'}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-night-ink">
                  {label.text}
                </span>
                <button
                  type="button"
                  disabled={!verified}
                  onClick={() => onToggleVote(label.id)}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors touch-manipulation',
                    voted
                      ? 'border-saffron/55 bg-saffron/25 text-saffron-glow'
                      : 'border-night-line bg-coastal-deep/60 text-night-muted hover:border-saffron/40 hover:text-saffron-glow',
                    !verified && 'cursor-not-allowed opacity-55 hover:border-night-line hover:text-night-muted',
                  )}
                  aria-pressed={voted}
                  aria-label={
                    verified
                      ? voted
                        ? `Remove upvote from ${label.text}`
                        : `Upvote ${label.text}`
                      : `Verify visit to upvote ${label.text}`
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
 * Buyer Community: fixed labels only. Verified visitors upvote what they observe.
 */
export function BuyerCommunityPanel({ propertyId }: BuyerCommunityPanelProps) {
  const [voteState, setVoteState] = useState<BuyerVoteState>(() => loadBuyerVoteState(propertyId))
  const [verified, setVerified] = useState(() => loadBuyerVerified(propertyId))

  useEffect(() => {
    setVoteState(loadBuyerVoteState(propertyId))
    setVerified(loadBuyerVerified(propertyId))
  }, [propertyId])

  const totalVotes = useMemo(
    () => BUYER_COMMUNITY_LABELS.reduce((sum, label) => sum + voteCount(label, voteState), 0),
    [voteState],
  )

  function handleConfirmVisit() {
    setVerified(true)
    persistBuyerVerified(propertyId, true)
  }

  function handleToggleVote(labelId: string) {
    if (!verified) return

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
    <div className="mt-3 space-y-4 px-3" data-testid="buyer-community-panel">
      <div className="rounded-2xl border border-night-line bg-coastal-deep/55 p-3 shadow-sm backdrop-blur-sm">
        <p className="text-[13px] leading-relaxed text-night-ink">
          Pre-set labels only — both upsides (Plus) and watch-outs (Watch). Verified visitors upvote
          what they observe on site.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-night-faint">
          <span>
            {BUYER_COMMUNITY_LABELS.length} labels · {totalVotes} community upvotes
          </span>
          <span className="rounded-md bg-saffron/20 px-1.5 py-0.5 font-bold text-saffron-glow">
            Plus {BUYER_COMMUNITY_LABELS.filter((l) => l.tone === 'positive').length}
          </span>
          <span className="rounded-md bg-night-ink/12 px-1.5 py-0.5 font-bold text-night-muted">
            Watch {BUYER_COMMUNITY_LABELS.filter((l) => l.tone === 'negative').length}
          </span>
          {voteState.myVotes.length > 0 ? (
            <span className="rounded-md bg-saffron/20 px-1.5 py-0.5 font-bold text-saffron-glow">
              You: {voteState.myVotes.length}
            </span>
          ) : null}
        </div>

        {verified ? (
          <p
            className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-saffron-glow"
            data-testid="text-verified-voter"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
            Visit verified — tap a label to upvote or remove your vote
          </p>
        ) : (
          <button
            type="button"
            onClick={handleConfirmVisit}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-saffron px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgb(232_145_58/0.3)] transition-colors hover:bg-saffron-deep touch-manipulation"
            data-testid="button-confirm-visit-to-vote"
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
            Confirm visit to unlock voting
          </button>
        )}
      </div>

      {BUYER_LABEL_CATEGORIES.map((category) => (
        <CategoryBlock
          key={category.id}
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
