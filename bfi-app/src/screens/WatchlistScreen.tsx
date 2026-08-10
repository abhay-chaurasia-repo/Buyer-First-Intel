import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  Check,
  ChevronDown,
  MapPin,
  Plus,
  Star,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  addNote,
  deleteNote,
  loadNotes,
  type SavedNote,
} from '@/data/propertyNotesStorage'
import {
  fromDatetimeLocalValue,
  loadWatchlist,
  markWatchlistVisited,
  propertyPath,
  removeFromWatchlist,
  setWatchlistPlannedVisit,
  toDatetimeLocalValue,
  visitPlanStatus,
  type WatchlistItem,
} from '@/data/watchlistStorage'
import { cn } from '@/lib/utils'

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

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

function VisitDateChip({
  kind,
  iso,
  compact = false,
}: {
  kind: 'planned' | 'visited'
  iso: string
  compact?: boolean
}) {
  const isVisited = kind === 'visited'
  const label = isVisited ? 'Visited' : 'Planned'
  const when = compact ? formatVisitDateCompact(iso) : formatVisitWhen(iso)

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg border',
        compact ? 'px-1.5 py-0.5' : 'px-2.5 py-1.5',
        isVisited
          ? 'border-saffron/45 bg-saffron/18 text-saffron-glow'
          : 'border-saffron/30 bg-saffron/10 text-saffron-glow',
      )}
      title={`${label} ${formatVisitWhen(iso)}`}
      data-testid={`visit-date-${kind}`}
    >
      {isVisited ? (
        <Check className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} strokeWidth={2.5} aria-hidden />
      ) : (
        <CalendarClock className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden />
      )}
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            'block font-bold tracking-wide uppercase',
            compact ? 'text-[8px] opacity-80' : 'text-[9px] opacity-85',
          )}
        >
          {label}
        </span>
        <span className={cn('block truncate font-semibold', compact ? 'text-[10px]' : 'text-[12px]')}>
          {when}
        </span>
      </span>
    </span>
  )
}

