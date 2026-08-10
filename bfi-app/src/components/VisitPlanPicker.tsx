import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAY_COUNT = 45
const TIME_STEP_MINUTES = 15
const WHEEL_ITEM_H = 44

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
  if (sameDay(day, tomorrow)) return { top: 'Tomorrow', bottom: String(day.getDate()) }
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
  for (let minutesOfDay = 0; minutesOfDay < 24 * 60; minutesOfDay += TIME_STEP_MINUTES) {
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
  testId?: string
}

export function VisitPlanPicker({ value, onSave, testId }: VisitPlanPickerProps) {
  const saved = parseIso(value)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => defaultDraft(saved))
  const dateRailRef = useRef<HTMLDivElement>(null)
  const timeWheelRef = useRef<HTMLDivElement>(null)
  const timeScrollLock = useRef(false)
  const [canScrollDatesLeft, setCanScrollDatesLeft] = useState(false)
  const [canScrollDatesRight, setCanScrollDatesRight] = useState(false)

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
    rail.scrollBy({ left: direction * Math.max(140, rail.clientWidth * 0.7), behavior: 'smooth' })
  }

  const today = useMemo(() => startOfDay(new Date()), [open])
  const now = useMemo(() => new Date(), [open])
  const days = useMemo(() => buildDays(today), [today])
  const times = useMemo(() => buildTimesForDay(startOfDay(draft), now), [draft, now])

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

  const selectedDayKey = `${draft.getFullYear()}-${draft.getMonth()}-${draft.getDate()}`

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
    if (!open || !timeWheelRef.current || times.length === 0) return
    const index = nearestTimeIndex(times, draft)
    timeScrollLock.current = true
    timeWheelRef.current.scrollTo({
      top: index * WHEEL_ITEM_H,
      behavior: 'smooth',
    })
    const timer = window.setTimeout(() => {
      timeScrollLock.current = false
    }, 320)
    return () => window.clearTimeout(timer)
    // Re-center the wheel when the chosen day changes or the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDayKey, times.length])

  function pickDay(day: Date) {
    setDraft((prev) => {
      const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), prev.getHours(), prev.getMinutes(), 0, 0)
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

  function onTimeScroll() {
    if (!timeWheelRef.current || timeScrollLock.current || times.length === 0) return
    const index = Math.round(timeWheelRef.current.scrollTop / WHEEL_ITEM_H)
    const clamped = Math.max(0, Math.min(times.length - 1, index))
    const slot = times[clamped]
    if (!slot) return
    if (draft.getHours() === slot.hours && draft.getMinutes() === slot.minutes) return
    pickTime(slot.hours, slot.minutes)
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
    setOpen(false)
  }

  return (
    <div className="space-y-2" data-testid={testId}>
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-night-faint uppercase">
        <CalendarClock className="h-3 w-3 text-saffron-glow" aria-hidden />
        Plan visit date & time
      </span>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full min-h-11 items-center gap-2 rounded-xl border px-3 text-left touch-manipulation transition-colors',
          open
            ? 'border-saffron/55 bg-saffron/15 text-saffron-glow'
            : 'border-white/20 bg-night-elevated/70 text-night-muted hover:border-saffron/40',
        )}
        aria-expanded={open}
        data-testid={testId ? `${testId}-trigger` : undefined}
      >
        <CalendarClock className="h-4 w-4 shrink-0 text-saffron-glow" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {saved ? formatPreview(saved) : 'Choose a date & time'}
        </span>
        <span className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
          {open ? 'Close' : 'Open'}
        </span>
      </button>

      {open ? (
        <div
          className="animate-bfi-fade min-w-0 overflow-hidden rounded-2xl border border-saffron/35 bg-gradient-to-b from-[#3a2a2b] via-[#322426] to-[#2a1f20] p-3 shadow-[0_12px_28px_rgb(0_0_0/0.35)]"
          data-testid={testId ? `${testId}-panel` : undefined}
        >
          <p className="mb-3 text-center font-display text-[13px] font-semibold tracking-tight text-saffron-glow">
            Schedule a visit
          </p>

          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">Date</p>
            <p className="text-[10px] text-night-faint">Swipe left or right</p>
          </div>
          <div className="relative mb-3 min-w-0">
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#322426] to-transparent transition-opacity',
                canScrollDatesLeft ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden
            />
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#2a1f20] to-transparent transition-opacity',
                canScrollDatesRight ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => scrollDates(-1)}
              disabled={!canScrollDatesLeft}
              className={cn(
                'absolute left-0 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-saffron/35 bg-night/80 text-saffron-glow shadow-md touch-manipulation transition-opacity',
                canScrollDatesLeft ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-label="Scroll dates left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollDates(1)}
              disabled={!canScrollDatesRight}
              className={cn(
                'absolute right-0 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-saffron/35 bg-night/80 text-saffron-glow shadow-md touch-manipulation transition-opacity',
                canScrollDatesRight ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-label="Scroll dates right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div
              ref={dateRailRef}
              onScroll={updateDateScrollHints}
              className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-8 pb-1 [-webkit-overflow-scrolling:touch] [touch-action:pan-x]"
              data-testid={testId ? `${testId}-dates` : undefined}
            >
              {days.map((day, index) => {
                const selected = sameDay(day, draft)
                const label = formatDayChip(day, today)
                const month = day.toLocaleDateString(undefined, { month: 'short' })
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    data-day-index={index}
                    onClick={() => pickDay(day)}
                    className={cn(
                      'flex w-[4.35rem] shrink-0 snap-center flex-col items-center justify-center rounded-2xl border px-2 py-2.5 transition-colors [touch-action:pan-x]',
                      selected
                        ? 'border-saffron/60 bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.3)]'
                        : 'border-white/15 bg-night/35 text-night-muted hover:border-saffron/35 hover:text-saffron-glow',
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className={cn(
                        'text-[9px] font-bold tracking-[0.08em] uppercase',
                        selected ? 'text-white/85' : 'text-night-faint',
                      )}
                    >
                      {label.top}
                    </span>
                    <span className="mt-0.5 font-display text-lg font-semibold leading-none">
                      {label.bottom}
                    </span>
                    <span
                      className={cn(
                        'mt-1 text-[9px] font-semibold',
                        selected ? 'text-white/80' : 'text-night-faint',
                      )}
                    >
                      {month}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="mb-1.5 px-0.5 text-[10px] font-bold tracking-wide text-night-faint uppercase">
            Time
          </p>
          <div className="relative mx-auto max-w-[14rem]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[#322426] to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-[#2a1f20] to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-1 top-1/2 z-[5] h-11 -translate-y-1/2 rounded-xl border border-saffron/45 bg-saffron/15"
              aria-hidden
            />
            <div
              ref={timeWheelRef}
              onScroll={onTimeScroll}
              className="h-[11rem] snap-y snap-mandatory overflow-y-auto scroll-smooth px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                paddingTop: WHEEL_ITEM_H * 2,
                paddingBottom: WHEEL_ITEM_H * 2,
              }}
              data-testid={testId ? `${testId}-times` : undefined}
            >
              {times.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-night-faint">No times left today</p>
              ) : (
                times.map((slot) => {
                  const selected =
                    draft.getHours() === slot.hours && draft.getMinutes() === slot.minutes
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => {
                        pickTime(slot.hours, slot.minutes)
                        const index = times.findIndex((item) => item.key === slot.key)
                        if (index >= 0 && timeWheelRef.current) {
                          timeScrollLock.current = true
                          timeWheelRef.current.scrollTo({
                            top: index * WHEEL_ITEM_H,
                            behavior: 'smooth',
                          })
                          window.setTimeout(() => {
                            timeScrollLock.current = false
                          }, 320)
                        }
                      }}
                      className={cn(
                        'flex w-full snap-center items-center justify-center text-[15px] font-semibold tabular-nums touch-manipulation transition-colors',
                        selected ? 'text-saffron-glow' : 'text-night-faint/80',
                      )}
                      style={{ height: WHEEL_ITEM_H }}
                      aria-pressed={selected}
                    >
                      {formatTimeLabel(slot.hours, slot.minutes)}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <p className="mt-3 rounded-xl border border-saffron/25 bg-saffron/10 px-3 py-2 text-center text-[12px] font-semibold text-saffron-glow">
            {formatPreview(draft)}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-transparent px-3 text-sm font-semibold text-night-muted touch-manipulation"
              data-testid={testId ? `${testId}-cancel` : undefined}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={times.length === 0}
              className="inline-flex min-h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-saffron px-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgb(232_145_58/0.3)] touch-manipulation hover:bg-saffron-deep disabled:opacity-50"
              data-testid={testId ? `${testId}-save` : undefined}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Save plan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
