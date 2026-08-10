import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAY_COUNT = 45
const TIME_STEP_MINUTES = 15

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function snapMinutes(date: Date) {
  const next = new Date(date)
  let total = next.getHours() * 60 + next.getMinutes()
  total = Math.round(total / TIME_STEP_MINUTES) * TIME_STEP_MINUTES
  if (total >= 24 * 60) total = 24 * 60 - TIME_STEP_MINUTES
  next.setHours(Math.floor(total / 60), total % 60, 0, 0)
  return next
}

function defaultDraft(existing: Date | null) {
  if (existing) return snapMinutes(existing)
  const next = new Date()
  next.setDate(next.getDate() + 1)
  next.setHours(10, 0, 0, 0)
  return next
}

function formatPreview(date: Date) {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDayChip(day: Date, today: Date) {
  if (sameDay(day, today)) return { top: 'Today', bottom: String(day.getDate()) }
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (sameDay(day, tomorrow)) return { top: 'Tmrw', bottom: String(day.getDate()) }
  return {
    top: day.toLocaleDateString(undefined, { weekday: 'short' }),
    bottom: String(day.getDate()),
  }
}

function formatTimeLabel(hours: number, minutes: number) {
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildDays(today: Date) {
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() + index)
    return startOfDay(day)
  })
}

function buildTimesForDay(day: Date, now: Date) {
  const times: Array<{ hours: number; minutes: number; key: string }> = []
  for (let minutesOfDay = 7 * 60; minutesOfDay <= 21 * 60; minutesOfDay += TIME_STEP_MINUTES) {
    const hours = Math.floor(minutesOfDay / 60)
    const minutes = minutesOfDay % 60
    const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0)
    if (sameDay(day, now) && slot.getTime() <= now.getTime() + 5 * 60 * 1000) continue
    times.push({ hours, minutes, key: `${hours}:${minutes}` })
  }
  return times
}

function nearestTimeIndex(
  times: Array<{ hours: number; minutes: number }>,
  draft: Date,
) {
  if (times.length === 0) return 0
  const target = draft.getHours() * 60 + draft.getMinutes()
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  times.forEach((slot, index) => {
    const value = slot.hours * 60 + slot.minutes
    const dist = Math.abs(value - target)
    if (dist < bestDist) {
      best = index
      bestDist = dist
    }
  })
  return best
}

type VisitPlanPickerProps = {
  value?: string | null
  onSave: (iso: string | null) => void
  onOpenChange?: (open: boolean) => void
  testId?: string
}

