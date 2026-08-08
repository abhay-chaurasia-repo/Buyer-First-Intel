import { useEffect, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  ChevronDown,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react'
import type { MockProperty } from '@/data/mockProperty'
import {
  formatVisitDate,
  formatVisitTime,
  getVerifiedVisitsBundle,
  labelTextById,
  visitSummary,
  type VisitPatternSignal,
  type VerifiedVisit,
} from '@/data/verifiedVisits'
import { labelToneById } from '@/data/buyerCommunityLabels'
import { cn } from '@/lib/utils'

function toneClass(tone: VisitPatternSignal['tone']) {
  if (tone === 'positive') return 'text-saffron-glow'
  if (tone === 'caution') return 'text-saffron-bright'
  return 'text-night-muted'
}

function VisitRow({ visit }: { visit: VerifiedVisit }) {
  const labels = visit.communityLabelIds.map(labelTextById)
  const isYou = visit.visitorLabel === 'You'

  return (
    <article
      className="rounded-xl border border-white/25 bg-transparent px-3 py-2.5"
      data-testid={`visit-row-${visit.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-night-ink">
            {formatVisitDate(visit.visitedAt)}
          </p>
          <p className="mt-0.5 text-[13px] text-night-muted">
            {formatVisitTime(visit.visitedAt)}
            <span className="text-night-faint"> · {visit.visitorLabel}</span>
          </p>
        </div>
        {labels.length > 0 ? (
          <span className="shrink-0 rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow uppercase tracking-wide">
            {labels.length} label{labels.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="shrink-0 rounded-md bg-night-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-night-faint uppercase tracking-wide">
            Presence only
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-night-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-saffron-glow" aria-hidden />
          {visit.distanceMeters}m from pin · ±{visit.accuracyMeters}m
        </span>
        <span>{visit.platform}</span>
        <span className={visit.withinRadius ? 'text-saffron-glow' : 'text-night-faint'}>
          {visit.withinRadius ? 'Inside 100m' : 'Outside radius'}
        </span>
      </div>

      {labels.length > 0 ? (
        <div className="mt-2.5" data-testid={`visit-labels-${visit.id}`}>
          <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold tracking-wide text-night-faint uppercase">
            <Tag className="h-3 w-3 text-saffron-glow" aria-hidden />
            {isYou ? 'Your Buyer Community labels' : 'Buyer Community labels'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visit.communityLabelIds.map((labelId) => {
              const text = labelTextById(labelId)
              const tone = labelToneById(labelId)
              return (
                <span
                  key={labelId}
                  className={cn(
                    'rounded-lg border px-2 py-1 text-[11px] font-medium',
                    tone === 'positive'
                      ? 'border-saffron/35 bg-saffron/15 text-saffron-glow'
                      : 'border-white/20 bg-night-ink/10 text-night-muted',
                  )}
                >
                  {text}
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-night-faint">
          No community labels from this visitor yet.
        </p>
      )}
    </article>
  )
}

function CollapsibleSection({
  id,
  title,
  count,
  blurb,
  children,
  defaultOpen = true,
}: {
  id: string
  title: string
  count?: number
  blurb?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section data-testid={`verified-section-${id}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
        aria-expanded={open}
        data-testid={`button-toggle-verified-${id}`}
      >
        <ChevronDown
          className={cn('h-4 w-4 text-saffron-glow transition-transform', !open && '-rotate-90')}
        />
        <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          {title}
        </span>
        {typeof count === 'number' ? (
          <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-1 space-y-2 rounded-2xl border border-white/25 bg-transparent p-2">
          {blurb ? <p className="px-2 pb-1 text-[11px] text-night-faint">{blurb}</p> : null}
          {children}
        </div>
      ) : null}
    </section>
  )
}

type VerifiedVisitsPanelProps = {
  property: MockProperty
}

/**
 * Verified Visits: dated GPS presence log. Buyers judge listing timing themselves.
 * Community labels from Buyer Community appear on each visitor who labelled.
 */
export function VerifiedVisitsPanel({ property }: VerifiedVisitsPanelProps) {
  const [tick, setTick] = useState(0)

  // Re-read live "You" labels when returning from Buyer Community in the same session
  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const bundle = getVerifiedVisitsBundle(property)
  // tick forces refresh after storage changes when remounting / focusing
  void tick
  const summary = visitSummary(bundle)
  const sortedVisits = [...bundle.visits].sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  )

  return (
    <div className="mt-3 space-y-4 px-3" data-testid="verified-visits-panel">
      <div className="rounded-2xl border border-white/25 bg-transparent p-3">
        <p className="text-[13px] leading-relaxed text-night-ink">
          Each row is a GPS presence check within {bundle.radiusMeters}m — with date and time so you
          can judge the pattern yourself. If a visitor also labelled in Buyer Community, those
          labels show here.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/25 bg-transparent px-3 py-2">
            <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">
              Verified visits
            </p>
            <p className="mt-1 text-sm font-semibold text-night-ink">{summary.total}</p>
            <p className="text-[11px] text-night-muted">
              {summary.distinctDays} days · {summary.distinctVisitors} visitors
            </p>
          </div>
          <div className="rounded-xl border border-white/25 bg-transparent px-3 py-2">
            <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">
              With labels
            </p>
            <p className="mt-1 text-sm font-semibold text-night-ink">{summary.withLabels}</p>
            <p className="text-[11px] text-night-muted">From Buyer Community</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-night-faint">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3 text-saffron-glow" aria-hidden />
            Date & time on every visit
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-saffron-glow" aria-hidden />
            Anonymized visitors
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-saffron-glow" aria-hidden />
            No dwell timer
          </span>
        </div>
      </div>

      <CollapsibleSection
        id="visit-log"
        title="Visit log"
        count={sortedVisits.length}
        blurb="Newest first. You decide how these dates/times relate to the sale posting."
      >
        <div className="space-y-2 px-0.5 pb-0.5">
          {sortedVisits.map((visit) => (
            <VisitRow key={visit.id} visit={visit} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="pattern-read"
        title="Pattern read"
        count={bundle.signals.length}
        blurb="Light signals — not a fraud verdict. Use date/time clustering to judge for yourself."
      >
        <ul className="space-y-2 px-0.5 pb-0.5">
          {bundle.signals.map((signal) => (
            <li
              key={signal.id}
              className="rounded-xl border border-white/25 bg-transparent px-3 py-2.5"
              data-testid={`visit-signal-${signal.id}`}
            >
              <p
                className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold',
                  toneClass(signal.tone),
                )}
              >
                {signal.tone === 'caution' ? (
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                {signal.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-night-muted">{signal.detail}</p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        id="how-it-works"
        title="How verification works"
        blurb="What counts as a verified visit in this demo shell."
      >
        <div className="space-y-1 px-2 pb-2 text-[13px] text-night-ink">
          <p className="flex min-h-11 items-center justify-between gap-3 py-1">
            <span className="text-night-muted">Radius</span>
            <span className="font-semibold">Within {bundle.radiusMeters}m of pin</span>
          </p>
          <p className="flex min-h-11 items-center justify-between gap-3 py-1">
            <span className="text-night-muted">Dwell</span>
            <span className="font-semibold">Not required — presence confirm only</span>
          </p>
          <p className="flex min-h-11 items-center justify-between gap-3 py-1">
            <span className="text-night-muted">Identity</span>
            <span className="font-semibold">Anonymized visitor labels</span>
          </p>
          <p className="flex min-h-11 items-center justify-between gap-3 py-1">
            <span className="text-night-muted">Buyer Community</span>
            <span className="font-semibold">Labels appear on that visitor’s visits</span>
          </p>
        </div>
      </CollapsibleSection>
    </div>
  )
}
