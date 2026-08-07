import { useState, type ReactNode } from 'react'
import {
  CalendarClock,
  ChevronDown,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { MockProperty } from '@/data/mockProperty'
import {
  formatVisitDate,
  formatVisitTime,
  getVerifiedVisitsBundle,
  relativeToListing,
  visitSummary,
  type VisitPatternSignal,
  type VerifiedVisit,
} from '@/data/verifiedVisits'
import { cn } from '@/lib/utils'

function toneClass(tone: VisitPatternSignal['tone']) {
  if (tone === 'positive') return 'text-saffron-glow'
  if (tone === 'caution') return 'text-saffron-bright'
  return 'text-night-muted'
}

function VisitRow({
  visit,
  listingPostedAt,
}: {
  visit: VerifiedVisit
  listingPostedAt: string
}) {
  const relative = relativeToListing(visit.visitedAt, listingPostedAt)
  const afterListing = new Date(visit.visitedAt) >= new Date(listingPostedAt)

  return (
    <article
      className="rounded-xl border border-night-line bg-coastal-deep/60 px-3 py-2.5"
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
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            afterListing
              ? 'bg-saffron/20 text-saffron-glow'
              : 'bg-night-ink/10 text-night-faint',
          )}
        >
          {afterListing ? 'Post-listing' : 'Pre-listing'}
        </span>
      </div>

      <p className="mt-2 text-[11px] text-night-faint">{relative}</p>

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
        <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
          {title}
        </span>
        {typeof count === 'number' ? (
          <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-1 space-y-2 rounded-2xl border border-night-line bg-coastal-deep/55 p-2 shadow-sm backdrop-blur-sm">
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
 * Verified Visits: dated GPS presence log so buyers can judge timing vs listing
 * and whether the pattern looks natural or manufactured.
 */
export function VerifiedVisitsPanel({ property }: VerifiedVisitsPanelProps) {
  const bundle = getVerifiedVisitsBundle(property)
  const summary = visitSummary(bundle)
  const sortedVisits = [...bundle.visits].sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  )

  return (
    <div className="mt-3 space-y-4 px-3" data-testid="verified-visits-panel">
      <div className="rounded-2xl border border-night-line bg-coastal-deep/55 p-3 shadow-sm backdrop-blur-sm">
        <p className="text-[13px] leading-relaxed text-night-ink">
          Each row is a GPS presence check within {bundle.radiusMeters}m — with date and time so you
          can see whether visits landed after the sale was posted, and whether the pattern looks
          natural.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-night-line bg-coastal-deep/60 px-3 py-2">
            <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">
              Listing posted
            </p>
            <p className="mt-1 text-sm font-semibold text-night-ink">
              {formatVisitDate(bundle.listingPostedAt)}
            </p>
            <p className="text-[11px] text-night-muted">
              {formatVisitTime(bundle.listingPostedAt)}
            </p>
          </div>
          <div className="rounded-xl border border-night-line bg-coastal-deep/60 px-3 py-2">
            <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">
              Verified visits
            </p>
            <p className="mt-1 text-sm font-semibold text-night-ink">{summary.total}</p>
            <p className="text-[11px] text-night-muted">
              {summary.postListing} post-listing
              {summary.preListing > 0 ? ` · ${summary.preListing} before` : ''}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-night-faint">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3 text-saffron-glow" aria-hidden />
            {summary.distinctDays} distinct days
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-saffron-glow" aria-hidden />
            {summary.distinctVisitors} visitors
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-saffron-glow" aria-hidden />
            No dwell timer — tap Verify on site
          </span>
        </div>
      </div>

      <CollapsibleSection
        id="visit-log"
        title="Visit log"
        count={sortedVisits.length}
        blurb="Newest first. Compare each timestamp to the listing post date above."
      >
        <div className="space-y-2 px-0.5 pb-0.5">
          {sortedVisits.map((visit) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              listingPostedAt={bundle.listingPostedAt}
            />
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
              className="rounded-xl border border-night-line bg-coastal-deep/60 px-3 py-2.5"
              data-testid={`visit-signal-${signal.id}`}
            >
              <p className={cn('flex items-center gap-1.5 text-sm font-semibold', toneClass(signal.tone))}>
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
            <span className="font-semibold">Unlocks label upvotes</span>
          </p>
        </div>
      </CollapsibleSection>
    </div>
  )
}
