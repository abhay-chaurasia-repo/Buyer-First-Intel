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

export type { CatchUpSurface }

const surfaceMeta: Record<
  CatchUpSurface,
  { title: string; Icon: LucideIcon }
> = {
  'county-facts': {
    title: "County's Fact",
    Icon: FileText,
  },
  'sales-history': {
    title: 'Sales History',
    Icon: History,
  },
  'tax-history': {
    title: 'Tax History',
    Icon: Receipt,
  },
  'verified-visits': {
    title: 'Verified Visits',
    Icon: ShieldCheck,
  },
  'buyer-insights': {
    title: 'Buyer Community Insights',
    Icon: Users,
  },
  schools: {
    title: 'Schools Associated',
    Icon: School,
  },
}

function stripHash(value: string) {
  return value.replace(/^#+/, '').replaceAll('#', '')
}

function DetailSection({ card }: { card: CatchUpCard }) {
  return (
    <article
      className="animate-bfi-rise rounded-2xl border border-line bg-paper-elevated p-3 shadow-search"
      data-testid={`detail-section-${card.id}`}
    >
      <div className="px-1 py-1">
        <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-saffron-deep uppercase">
          {stripHash(card.type.replaceAll('_', ' '))}
        </p>
        <h3 className="mt-1 font-display text-[1.05rem] font-semibold leading-snug tracking-tight text-ink">
          {stripHash(card.headline)}
        </h3>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-muted">
          {stripHash(card.preview)}
        </p>
      </div>

      {card.fields && card.fields.length > 0 ? (
        <div className="mt-2 space-y-2">
          {card.fields.map((field) => (
            <div
              key={`${field.label}-${field.value}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-3 py-2.5"
            >
              <span className="text-[12px] text-ink-faint">{stripHash(field.label)}</span>
              <span className="text-right text-[13px] font-semibold text-ink">
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
      className="animate-bfi-fade fixed inset-0 z-[60] flex justify-center bg-transparent"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
      data-testid="catchup-flow"
      data-surface={surface}
    >
      {/* Match landing page wash */}
      <div className="relative flex h-dvh w-full max-w-lg flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bfi-grid-wash opacity-80" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 110% 70% at 50% -15%, #e8d4d5 0%, transparent 55%), radial-gradient(ellipse 80% 50% at 100% 20%, #f3e8e8 0%, transparent 45%), linear-gradient(180deg, #f7f0f0 0%, #efe4e4 45%, #e4d4d5 100%)',
          }}
          aria-hidden
        />

        <header className="relative z-10 shrink-0 safe-area-pt">
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-paper-elevated text-ink shadow-search transition-colors hover:border-saffron/40 touch-manipulation"
              aria-label="Back"
              data-testid="button-back-detail"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.35)]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                  BFI
                </p>
                <h2
                  id="detail-title"
                  className="truncate font-display text-[15px] font-semibold tracking-tight text-ink"
                >
                  {meta.title}
                </h2>
              </div>
            </div>

            <span className="rounded-full border border-saffron/25 bg-saffron-soft/90 px-2.5 py-1 text-[10px] font-medium text-saffron-deep">
              Buyer-only
            </span>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="animate-bfi-rise mx-auto max-w-md pb-2 pt-2 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {meta.title}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[0.95rem] leading-relaxed text-ink-muted">
              Public-record diligence details for this property.
            </p>
          </div>

          {items.length > 0 ? (
            <div className="mx-auto mt-5 max-w-md space-y-3">
              {items.map((card, index) => (
                <div key={card.id} style={{ animationDelay: `${index * 40}ms` }}>
                  <DetailSection card={card} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm text-ink-muted">No details available for this section yet.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-xl bg-saffron px-5 text-sm font-semibold text-white shadow-[0_6px_14px_rgb(232_145_58/0.35)] touch-manipulation"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          )}

          <p className="mx-auto mt-8 max-w-md pb-2 text-center text-sm text-ink-faint">
            No MLS. No prices. County records first.
          </p>
        </div>
      </div>
    </div>
  )
}