function VisitDatesRow({
  plannedVisitAt,
  visitedAt,
  compact = false,
}: {
  plannedVisitAt?: string | null
  visitedAt?: string | null
  compact?: boolean
}) {
  if (!plannedVisitAt && !visitedAt) return null

  return (
    <div className={cn('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
      {plannedVisitAt ? <VisitDateChip kind="planned" iso={plannedVisitAt} compact={compact} /> : null}
      {visitedAt ? <VisitDateChip kind="visited" iso={visitedAt} compact={compact} /> : null}
    </div>
  )
}

function PropertyNotes({
  propertyId,
  onNotesChange,
}: {
  propertyId: string
  onNotesChange?: (count: number) => void
}) {
  const [open, setOpen] = useState(true)
  const [notes, setNotes] = useState<SavedNote[]>(() => loadNotes(propertyId))
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const next = loadNotes(propertyId)
    setNotes(next)
    setDraft('')
    onNotesChange?.(next.length)
  }, [propertyId, onNotesChange])

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    const next = addNote(propertyId, draft)
    setNotes(next)
    onNotesChange?.(next.length)
    setDraft('')
  }

  function handleDelete(noteId: string) {
    const next = deleteNote(propertyId, noteId)
    setNotes(next)
    onNotesChange?.(next.length)
  }

  return (
    <div className="border-t border-white/15 pt-3" data-testid={`notes-section-${propertyId}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-10 items-center gap-2 rounded-xl px-1 text-left touch-manipulation"
        aria-expanded={open}
        data-testid={`button-toggle-notes-${propertyId}`}
      >
        <ChevronDown
          className={cn('h-4 w-4 text-saffron-glow transition-transform', !open && '-rotate-90')}
        />
        <StickyNote className="h-3.5 w-3.5 text-saffron-glow" aria-hidden />
        <span className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          Notes
        </span>
        <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
          {notes.length}
        </span>
      </button>

      {open ? (
        <div className="animate-bfi-fade mt-2 space-y-2">
          <p className="px-0.5 text-[11px] text-night-faint">
            Private notes for this saved address
          </p>
          <form onSubmit={handleSave} className="space-y-2" data-testid={`notes-form-${propertyId}`}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="Add a note…"
              className="w-full resize-none rounded-xl border border-white/20 bg-transparent px-3 py-2.5 text-sm text-night-ink outline-none placeholder:text-night-faint focus:border-saffron/60"
              data-testid={`input-property-note-${propertyId}`}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className={cn(
                'inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors touch-manipulation',
                draft.trim()
                  ? 'bg-saffron text-white hover:bg-saffron-deep shadow-[0_6px_16px_rgb(232_145_58/0.3)]'
                  : 'bg-night-ink/10 text-night-faint',
              )}
              data-testid={`button-save-note-${propertyId}`}
            >
              <Plus className="h-4 w-4" />
              Save note
            </button>
          </form>

          {notes.length > 0 ? (
            <ul className="space-y-2" data-testid={`notes-list-${propertyId}`}>
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="flex gap-2 rounded-xl border border-white/20 bg-transparent px-3 py-2.5"
                >
                  <StickyNote
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-glow"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-night-ink whitespace-pre-wrap">
                      {note.text}
                    </p>
                    <p className="mt-1 text-[10px] text-night-faint">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-night-faint transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
                    aria-label="Delete note"
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-0.5 pb-1 text-[12px] text-night-faint">No notes yet.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function WatchlistRow({
  item,
  onChange,
  onRemove,
  onOpen,
}: {
  item: WatchlistItem
  onChange: (items: WatchlistItem[]) => void
  onRemove: (id: string) => void
  onOpen: (item: WatchlistItem) => void
}) {
  const [open, setOpen] = useState(false)
  const status = visitPlanStatus(item)
  const plannedValue = toDatetimeLocalValue(item.plannedVisitAt)
  const [noteCount, setNoteCount] = useState(() => loadNotes(item.id).length)

  return (
    <li
      className="rounded-xl border border-white/25 bg-transparent"
      data-testid={`watchlist-item-${item.id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-12 items-start gap-2 px-3 py-2.5 text-left touch-manipulation"
        aria-expanded={open}
        data-testid={`button-toggle-watchlist-${item.id}`}
      >
        <ChevronDown
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 text-saffron-glow transition-transform',
            !open && '-rotate-90',
          )}
        />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="block truncate text-sm font-semibold text-saffron-glow">
            {item.address}
          </span>
          {!open ? (
            <VisitDatesRow
              plannedVisitAt={item.plannedVisitAt}
              visitedAt={item.visitedAt}
              compact
            />
          ) : null}
        </span>
        {!open && noteCount > 0 ? (
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-md bg-saffron/15 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
            <StickyNote className="h-3 w-3" aria-hidden />
            {noteCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-bfi-fade space-y-3 border-t border-white/15 px-3 pb-3 pt-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="min-w-0 flex-1 text-left touch-manipulation"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {status === 'visited' ? (
                  <span className="rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow uppercase tracking-wide">
                    Visited
                  </span>
                ) : status === 'planned' ? (
                  <span className="rounded-md bg-saffron/15 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow uppercase tracking-wide">
                    Planned
                  </span>
                ) : (
                  <span className="rounded-md bg-night-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-night-faint uppercase tracking-wide">
                    Not visited
                  </span>
                )}
                {noteCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-saffron/15 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
                    <StickyNote className="h-3 w-3" aria-hidden />
                    {noteCount}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-saffron-glow">{item.address}</p>
              <p className="mt-0.5 truncate text-[12px] text-night-muted">
                {item.city}, {item.state} {item.zipCode}
              </p>
              <p className="mt-1 text-[11px] text-night-faint">
                {item.bedrooms} bed · {item.bathrooms} bath · {item.sqft.toLocaleString()} sqft
                <span> · Saved {formatSavedAt(item.starredAt)}</span>
              </p>
              <p className="mt-2 text-[12px] font-semibold text-saffron-glow">Open property →</p>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-night-faint transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
              aria-label={`Remove ${item.address} from watchlist`}
              data-testid={`button-remove-watchlist-${item.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 border-t border-white/15 pt-3">
            {item.plannedVisitAt || item.visitedAt ? (
              <VisitDatesRow plannedVisitAt={item.plannedVisitAt} visitedAt={item.visitedAt} />
            ) : (
              <p className="flex items-center gap-1.5 text-[12px] text-night-faint">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                No visit planned yet
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange(markWatchlistVisited(item.id, status !== 'visited'))}
                className={cn(
                  'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold touch-manipulation',
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
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/25 bg-transparent px-3 text-xs font-semibold text-night-muted touch-manipulation"
                  data-testid={`button-clear-plan-${item.id}`}
                >
                  Clear plan
                </button>
              ) : null}
            </div>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-night-faint uppercase">
                <CalendarClock className="h-3 w-3 text-saffron-glow" aria-hidden />
                Plan visit date & time
              </span>
              <input
                type="datetime-local"
                value={plannedValue}
                onChange={(event) => {
                  const next = fromDatetimeLocalValue(event.target.value)
                  onChange(setWatchlistPlannedVisit(item.id, next))
                }}
                className="min-h-11 w-full rounded-xl border border-white/20 bg-transparent px-3 text-sm text-night-ink outline-none focus:border-saffron/60"
                data-testid={`input-plan-visit-${item.id}`}
              />
            </label>
          </div>

          <PropertyNotes propertyId={item.id} onNotesChange={setNoteCount} />
        </div>
      ) : null}
    </li>
  )
}

export function WatchlistScreen() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WatchlistItem[]>(() => loadWatchlist())

  useEffect(() => {
    const refresh = () => setItems(loadWatchlist())
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const plannedCount = items.filter((item) => visitPlanStatus(item) === 'planned').length
  const visitedCount = items.filter((item) => visitPlanStatus(item) === 'visited').length

  return (
    <AppShell scene="watchlist" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
      <PageHeader
        title="Saved properties"
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
            <p className="mt-3 text-sm font-semibold text-saffron-glow">No saved properties yet</p>
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
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/25 bg-transparent px-3 py-2 text-center">
                <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">Saved</p>
                <p className="mt-1 text-sm font-semibold text-night-ink">{items.length}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-transparent px-3 py-2 text-center">
                <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">Planned</p>
                <p className="mt-1 text-sm font-semibold text-night-ink">{plannedCount}</p>
              </div>
              <div className="rounded-xl border border-white/25 bg-transparent px-3 py-2 text-center">
                <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">Visited</p>
                <p className="mt-1 text-sm font-semibold text-night-ink">{visitedCount}</p>
              </div>
            </div>

            <p className="px-1 text-center text-[11px] text-night-faint">
              Sorted: upcoming plans first, then not visited, then visited.
            </p>

            <ul className="space-y-2">
              {items.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  onChange={setItems}
                  onRemove={(id) => setItems(removeFromWatchlist(id))}
                  onOpen={(row) => navigate(propertyPath(row))}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  )
}
