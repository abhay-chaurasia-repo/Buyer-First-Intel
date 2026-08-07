import {
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
import { cn } from '@/lib/utils'

export type { CatchUpSurface }

const surfaceMeta: Record<
  CatchUpSurface,
  { title: string; Icon: LucideIcon; accent: string; iconWrap: string }
> = {
  'county-facts': {
    title: "County's Fact",
    Icon: FileText,
    accent: 'text-saffron-glow',
    iconWrap: 'bg-saffron/25 text-saffron-glow',
  },
  'sales-history': {
    title: 'Sales History',
    Icon: History,
    accent: 'text-saffron-glow',
    iconWrap: 'bg-saffron-bright/25 text-saffron-glow',
  },
  'tax-history': {
    title: 'Tax History',
    Icon: Receipt,
    accent: 'text-saffron-glow',
    iconWrap: 'bg-saffron/20 text-saffron-glow',
  },
  'verified-visits': {
    title: 'Verified Visits',
    Icon: ShieldCheck,
    accent: 'text-saffron-glow',
    iconWrap: 'bg-night-ink/15 text-saffron-glow',
  },
  'buyer-insights': {
    title: 'Buyer Community Insights',
    Icon: Users,
    accent: 'text-saffron-glow',
    iconWrap: 'bg-saffron/25 text-saffron-glow',
  },
  schools: {
    title: 'Schools Associated',
    Icon: School,
    accent: 'text-saffron-glow',
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
        <p className="text-[11px] font-semibold tracking-[0.14em] text-saffron-glow uppercase">
          {stripHash(card.type.replaceAll('_', ' '))}
        </p>
        <h3 className="mt-1 text-[15px] font-bold leading-snug text-night-ink">
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

export function CatchUpFlow({ surface, response, onClose }: CatchUpFlowProps) {
  const meta = surfaceMeta[surface]
  const Icon = meta.Icon
  const items = response.items

  return (
    <div
      className="animate-bfi-fade fixed inset-0 z-[60] flex justify-center bfi-night-wash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
      data-testid="catchup-flow"
      data-surface={surface}
    >
      <div className="flex h-dvh w-full max-w-lg flex-col">
        <header className="shrink-0 border-b border-night-line bg-coastal/95 safe-area-pt backdrop-blur-md">
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-1 px-2 py-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-ink transition-colors hover:bg-night-ink/10 touch-manipulation"
              aria-label="Back"
              data-testid="button-back-detail"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
            </button>

            <div className="flex min-w-0 items-center justify-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  meta.iconWrap,
                )}
              >
                <Icon className={cn('h-4 w-4', meta.accent)} />
              </span>
              <h2
                id="detail-title"
                className="truncate text-center text-[16px] font-bold text-night-ink"
              >
                {meta.title}
              </h2>
            </div>

            {/* Spacer keeps title centered opposite the back button */}
            <span aria-hidden className="min-h-11 min-w-11" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-full bg-saffron px-5 text-sm font-semibold text-white touch-manipulation"
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