export function VisitPlanPicker({ value, onSave, onOpenChange, testId }: VisitPlanPickerProps) {
  const saved = parseIso(value)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => defaultDraft(saved))
  const dateRailRef = useRef<HTMLDivElement>(null)
  const timeRailRef = useRef<HTMLDivElement>(null)
  const [canScrollDatesLeft, setCanScrollDatesLeft] = useState(false)
  const [canScrollDatesRight, setCanScrollDatesRight] = useState(false)

  function setPickerOpen(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  function updateDateScrollHints() {
    const rail = dateRailRef.current
    if (!rail) return
    const max = rail.scrollWidth - rail.clientWidth
    setCanScrollDatesLeft(rail.scrollLeft > 4)
    setCanScrollDatesRight(rail.scrollLeft < max - 4)
  }

  function scrollDates(direction: -1 | 1) {
    const rail = dateRailRef.current
    if (!rail) return
    rail.scrollBy({ left: direction * Math.max(120, rail.clientWidth * 0.65), behavior: 'smooth' })
  }

  const today = useMemo(() => startOfDay(new Date()), [open])
  const now = useMemo(() => new Date(), [open])
  const days = useMemo(() => buildDays(today), [today])
  const times = useMemo(() => buildTimesForDay(startOfDay(draft), now), [draft, now])
  const selectedDayKey = `${draft.getFullYear()}-${draft.getMonth()}-${draft.getDate()}`
  const selectedTimeKey = `${draft.getHours()}:${draft.getMinutes()}`

  useEffect(() => {
    if (!open) return
    const next = defaultDraft(parseIso(value))
    const dayTimes = buildTimesForDay(startOfDay(next), new Date())
    if (dayTimes.length === 0) {
      const fallback = new Date(today)
      fallback.setDate(today.getDate() + 1)
      fallback.setHours(10, 0, 0, 0)
      setDraft(fallback)
      return
    }
    const idx = nearestTimeIndex(dayTimes, next)
    const slot = dayTimes[idx]!
    setDraft(
      new Date(next.getFullYear(), next.getMonth(), next.getDate(), slot.hours, slot.minutes, 0, 0),
    )
  }, [open, value, today])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => updateDateScrollHints())
    return () => window.cancelAnimationFrame(frame)
  }, [open, days.length])

  useEffect(() => {
    if (!open || !dateRailRef.current) return
    const index = Math.max(
      0,
      days.findIndex((day) => sameDay(day, draft)),
    )
    const node = dateRailRef.current.querySelector<HTMLElement>(`[data-day-index="${index}"]`)
    node?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    const timer = window.setTimeout(updateDateScrollHints, 360)
    return () => window.clearTimeout(timer)
  }, [open, selectedDayKey, days])

  useEffect(() => {
    if (!open || !timeRailRef.current || times.length === 0) return
    const index = nearestTimeIndex(times, draft)
    const node = timeRailRef.current.querySelector<HTMLElement>(`[data-time-index="${index}"]`)
    node?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [open, selectedDayKey, selectedTimeKey, times])

  function pickDay(day: Date) {
    setDraft((prev) => {
      const next = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        prev.getHours(),
        prev.getMinutes(),
        0,
        0,
      )
      const dayTimes = buildTimesForDay(day, new Date())
      if (dayTimes.length === 0) {
        next.setDate(next.getDate() + 1)
        next.setHours(10, 0, 0, 0)
        return next
      }
      const idx = nearestTimeIndex(dayTimes, next)
      const slot = dayTimes[idx]!
      next.setHours(slot.hours, slot.minutes, 0, 0)
      return next
    })
  }

  function pickTime(hours: number, minutes: number) {
    setDraft((prev) => {
      const next = new Date(prev)
      next.setHours(hours, minutes, 0, 0)
      return next
    })
  }

  function handleSave() {
    onSave(
      new Date(
        draft.getFullYear(),
        draft.getMonth(),
        draft.getDate(),
        draft.getHours(),
        draft.getMinutes(),
        0,
        0,
      ).toISOString(),
    )
    setPickerOpen(false)
  }

  if (!open) {
    return (
      <div data-testid={testId}>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-night-elevated/70 px-3 text-left touch-manipulation transition-colors hover:border-saffron/40"
          aria-expanded={false}
          data-testid={testId ? `${testId}-trigger` : undefined}
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-night-muted">
            {saved ? formatPreview(saved) : 'Plan visit date & time'}
          </span>
          <span className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
            Open
          </span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="animate-bfi-fade min-w-0 space-y-2.5 rounded-2xl border border-saffron/40 bg-gradient-to-b from-[#3a2a2b] to-[#2a1f20] p-2.5 shadow-[0_10px_24px_rgb(0_0_0/0.3)]"
      data-testid={testId ? `${testId}-panel` : testId}
    >
      <div className="flex items-center gap-2 px-0.5">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-saffron-glow" aria-hidden />
        <p className="min-w-0 flex-1 truncate font-display text-[12px] font-semibold text-saffron-glow">
          {formatPreview(draft)}
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-night-faint hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
          aria-label="Close planner"
          data-testid={testId ? `${testId}-cancel` : undefined}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative min-w-0">
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[#322426] to-transparent transition-opacity',
            canScrollDatesLeft ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[#2a1f20] to-transparent transition-opacity',
            canScrollDatesRight ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => scrollDates(-1)}
          disabled={!canScrollDatesLeft}
          className={cn(
            'absolute left-0 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-saffron/35 bg-night/85 text-saffron-glow touch-manipulation transition-opacity',
            canScrollDatesLeft ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          aria-label="Scroll dates left"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => scrollDates(1)}
          disabled={!canScrollDatesRight}
          className={cn(
            'absolute right-0 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-saffron/35 bg-night/85 text-saffron-glow touch-manipulation transition-opacity',
            canScrollDatesRight ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          aria-label="Scroll dates right"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div
          ref={dateRailRef}
          onScroll={updateDateScrollHints}
          className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-7 [-webkit-overflow-scrolling:touch] [touch-action:pan-x]"
          data-testid={testId ? `${testId}-dates` : undefined}
        >
          {days.map((day, index) => {
            const selected = sameDay(day, draft)
            const label = formatDayChip(day, today)
            return (
              <button
                key={day.toISOString()}
                type="button"
                data-day-index={index}
                onClick={() => pickDay(day)}
                className={cn(
                  'flex h-14 w-12 shrink-0 snap-center flex-col items-center justify-center rounded-xl border transition-colors [touch-action:pan-x]',
                  selected
                    ? 'border-saffron/60 bg-saffron text-white shadow-[0_4px_12px_rgb(232_145_58/0.3)]'
                    : 'border-white/15 bg-night/40 text-night-muted',
                )}
                aria-pressed={selected}
              >
                <span
                  className={cn(
                    'text-[8px] font-bold tracking-wide uppercase',
                    selected ? 'text-white/85' : 'text-night-faint',
                  )}
                >
                  {label.top}
                </span>
                <span className="font-display text-base font-semibold leading-none">{label.bottom}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        ref={timeRailRef}
        className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-0.5 [-webkit-overflow-scrolling:touch] [touch-action:pan-x]"
        data-testid={testId ? `${testId}-times` : undefined}
      >
        {times.length === 0 ? (
          <p className="w-full py-2 text-center text-[12px] text-night-faint">No times left today</p>
        ) : (
          times.map((slot, index) => {
            const selected =
              draft.getHours() === slot.hours && draft.getMinutes() === slot.minutes
            return (
              <button
                key={slot.key}
                type="button"
                data-time-index={index}
                onClick={() => pickTime(slot.hours, slot.minutes)}
                className={cn(
                  'inline-flex h-9 shrink-0 snap-center items-center justify-center rounded-xl border px-2.5 text-[12px] font-semibold tabular-nums transition-colors [touch-action:pan-x]',
                  selected
                    ? 'border-saffron/55 bg-saffron/25 text-saffron-glow'
                    : 'border-white/15 bg-night/35 text-night-faint',
                )}
                aria-pressed={selected}
              >
                {formatTimeLabel(slot.hours, slot.minutes)}
              </button>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={times.length === 0}
        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-saffron px-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgb(232_145_58/0.3)] touch-manipulation hover:bg-saffron-deep disabled:opacity-50"
        data-testid={testId ? `${testId}-save` : undefined}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        Save plan
      </button>
    </div>
  )
}
