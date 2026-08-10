import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

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

function defaultDraft(existing: Date | null) {
  if (existing) {
    const next = new Date(existing)
    next.setMinutes(Math.round(next.getMinutes() / 5) * 5, 0, 0)
    return next
  }
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

function pad(n: number) {
  return String(n).padStart(2, '0')
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
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(defaultDraft(saved).getFullYear(), defaultDraft(saved).getMonth(), 1),
  )

  useEffect(() => {
    if (!open) return
    const next = defaultDraft(parseIso(value))
    setDraft(next)
    setMonthCursor(new Date(next.getFullYear(), next.getMonth(), 1))
  }, [open, value])

  const today = startOfDay(new Date())

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const slots: Array<Date | null> = []
    for (let i = 0; i < firstDow; i += 1) slots.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      slots.push(new Date(year, month, day))
    }
    while (slots.length % 7 !== 0) slots.push(null)
    return slots
  }, [monthCursor])

  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const dirty =
    (saved?.getTime() ?? null) !==
    new Date(
      draft.getFullYear(),
      draft.getMonth(),
      draft.getDate(),
      draft.getHours(),
      draft.getMinutes(),
      0,
      0,
    ).getTime()

  function pickDay(day: Date) {
    setDraft(
      (prev) =>
        new Date(day.getFullYear(), day.getMonth(), day.getDate(), prev.getHours(), prev.getMinutes(), 0, 0),
    )
  }

  function setHour(hour: number) {
    setDraft((prev) => {
      const next = new Date(prev)
      next.setHours(hour)
      return next
    })
  }

  function setMinute(minute: number) {
    setDraft((prev) => {
      const next = new Date(prev)
      next.setMinutes(minute)
      return next
    })
  }

  function handleSave() {
    const iso = new Date(
      draft.getFullYear(),
      draft.getMonth(),
      draft.getDate(),
      draft.getHours(),
      draft.getMinutes(),
      0,
      0,
    ).toISOString()
    onSave(iso)
    setOpen(false)
  }

  function handleCancel() {
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
          className="animate-bfi-fade overflow-hidden rounded-2xl border border-saffron/35 bg-gradient-to-b from-[#3a2a2b] via-[#322426] to-[#2a1f20] p-3 shadow-[0_12px_28px_rgb(0_0_0/0.35)]"
          data-testid={testId ? `${testId}-panel` : undefined}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-display text-sm font-semibold tracking-tight text-saffron-glow">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10px] font-bold tracking-wide text-night-faint uppercase"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} className="h-9" />
              }
              const selected = sameDay(day, draft)
              const isToday = sameDay(day, today)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={cn(
                    'inline-flex h-9 items-center justify-center rounded-xl text-[12px] font-semibold touch-manipulation transition-colors',
                    selected
                      ? 'bg-saffron text-white shadow-[0_4px_12px_rgb(232_145_58/0.35)]'
                      : isToday
                        ? 'border border-saffron/45 text-saffron-glow hover:bg-saffron/20'
                        : 'text-night-ink hover:bg-white/10',
                  )}
                  aria-pressed={selected}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">Time</p>
            <div className="flex items-center gap-2">
              <div className="flex min-h-10 flex-1 items-center justify-between rounded-xl border border-white/15 bg-night/60 px-2">
                <button
                  type="button"
                  onClick={() => setHour((draft.getHours() + 23) % 24)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-saffron-glow hover:bg-saffron/20 touch-manipulation"
                  aria-label="Decrease hour"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold tabular-nums text-night-ink" data-testid={testId ? `${testId}-hour` : undefined}>
                  {pad(draft.getHours())}
                </span>
                <button
                  type="button"
                  onClick={() => setHour((draft.getHours() + 1) % 24)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-saffron-glow hover:bg-saffron/20 touch-manipulation"
                  aria-label="Increase hour"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="text-saffron-glow font-bold">:</span>
              <div className="flex min-h-10 flex-1 items-center justify-between rounded-xl border border-white/15 bg-night/60 px-2">
                <button
                  type="button"
                  onClick={() => setMinute((draft.getMinutes() - 5 + 60) % 60)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-saffron-glow hover:bg-saffron/20 touch-manipulation"
                  aria-label="Decrease minute"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold tabular-nums text-night-ink" data-testid={testId ? `${testId}-minute` : undefined}>
                  {pad(draft.getMinutes() - (draft.getMinutes() % 5))}
                </span>
                <button
                  type="button"
                  onClick={() => setMinute((draft.getMinutes() - (draft.getMinutes() % 5) + 5) % 60)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-saffron-glow hover:bg-saffron/20 touch-manipulation"
                  aria-label="Increase minute"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[9, 10, 12, 14, 16, 18].map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => {
                    setHour(hour)
                    setMinute(0)
                  }}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-semibold touch-manipulation',
                    draft.getHours() === hour && draft.getMinutes() < 5
                      ? 'border-saffron/55 bg-saffron/25 text-saffron-glow'
                      : 'border-white/15 text-night-faint hover:border-saffron/35 hover:text-saffron-glow',
                  )}
                >
                  {new Date(2000, 0, 1, hour, 0).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 rounded-xl border border-saffron/25 bg-saffron/10 px-3 py-2 text-center text-[12px] font-semibold text-saffron-glow">
            {formatPreview(draft)}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-transparent px-3 text-sm font-semibold text-night-muted touch-manipulation"
              data-testid={testId ? `${testId}-cancel` : undefined}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-saffron px-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgb(232_145_58/0.3)] touch-manipulation hover:bg-saffron-deep"
              data-testid={testId ? `${testId}-save` : undefined}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {dirty || !saved ? 'Save plan' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
