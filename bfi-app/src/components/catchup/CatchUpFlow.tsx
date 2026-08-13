import { useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  FileText,
  History,
  Receipt,
  School,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  type CatchUpApiResponse,
  type CatchUpCard,
  type CatchUpSurface,
} from '@/data/catchUpApi'
import { BUYER_COMMUNITY_LABELS } from '@/data/buyerCommunityLabels'
import { PlusWatchLegend } from '@/components/PlusWatchLegend'
import { BuyerCommunityPanel } from '@/components/catchup/BuyerCommunityPanel'
import { RemoteInsightVote } from '@/components/catchup/RemoteInsightVote'
import { VerifiedVisitsPanel } from '@/components/catchup/VerifiedVisitsPanel'
import type { MockProperty } from '@/data/mockProperty'
import { getVerifiedVisitsBundle } from '@/data/verifiedVisits'
import { cn } from '@/lib/utils'

export type { CatchUpSurface }

const surfaceMeta: Record<
  CatchUpSurface,
  { title: string; Icon: LucideIcon; iconWrap: string; blurb: string }
> = {
  'county-facts': {
    title: "County's Fact",
    Icon: FileText,
    iconWrap: 'bg-saffron/25 text-saffron-glow',
    blurb: 'County records and living-area facts for this address',
  },
  'sales-history': {
    title: 'Sales History',
    Icon: History,
    iconWrap: 'bg-saffron-bright/25 text-saffron-glow',
    blurb: 'Recorded transfers and sale comps for this address',
  },
  'tax-history': {
    title: 'Tax History',
    Icon: Receipt,
    iconWrap: 'bg-saffron/20 text-saffron-glow',
    blurb: 'Assessed value and tax bill history',
  },
  'verified-visits': {
    title: 'Verified Visits',
    Icon: ShieldCheck,
    iconWrap: 'bg-night-ink/15 text-saffron-glow',
    blurb: 'Dated GPS presence — Plus/Watch labels appear when a visit has labels',
  },
  'buyer-insights': {
    title: 'Buyer Community',
    Icon: Users,
    iconWrap: 'bg-saffron/25 text-saffron-glow',
    blurb: 'Fixed Plus & Watch labels — on-site votes after GPS Verify (size labels can be remote)',
  },
  schools: {
    title: 'Schools',
    Icon: School,
    iconWrap: 'bg-saffron-bright/20 text-saffron-glow',
    blurb: 'Schools associated with this address',
  },
}

