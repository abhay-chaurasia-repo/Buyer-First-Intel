import {
  ChevronLeft,
  Crosshair,
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
import { cn } from '@/lib/utils'

export type { CatchUpSurface }

const surfaceMeta: Record<
  CatchUpSurface,
  { title: string; Icon: LucideIcon; iconWrap: string }
> = {
  'county-facts': {
    title: "County's Fact",
    Icon: FileText,
    iconWrap: 'bg-saffron/25 text-saffron-glow',
  },
  'sales-history': {
    title: 'Sales History',
    Icon: History,
    iconWrap: 'bg-saffron-bright/25 text-saffron-glow',
  },
  'tax-history': {
    title: 'Tax History',
    Icon: Receipt,
    iconWrap: 'bg-saffron/20 text-saffron-glow',
  },
  'verified-visits': {
    title: 'Verified Visits',
    Icon: ShieldCheck,
    iconWrap: 'bg-night-ink/15 text-saffron-glow',
  },
  'buyer-insights': {
    title: 'Buyer Community Insights',
    Icon: Users,
    iconWrap: 'bg-saffron/25 text-saffron-glow',
  },
  schools: {
    title: 'Schools Associated',
    Icon: School,
    iconWrap: 'bg-saffron-bright/20 text-saffron-glow',
  },
}

function stripHash(value: string) {
  return value.replace(/^#+/, '').replaceAll('#', '')
}

function DetailSection({ card }: { card: CatchUpCard }) {
  return (
    <article
      className="rounded-2xl border border-night-line bg-coastal-deep/55 p-2 shadow-sm backdrop-blur-sm"
      data-testid={`detail-section-${card.id}`}
    >
      <div className="rounded-xl px-2 py-2">
        <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-saffron-glow uppercase">
          {stripHash(card.type.replaceAll('_', ' '))}
        </p>
        <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug tracking-tight text-night-ink">
          {stripHash(card.headline)}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-night-muted">
          {stripHash(card.preview)}
        </p>
      </div>

      {card.fields && card.fields.length > 0 ? (
        <div className="mt-1 space-y-1.5">
          {card.fields.map((field) => (
            <div
              key={`${field.label}-${field.value}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-night-line bg-coastal-deep/60 px-3 py-2.5"
            >
              <span className="text-[12px] text-night-faint">{stripHash(field.label)}</span>
              <span className="text-right text-[13px] font-semibold text-night-ink">
                {stripHash(field.value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

type CatchUpFlowProps = {
  surface: CatchUpSurface
  response: CatchUpApiResponse
  onClose: () => void
}

/**
 * Full-screen tile detail that matches the post-search property page
 * (Spiced Potpourri wash, history-style boxes) and sits under BottomNav.
 */
export function CatchUpFlow({ surface, response, onClose }: CatchUpFlowProps) {
  const meta = surfaceMeta[surface]
  const Icon = meta.Icon
  const items = response.items

  return (
    <div
      className="animate-bfi-fade fixed inset-x-0 top-0 bottom-0 z-40 flex justify-center bfi-night-wash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
      data-testid="catchup-flow"
      data-surface={surface}
    >
      <div className="mx-auto flex h-full w-full max-w-lg flex-col pb-[4.75rem] text-night-ink">
        {/* Same top-bar language as the searched property page */}
        <header
          className="sticky top-0 z-20 shrink-0 border-b border-night-line bg-coastal/90 backdrop-blur-md"
          data-testid="tile-detail-top-bar"
        >
          <div className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-night-ink/10 hover:text-saffron-glow touch-manipulation"
              aria-label="Back to property"
              data-testid="button-back-detail"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>

            <div className="flex min-w-0 items-center justify-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px]',
                  meta.iconWrap,
                )}
              >
                <Icon className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
              </span>
              <h1
                id="detail-title"
                className="truncate text-center font-display text-[15px] font-semibold tracking-tight text-night-ink"
              >
                {meta.title}
              </h1>
            </div>

            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-saffron/45 bg-saffron/20 px-3 text-xs font-bold tracking-wide text-saffron-glow transition-colors hover:bg-saffron/30 touch-manipulation"
              aria-label="GPS Verify"
              data-testid="badge-gps-verify-tile"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Verify
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((card) => (
                <DetailSection key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-night-muted">No details available for this section yet.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-xl border border-night-line bg-coastal-deep/55 px-4 text-sm font-semibold text-night-ink touch-manipulation"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
