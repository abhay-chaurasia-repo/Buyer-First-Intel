import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Plus,
  Star,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react'
import { VisitPlanPicker } from '@/components/VisitPlanPicker'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/auth/AuthProvider'
import { persistBuyerVerified, loadBuyerVoteState } from '@/data/buyerCommunityStorage'
import {
  addNote,
  deleteNote,
  loadNotes,
  type SavedNote,
} from '@/data/propertyNotesStorage'
import {
  checkDueVisitReminders,
  ensureNotificationPermission,
} from '@/data/visitReminders'
import {
  loadWatchlist,
  markWatchlistVisited,
  propertyPath,
  removeFromWatchlist,
  setWatchlistPlannedVisit,
  visitPlanStatus,
  type WatchlistItem,
} from '@/data/watchlistStorage'
import { cn } from '@/lib/utils'

function formatVisitWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatVisitDateCompact(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function WatchlistMetaRail({
  plannedVisitAt,
  visitedAt,
  noteCount = 0,
  reminderEnabled = false,
  hasShared = false,
  onContribute,
}: {
  plannedVisitAt?: string | null
  visitedAt?: string | null
  noteCount?: number
  reminderEnabled?: boolean
  hasShared?: boolean
  onContribute?: () => void
}) {
  const hasPlanned = Boolean(plannedVisitAt)
  const hasVisited = Boolean(visitedAt)
  const hasNotes = noteCount > 0
  const canContribute = hasVisited && Boolean(onContribute)
  if (!hasPlanned && !hasVisited && !hasNotes && !canContribute) return null

  return (
    <div
      className="flex min-w-0 max-w-full flex-nowrap items-center justify-start gap-1 overflow-hidden"
      data-testid="watchlist-meta-rail"
    >
      {hasPlanned && plannedVisitAt ? (
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-saffron/35 bg-saffron/12 px-1.5 py-1 text-saffron-glow"
          title={`Planned ${formatVisitWhen(plannedVisitAt)}`}
          data-testid="visit-date-planned"
        >
          <CalendarClock className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          <span className="whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight">
            <span className="mr-1 text-[8px] font-bold tracking-[0.12em] uppercase opacity-75">
              Plan
            </span>
            {formatVisitDateCompact(plannedVisitAt)}
          </span>
          {reminderEnabled ? (
            <Bell className="h-3 w-3 shrink-0 text-saffron-glow" aria-label="Reminder on" />
          ) : null}
        </span>
      ) : null}

      {hasVisited && visitedAt ? (
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-saffron/45 bg-saffron/18 px-1.5 py-1 text-saffron-glow"
          title={`Visited ${formatVisitWhen(visitedAt)}`}
          data-testid="visit-date-visited"
        >
          <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight">
            <span className="mr-1 text-[8px] font-bold tracking-[0.12em] uppercase opacity-75">
              Visited
            </span>
            {formatVisitDateCompact(visitedAt)}
          </span>
        </span>
      ) : null}

      {canContribute ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onContribute?.()
          }}
          className={cn(
            'inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-1 touch-manipulation',
            hasShared
              ? 'border-[#e85d5d]/40 bg-[#e85d5d]/14 text-[#ffc2c2]'
              : 'animate-bfi-share-blow border-[#e85d5d]/70 bg-[#e85d5d]/28 text-[#ffb0b0] hover:bg-[#e85d5d]/36',
          )}
          title={
            hasShared
              ? 'Shared with Buyer Community — tap to update'
              : 'Share labels with Buyer Community'
          }
          aria-label={
            hasShared ? 'Shared with Buyer Community' : 'Share with Buyer Community'
          }
          data-testid="watchlist-contribute-chip"
          data-shared={hasShared ? '1' : '0'}
        >
          <Users className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="text-[8px] font-bold leading-none tracking-[0.12em] uppercase">
            {hasShared ? 'Shared' : 'Share'}
          </span>
        </button>
      ) : null}

      {hasNotes ? (
        <span
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-saffron/30 bg-saffron/12 px-1.5 py-1 text-[10px] font-bold leading-none text-saffron-glow"
          title={`${noteCount} note${noteCount === 1 ? '' : 's'}`}
          data-testid="watchlist-notes-badge"
        >
          <StickyNote className="h-3 w-3" aria-hidden />
          {noteCount}
        </span>
      ) : null}
    </div>
  )
}

function formatNoteWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function PropertyNotes({
  propertyId,
  onNotesChange,
}: {
  propertyId: string
  onNotesChange?: (count: number) => void
}) {
  const [notes, setNotes] = useState<SavedNote[]>(() => loadNotes(propertyId))
  const [draft, setDraft] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const next = loadNotes(propertyId)
    setNotes(next)
    setDraft('')
    setExpandedId(null)
    onNotesChange?.(next.length)
  }, [propertyId, onNotesChange])

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    const next = addNote(propertyId, draft)
    setNotes(next)
    onNotesChange?.(next.length)
    setDraft('')
    setExpandedId(next[0]?.id ?? null)
  }

  function handleDelete(noteId: string) {
    const next = deleteNote(propertyId, noteId)
    setNotes(next)
    onNotesChange?.(next.length)
    if (expandedId === noteId) setExpandedId(null)
  }

  return (
    <div className="border-t border-white/15 pt-2" data-testid={`notes-section-${propertyId}`}>
      <form
        onSubmit={handleSave}
        className="flex items-center gap-1.5"
        data-testid={`notes-form-${propertyId}`}
      >
        <div className="relative min-w-0 flex-1">
          <StickyNote
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-saffron-glow/80"
            aria-hidden
          />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot a quick private note…"
            className="min-h-9 w-full rounded-xl border border-white/20 bg-night/30 py-2 pr-3 pl-8 text-[13px] text-night-ink outline-none placeholder:text-night-faint focus:border-saffron/55"
            data-testid={`input-property-note-${propertyId}`}
          />
        </div>
        <button
          type="submit"
          disabled={!draft.trim()}
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors touch-manipulation',
            draft.trim()
              ? 'bg-saffron text-white shadow-[0_4px_12px_rgb(232_145_58/0.3)]'
              : 'border border-white/15 text-night-faint',
          )}
          aria-label="Add note"
          data-testid={`button-save-note-${propertyId}`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>

      {notes.length > 0 ? (
        <ul
          className="mt-1.5 max-h-[5.5rem] space-y-1 overflow-y-auto overscroll-contain"
          data-testid={`notes-list-${propertyId}`}
        >
          {notes.map((note, index) => {
            const expanded = expandedId === note.id
            return (
              <li
                key={note.id}
                className={cn(
                  'animate-bfi-fade flex items-start gap-1.5 rounded-lg border-l-2 py-1.5 pr-1 pl-2',
                  index % 2 === 0
                    ? 'border-saffron/55 bg-saffron/10'
                    : 'border-saffron-bright/45 bg-white/[0.04]',
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : note.id)}
                  className="min-w-0 flex-1 text-left touch-manipulation"
                  aria-expanded={expanded}
                >
                  <p
                    className={cn(
                      'text-[12px] leading-snug text-night-ink',
                      expanded ? 'whitespace-pre-wrap' : 'truncate',
                    )}
                  >
                    {note.text}
                  </p>
                  {expanded ? (
                    <p className="mt-0.5 text-[9px] font-medium tracking-wide text-night-faint uppercase">
                      {formatNoteWhen(note.createdAt)}
                    </p>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-night-faint transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
                  aria-label="Delete note"
                  data-testid={`button-delete-note-${note.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function WatchlistRow({
  item,
  onChange,
  onRemove,
  onOpen,
  onContribute,
}: {
  item: WatchlistItem
  onChange: (items: WatchlistItem[]) => void
  onRemove: (id: string) => void
  onOpen: (item: WatchlistItem) => void
  onContribute: (item: WatchlistItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [planning, setPlanning] = useState(false)
  const status = visitPlanStatus(item)
  const [noteCount, setNoteCount] = useState(() => loadNotes(item.id).length)
  const [hasShared, setHasShared] = useState(
    () => loadBuyerVoteState(item.id).myVotes.length > 0,
  )
  const rowRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!planning || !rowRef.current) return
    rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [planning])

  useEffect(() => {
    const refreshShared = () => {
      setHasShared(loadBuyerVoteState(item.id).myVotes.length > 0)
    }
    refreshShared()
    window.addEventListener('focus', refreshShared)
    return () => window.removeEventListener('focus', refreshShared)
  }, [item.id])

  function handleMarkVisited() {
    const markingVisited = status !== 'visited'
    onChange(markWatchlistVisited(item.id, markingVisited))
    if (markingVisited) {
      // Unlock community voting when they mark the visit from this list
      persistBuyerVerified(item.id, true)
    }
  }

  function handleSavePlan(iso: string | null) {
    onChange(setWatchlistPlannedVisit(item.id, iso))
    if (iso) {
      // Default reminder: request permission on Save (user gesture) with no extra UI
      void ensureNotificationPermission().then(() => {
        checkDueVisitReminders()
        onChange(loadWatchlist())
      })
    }
  }

  return (
    <li
      ref={rowRef}
      className="rounded-xl border border-white/25 bg-transparent"
      data-testid={`watchlist-item-${item.id}`}
    >
      <div className="px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value)
              setPlanning(false)
            }}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-saffron-glow touch-manipulation"
            aria-expanded={open}
            aria-label={open ? `Collapse ${item.address}` : `Expand ${item.address}`}
            data-testid={`button-toggle-watchlist-${item.id}`}
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value)
              setPlanning(false)
            }}
            className="min-w-0 flex-1 truncate py-2 text-left text-sm font-semibold text-night-muted touch-manipulation"
          >
            {item.address}
          </button>

          {open ? (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-night-faint transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
              aria-label={`Remove ${item.address} from Homes in Diligence`}
              data-testid={`button-remove-watchlist-${item.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-1 pl-10 pr-1">
          <WatchlistMetaRail
            plannedVisitAt={item.plannedVisitAt}
            visitedAt={item.visitedAt}
            noteCount={noteCount}
            reminderEnabled={Boolean(item.reminderEnabled)}
            hasShared={hasShared}
            onContribute={
              item.visitedAt ? () => onContribute(item) : undefined
            }
          />
        </div>
      </div>

      {open ? (
        <div className="animate-bfi-fade space-y-2 border-t border-white/15 px-3 pb-3 pt-2">
          {!planning ? (
            <>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[11px] text-night-faint">
                  {item.city}, {item.state} · {item.bedrooms} bd · {item.bathrooms} ba
                </p>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="shrink-0 text-[12px] font-semibold text-saffron-glow touch-manipulation"
                >
                  Open →
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleMarkVisited}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold touch-manipulation',
                    status === 'visited'
                      ? 'border-saffron/55 bg-saffron/25 text-saffron-glow'
                      : 'border-white/25 bg-transparent text-night-muted hover:border-saffron/40 hover:text-saffron-glow',
                  )}
                  aria-pressed={status === 'visited'}
                  data-testid={`button-mark-visited-${item.id}`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {status === 'visited' ? 'Visited' : 'Mark visited'}
                </button>

                {item.plannedVisitAt ? (
                  <button
                    type="button"
                    onClick={() => onChange(setWatchlistPlannedVisit(item.id, null))}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/25 bg-transparent px-3 text-xs font-semibold text-night-muted touch-manipulation"
                    data-testid={`button-clear-plan-${item.id}`}
                  >
                    Clear plan
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          <VisitPlanPicker
            value={item.plannedVisitAt}
            onSave={handleSavePlan}
            onOpenChange={setPlanning}
            testId={`plan-visit-${item.id}`}
          />

          {!planning ? (
            <PropertyNotes propertyId={item.id} onNotesChange={setNoteCount} />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function WatchlistScreen() {
  const navigate = useNavigate()
  const { ownerId } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>(() => loadWatchlist())
  const [filter, setFilter] = useState<'all' | 'planned' | 'visited'>('all')

  useEffect(() => {
    let cancelled = false
    const refreshLocal = () => {
      setItems(loadWatchlist())
      checkDueVisitReminders()
    }

    void import('@/lib/diligenceSync')
      .then(async (mod) => {
        const remote = await mod.pullDiligenceFromCloud()
        if (!cancelled) setItems(remote)
      })
      .catch(() => {
        if (!cancelled) refreshLocal()
      })

    refreshLocal()
    window.addEventListener('focus', refreshLocal)
    const timer = window.setInterval(() => checkDueVisitReminders(), 60_000)
    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshLocal)
      window.clearInterval(timer)
    }
  }, [ownerId])

  const plannedCount = items.filter((item) => visitPlanStatus(item) === 'planned').length
  const visitedCount = items.filter((item) => visitPlanStatus(item) === 'visited').length

  const visibleItems =
    filter === 'all'
      ? items
      : items.filter((item) => visitPlanStatus(item) === filter)

  const filterHint =
    filter === 'planned'
      ? 'Showing planned visits only.'
      : filter === 'visited'
        ? 'Showing visited properties only.'
        : 'Sorted: upcoming plans first, then not visited, then visited.'

  return (
    <AppShell scene="watchlist" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
      <PageHeader
        title="Homes in Diligence"
        description="Plan visits, mark visited, and keep private notes."
        testId="watchlist-top-bar"
      />

      <div className="flex-1 overflow-y-auto px-3 py-4 pb-4">
        {items.length === 0 ? (
          <div
            className="rounded-2xl border border-white/25 bg-transparent p-5 text-center"
            data-testid="watchlist-empty"
          >
            <Star className="mx-auto h-8 w-8 text-saffron-glow" strokeWidth={1.75} />
            <p className="mt-3 text-sm font-semibold text-saffron-glow">No homes in diligence yet</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-night-muted">
              Star an address from its property page. Notes and visit planning live here afterward.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-saffron px-4 text-sm font-semibold text-white touch-manipulation"
              data-testid="button-watchlist-go-search"
            >
              Go to Search
            </button>
          </div>
        ) : (
          <section className="space-y-3" data-testid="watchlist-list">
            <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Filter homes in diligence">
              {(
                [
                  { id: 'all' as const, label: 'All', count: items.length, testId: 'watchlist-filter-saved' },
                  {
                    id: 'planned' as const,
                    label: 'Planned',
                    count: plannedCount,
                    testId: 'watchlist-filter-planned',
                  },
                  {
                    id: 'visited' as const,
                    label: 'Visited',
                    count: visitedCount,
                    testId: 'watchlist-filter-visited',
                  },
                ] as const
              ).map((stat) => {
                const active = filter === stat.id
                return (
                  <button
                    key={stat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(stat.id)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-center transition-colors touch-manipulation',
                      active
                        ? 'border-saffron/50 bg-saffron/15'
                        : 'border-white/25 bg-transparent hover:border-saffron/35',
                    )}
                    data-testid={stat.testId}
                  >
                    <p
                      className={cn(
                        'text-[10px] font-bold tracking-wide uppercase',
                        active ? 'text-saffron-glow' : 'text-saffron-glow/90',
                      )}
                    >
                      {stat.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-night-ink">{stat.count}</p>
                  </button>
                )
              })}
            </div>

            <p className="px-1 text-center text-[11px] text-night-faint">{filterHint}</p>

            {visibleItems.length === 0 ? (
              <div
                className="rounded-2xl border border-white/25 bg-transparent p-5 text-center"
                data-testid="watchlist-filter-empty"
              >
                <p className="text-sm font-semibold text-saffron-glow">
                  {filter === 'planned' ? 'No planned visits' : 'No visited properties'}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-night-muted">
                  {filter === 'planned'
                    ? 'Schedule a visit on a home in diligence, then come back here.'
                    : 'Mark a property visited after you go, then it will show up here.'}
                </p>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-4 text-sm font-semibold text-night-muted transition-colors hover:border-saffron/40 hover:text-saffron-glow touch-manipulation"
                  data-testid="button-watchlist-show-all"
                >
                  Show all homes
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {visibleItems.map((item) => (
                  <WatchlistRow
                    key={item.id}
                    item={item}
                    onChange={setItems}
                    onRemove={(id) => setItems(removeFromWatchlist(id))}
                    onOpen={(row) => navigate(propertyPath(row))}
                    onContribute={(row) => {
                      persistBuyerVerified(row.id, true)
                      navigate(propertyPath(row, { catchup: 'buyer-insights' }))
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}
