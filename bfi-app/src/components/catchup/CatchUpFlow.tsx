import { useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  FileText,
  Hash,
  History,
  Receipt,
  School,
  ShieldCheck,
  Undo2,
  Users,
  X,
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

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(diffMs / 60_000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function CatchUpCardView({
  card,
  offsetX,
  dragging,
}: {
  card: CatchUpCard
  offsetX: number
  dragging: boolean
}) {
  const rotate = offsetX / 28
  const doneHint = offsetX > 48
  const keepHint = offsetX < -48

  return (
    <article
      className={cn(
        'absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-night-line bg-coastal-soft shadow-[0_18px_48px_rgb(42_31_32/0.35)]',
        dragging ? 'transition-none' : 'transition-transform duration-200 ease-out',
      )}
      style={{
        transform: `translateX(${offsetX}px) rotate(${rotate}deg)`,
      }}
      data-testid={`catchup-card-${card.id}`}
    >
      <div className="flex items-center gap-2 border-b border-night-line bg-gradient-to-r from-saffron/15 to-transparent px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron/25 text-saffron-glow">
          <Hash className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-night-ink">#{card.channel}</p>
          <p className="truncate text-[11px] text-night-faint">
            {card.unreadCount} unread · {formatRelative(card.timestamp)}
          </p>
        </div>
        <span className="rounded-full bg-saffron px-2 py-0.5 text-[11px] font-bold text-white shadow-[0_4px_10px_rgb(232_145_58/0.3)]">
          {card.unreadCount}
        </span>
      </div>

      <div className="relative flex-1 overflow-y-auto bg-coastal-deep/35 px-4 py-4">
        {doneHint ? (
          <div className="pointer-events-none absolute top-4 left-4 rounded-lg border-2 border-saffron-bright px-3 py-1 text-xs font-bold tracking-wide text-saffron-bright uppercase rotate-[-8deg]">
            Mark done
          </div>
        ) : null}
        {keepHint ? (
          <div className="pointer-events-none absolute top-4 right-4 rounded-lg border-2 border-night-faint px-3 py-1 text-xs font-bold tracking-wide text-night-faint uppercase rotate-[8deg]">
            Keep unread
          </div>
        ) : null}

        <p className="text-[11px] font-semibold tracking-[0.14em] text-saffron-glow uppercase">
          {card.type.replaceAll('_', ' ')}
        </p>
        <h3 className="mt-2 text-[1.35rem] font-bold leading-snug text-night-ink">{card.headline}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-night-muted">{card.preview}</p>

        {card.fields && card.fields.length > 0 ? (
          <dl className="mt-5 space-y-2">
            {card.fields.map((field) => (
              <div
                key={`${field.label}-${field.value}`}
                className="flex items-baseline justify-between gap-3 rounded-2xl border border-night-line bg-coastal-deep/50 px-3 py-2.5"
              >
                <dt className="text-[12px] text-night-faint">{field.label}</dt>
                <dd className="text-right text-[13px] font-semibold text-saffron-glow">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="mt-5 font-mono text-[10px] leading-relaxed text-night-faint">
          source · {card.source}
        </p>
      </div>
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
  const [queue, setQueue] = useState<CatchUpCard[]>(() => response.items)
  const [history, setHistory] = useState<CatchUpCard[]>([])
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)

  const current = queue[0]
  const remaining = queue.length
  const total = response.items.length
  const progress = total === 0 ? 1 : (total - remaining) / total

  function commit(direction: 'done' | 'keep') {
    if (!current) return
    setQueue((prev) => prev.slice(1))
    setHistory((prev) => [current, ...prev])
    setOffsetX(direction === 'done' ? 420 : -420)
    window.setTimeout(() => setOffsetX(0), 180)
  }

  function undo() {
    const last = history[0]
    if (!last) return
    setHistory((prev) => prev.slice(1))
    setQueue((prev) => [last, ...prev])
  }

  function onPointerDown(clientX: number) {
    startX.current = clientX
    setDragging(true)
  }

  function onPointerMove(clientX: number) {
    if (startX.current == null) return
    setOffsetX(clientX - startX.current)
  }

  function onPointerUp() {
    if (startX.current == null) return
    if (offsetX > 96) commit('done')
    else if (offsetX < -96) commit('keep')
    else setOffsetX(0)
    startX.current = null
    setDragging(false)
  }

  const apiLabel = useMemo(
    () => `${response.method} ${response.endpoint}`,
    [response.endpoint, response.method],
  )

  return (
    <div
      className="animate-bfi-fade fixed inset-0 z-[60] flex justify-center bfi-night-wash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catchup-title"
      data-testid="catchup-flow"
      data-surface={surface}
    >
      <div className="flex h-full w-full max-w-lg flex-col">
        <header className="border-b border-night-line bg-coastal/90 px-3 pt-3 pb-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-night-ink/10 hover:text-saffron-glow touch-manipulation"
              aria-label="Close"
              data-testid="button-close-catchup"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', meta.iconWrap)}>
                  <Icon className={cn('h-4 w-4', meta.accent)} />
                </span>
                <h2 id="catchup-title" className="truncate text-[17px] font-bold text-night-ink">
                  {meta.title}
                </h2>
              </div>
              <p className="truncate font-mono text-[10px] text-night-faint">{apiLabel}</p>
            </div>
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className={cn(
                'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl touch-manipulation',
                history.length === 0
                  ? 'text-night-faint/40'
                  : 'text-night-muted hover:bg-night-ink/10 hover:text-saffron-glow',
              )}
              aria-label="Undo"
              data-testid="button-undo-catchup"
            >
              <Undo2 className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 h-1 overflow-hidden rounded-full bg-coastal-deep/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-saffron-deep via-saffron to-saffron-bright transition-[width] duration-300"
              style={{ width: `${Math.max(progress * 100, remaining === 0 ? 100 : 6)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[12px] text-night-muted">
            {remaining === 0 ? 'You are caught up' : `${remaining} remaining`}
          </p>
        </header>

        <div className="relative flex flex-1 flex-col px-4 py-4">
          <div
            className="relative mx-auto w-full max-w-sm flex-1 touch-pan-y"
            onPointerDown={(event) => {
              if (!current) return
              ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
              onPointerDown(event.clientX)
            }}
            onPointerMove={(event) => onPointerMove(event.clientX)}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {current ? (
              <CatchUpCardView card={current} offsetX={offsetX} dragging={dragging} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-dashed border-saffron/40 bg-coastal-soft/70 px-6 text-center">
                <Check className="h-10 w-10 text-saffron-glow" />
                <p className="mt-4 text-lg font-bold text-night-ink">All caught up</p>
                <p className="mt-2 text-sm text-night-muted">
                  No more cards from the API queue for this property.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 inline-flex min-h-11 items-center gap-1 rounded-full bg-saffron px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgb(232_145_58/0.3)] touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to property
                </button>
              </div>
            )}
          </div>

          {current ? (
            <div className="mt-4 flex items-center justify-center gap-6 pb-2">
              <button
                type="button"
                onClick={() => commit('keep')}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-night-faint/40 bg-night-ink/10 text-night-muted transition-transform active:scale-95 touch-manipulation"
                aria-label="Keep unread"
                data-testid="button-keep-unread"
              >
                <X className="h-6 w-6" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => commit('done')}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-saffron/50 bg-saffron/25 text-saffron-glow shadow-[0_0_24px_rgb(232_145_58/0.25)] transition-transform active:scale-95 touch-manipulation"
                aria-label="Mark done"
                data-testid="button-mark-done"
              >
                <Check className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}

          <p className="pb-1 text-center text-[11px] text-night-faint">
            Swipe right to mark done · left to keep unread
          </p>
        </div>
      </div>
    </div>
  )
}
