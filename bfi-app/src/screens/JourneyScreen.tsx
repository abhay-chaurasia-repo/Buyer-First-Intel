import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  JOURNEY_CHECKLIST,
  JOURNEY_PHASES,
  journeyStats,
  loadJourneyProgress,
  persistJourneyProgress,
  type JourneyChecklistItem,
  type JourneyProgress,
} from '@/data/journeyChecklist'
import { cn } from '@/lib/utils'

function PhaseSection({
  title,
  blurb,
  items,
  progress,
  onToggle,
}: {
  title: string
  blurb: string
  items: JourneyChecklistItem[]
  progress: JourneyProgress
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const done = items.filter((item) => progress[item.id]).length

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn('h-4 w-4 text-saffron-glow transition-transform', !open && '-rotate-90')}
        />
        <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
          {title}
        </span>
        <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
          {done}/{items.length}
        </span>
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-1 space-y-1.5 rounded-2xl border border-white/25 bg-transparent p-2">
          <p className="px-2 pb-1 text-[11px] text-night-faint">{blurb}</p>
          {items.map((item) => {
            const checked = Boolean(progress[item.id])
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors touch-manipulation',
                  checked ? 'bg-saffron/10' : 'hover:bg-night-ink/10',
                )}
                aria-pressed={checked}
                data-testid={`journey-item-${item.id}`}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                    checked
                      ? 'border-saffron bg-saffron text-white'
                      : 'border-white/25 bg-transparent text-transparent',
                  )}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[13px] font-semibold leading-snug',
                      checked ? 'text-night-muted line-through' : 'text-night-ink',
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-night-faint">
                    {item.detail}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

export function JourneyScreen() {
  const [progress, setProgress] = useState<JourneyProgress>(() => loadJourneyProgress())
  const stats = useMemo(() => journeyStats(progress), [progress])
  const percent = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100)

  function handleToggle(id: string) {
    setProgress((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      persistJourneyProgress(next)
      return next
    })
  }

  return (
    <AppShell scene="journey" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
      <PageHeader
        title="Buying checklist"
        description="Prepare → diligence → close. Tap to check off."
        testId="journey-top-bar"
      />

      <div className="flex-1 overflow-y-auto px-3 py-4 pb-4">
        <div className="rounded-2xl border border-white/25 bg-transparent p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
                Progress
              </p>
              <p className="mt-1 text-sm font-semibold text-night-ink">
                {stats.done} of {stats.total} complete
              </p>
            </div>
            <p className="font-display text-2xl font-semibold text-saffron-glow">{percent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-night-ink/15">
            <div
              className="h-full rounded-full bg-saffron transition-[width] duration-300"
              style={{ width: `${percent}%` }}
              data-testid="journey-progress-bar"
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {JOURNEY_PHASES.map((phase) => (
            <PhaseSection
              key={phase.id}
              title={phase.title}
              blurb={phase.blurb}
              items={JOURNEY_CHECKLIST.filter((item) => item.phaseId === phase.id)}
              progress={progress}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </AppShell>
  )
}