function stripHash(value: string) {
  return value.replace(/^#+/, '').replaceAll('#', '')
}

function DetailSection({ card, propertyId }: { card: CatchUpCard; propertyId: string }) {
  const [open, setOpen] = useState(true)
  const fieldCount = card.fields?.length ?? 0
  const hasFields = fieldCount > 0

  return (
    <section data-testid={`detail-section-${card.id}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
        aria-expanded={open}
        data-testid={`button-toggle-section-${card.id}`}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 text-saffron-glow transition-transform',
            !open && '-rotate-90',
          )}
        />
        <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          {stripHash(card.headline)}
        </span>
        {fieldCount > 0 ? (
          <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
            {fieldCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-white/25 bg-transparent p-2">
          {/* Preview is a duplicate of field rows when fields exist — show only as fallback. */}
          {!hasFields && card.preview ? (
            <p className="px-2 py-2 text-sm text-night-ink">{stripHash(card.preview)}</p>
          ) : null}

          {hasFields
            ? card.fields!.map((field) => (
                <div
                  key={`${field.label}-${field.value}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 py-2"
                  data-testid={`field-${card.id}-${field.label}`}
                >
                  <span className="text-[13px] text-night-muted">{stripHash(field.label)}</span>
                  <span className="text-right text-sm font-semibold text-night-ink">
                    {stripHash(field.value)}
                  </span>
                </div>
              ))
            : null}

          {card.insightLabelIds?.length || card.insightLabelId ? (
            <RemoteInsightVote
              propertyId={propertyId}
              labelIds={
                card.insightLabelIds?.length
                  ? card.insightLabelIds
                  : card.insightLabelId
                    ? [card.insightLabelId]
                    : []
              }
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

type CatchUpFlowProps = {
  surface: CatchUpSurface
  response: CatchUpApiResponse
  address: string
  propertyId: string
  property: MockProperty
  onClose: () => void
}

/**
 * Tile interior that mirrors the post-search property page:
 * same top bar, collapsible history-style boxes, and AppShell bottom nav.
 */
export function CatchUpFlow({
  surface,
  response,
  address,
  propertyId,
  property,
  onClose,
}: CatchUpFlowProps) {
  const meta = surfaceMeta[surface]
  const items = response.items
  const isBuyerCommunity = surface === 'buyer-insights'
  const isVerifiedVisits = surface === 'verified-visits'
  const isCountyFacts = surface === 'county-facts'
  const headerCount = isBuyerCommunity
    ? BUYER_COMMUNITY_LABELS.length
    : isVerifiedVisits
      ? getVerifiedVisitsBundle(property).visits.length
      : items.length

  return (
    <div
      className="animate-bfi-fade flex min-h-0 flex-1 flex-col text-night-ink"
      role="region"
      aria-labelledby="detail-title"
      data-testid="catchup-flow"
      data-surface={surface}
    >
      {/* Tile drill-in: back + address only — Verify stays on the property page */}
      <header
        className="relative z-20 shrink-0 bfi-status-pad"
        data-testid="tile-detail-top-bar"
      >
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-3 pb-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-h-11 min-w-11 items-center justify-center self-center rounded-xl text-night-muted transition-colors hover:bg-night-ink/10 hover:text-saffron-glow touch-manipulation"
            aria-label="Back to property"
            data-testid="button-back-detail"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <h1
            id="detail-title"
            className="flex min-h-11 min-w-0 items-center justify-center text-center font-display text-[13px] font-semibold leading-snug tracking-tight text-balance text-saffron-glow sm:text-[15px]"
            data-testid="text-tile-address"
          >
            {address}
          </h1>

          <span className="h-11 w-11" aria-hidden />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-4">
        {/* County’s Fact: section headlines already name each box — skip redundant page title */}
        {!isCountyFacts ? (
          <section className="px-3 pt-4" data-testid="tile-section-header">
            <div className="px-2 py-1.5 text-center">
              <p className="font-display text-[13px] font-extrabold tracking-tight">
                <span className="bg-gradient-to-br from-saffron-glow via-saffron-bright to-saffron bg-clip-text text-transparent">
                  {meta.title}
                </span>
              </p>
              {isBuyerCommunity ? (
                <div
                  className="mt-2 rounded-xl border border-white/25 bg-transparent px-3 py-2.5 text-left"
                  data-testid="plus-watch-key"
                >
                  <PlusWatchLegend variant="full" showIntro={false} />
                </div>
              ) : (
                <p className="mt-0.5 text-[11px] text-saffron-glow">{meta.blurb}</p>
              )}
              <span className="mt-2 inline-flex rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
                {headerCount}
              </span>
            </div>
          </section>
        ) : null}

        {isBuyerCommunity ? (
          <BuyerCommunityPanel propertyId={propertyId} onRequestGpsVerify={onClose} />
        ) : isVerifiedVisits ? (
          <VerifiedVisitsPanel property={property} />
        ) : (
          <div className={cn('space-y-4 px-3', isCountyFacts ? 'mt-6 pt-1' : 'mt-3')}>
            {items.length > 0 ? (
              items.map((card) => (
                <DetailSection key={card.id} card={card} propertyId={propertyId} />
              ))
            ) : (
              <div className="rounded-2xl border border-white/25 bg-transparent p-4 text-center">
                <p className="text-sm text-night-muted">No details available for this section yet.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/25 bg-transparent px-4 text-sm font-semibold text-night-ink touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
