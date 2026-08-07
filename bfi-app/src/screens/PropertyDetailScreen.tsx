import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  Crosshair,
  FileText,
  History,
  Plus,
  Receipt,
  School,
  ShieldCheck,
  StickyNote,
  Star,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CatchUpFlow, type CatchUpSurface } from '@/components/catchup/CatchUpFlow'
import { fetchSurfaceApi } from '@/data/catchUpApi'
import {
  DEMO_PROPERTY,
  SEARCH_HISTORY,
  getMetricCards,
  resolvePropertyFromQuery,
  type HistoryAddress,
  type MetricCard,
} from '@/data/mockProperty'
import { cn } from '@/lib/utils'

const NOTES_STORAGE_KEY = 'bfi.property-notes'

type SavedNote = {
  id: string
  text: string
  createdAt: string
}

function loadNotes(propertyKey: string): SavedNote[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, SavedNote[]>
    return Array.isArray(all[propertyKey]) ? all[propertyKey]! : []
  } catch {
    return []
  }
}

function persistNotes(propertyKey: string, notes: SavedNote[]) {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, SavedNote[]>) : {}
    all[propertyKey] = notes
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage failures in demo shell
  }
}

const metricIcons: Record<MetricCard['accent'], LucideIcon> = {
  'county-facts': FileText,
  'sales-history': History,
  'tax-history': Receipt,
  'verified-visits': ShieldCheck,
  'buyer-insights': Users,
  schools: School,
}

const metricIconWrap: Record<MetricCard['accent'], string> = {
  'county-facts': 'bg-saffron/25 text-saffron-glow',
  'sales-history': 'bg-saffron-bright/25 text-saffron-glow',
  'tax-history': 'bg-saffron/20 text-saffron-glow',
  'verified-visits': 'bg-night-ink/15 text-saffron-glow',
  'buyer-insights': 'bg-saffron/25 text-saffron-glow',
  schools: 'bg-saffron-bright/20 text-saffron-glow',
}

const metricToSurface: Record<MetricCard['id'], CatchUpSurface> = {
  'county-facts': 'county-facts',
  'sales-history': 'sales-history',
  'tax-history': 'tax-history',
  'verified-visits': 'verified-visits',
  'buyer-insights': 'buyer-insights',
  schools: 'schools',
}

function truncateAddress(address: string, max = 22) {
  if (address.length <= max) return address
  return `${address.slice(0, max - 1)}…`
}

function HistoryRow({
  item,
  onSelect,
}: {
  item: HistoryAddress
  onSelect: (item: HistoryAddress) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-night-ink/10 touch-manipulation"
      data-testid={`history-${item.id}`}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-night-ink">
        {item.address}
        <span className="text-night-faint">
          {' '}
          · {item.city}, {item.state}
        </span>
      </span>
      {item.hasPrivateNotes ? (
        <StickyNote
          className="h-3.5 w-3.5 shrink-0 text-saffron-bright"
          aria-label="Has private notes"
          data-testid={`history-notes-${item.id}`}
        />
      ) : null}
      {item.saved ? (
        <span className="shrink-0 text-[10px] font-semibold tracking-wide text-saffron-glow uppercase">
          Saved
        </span>
      ) : null}
    </button>
  )
}

export function PropertyDetailScreen() {
  const navigate = useNavigate()
  const { address = '' } = useParams<{ address: string }>()
  const decoded = decodeURIComponent(address)
  const property = useMemo(
    () => resolvePropertyFromQuery(decoded || DEMO_PROPERTY.address),
    [decoded],
  )
  const propertyKey = property.id

  const [starred, setStarred] = useState(property.starred)
  const [notesOpen, setNotesOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [activeSurface, setActiveSurface] = useState<CatchUpSurface | null>(null)
  const [notes, setNotes] = useState<SavedNote[]>(() => loadNotes(propertyKey))
  const [draftNote, setDraftNote] = useState('')

  useEffect(() => {
    setNotes(loadNotes(propertyKey))
    setDraftNote('')
  }, [propertyKey])

  const metrics = useMemo(() => getMetricCards(property), [property])
  const truncated = truncateAddress(property.address)

  function openHistoryAddress(item: HistoryAddress) {
    const full = `${item.address}, ${item.city}, ${item.state}`
    navigate(`/property/${encodeURIComponent(full)}`)
    setActiveSurface(null)
  }

  function handleSaveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draftNote.trim()
    if (!text) return

    const next: SavedNote[] = [
      {
        id: `note-${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ]
    setNotes(next)
    persistNotes(propertyKey, next)
    setDraftNote('')
  }

  function handleDeleteNote(noteId: string) {
    const next = notes.filter((note) => note.id !== noteId)
    setNotes(next)
    persistNotes(propertyKey, next)
  }

  return (
    <AppShell
      className="bfi-night-wash"
      contentClassName="min-h-0 bfi-night-wash text-night-ink"
    >
      <header
        className="sticky top-0 z-20 border-b border-night-line bg-coastal/90 backdrop-blur-md"
        data-testid="property-top-bar"
      >
        <div className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setStarred((value) => !value)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-night-ink/10 hover:text-saffron-glow touch-manipulation"
            aria-label={starred ? 'Unstar property' : 'Star property'}
            aria-pressed={starred}
            data-testid="button-star-property"
          >
            <Star
              className={cn('h-5 w-5', starred && 'fill-saffron-bright text-saffron-bright')}
              strokeWidth={starred ? 0 : 2}
            />
          </button>

          <h1
            className="truncate text-center font-display text-[15px] font-semibold tracking-tight text-night-ink"
            title={`${property.address}, ${property.city}, ${property.state} ${property.zipCode}`}
            data-testid="text-truncated-address"
          >
            {truncated}
          </h1>

          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-saffron/45 bg-saffron/20 px-3 text-xs font-bold tracking-wide text-saffron-glow transition-colors hover:bg-saffron/30 touch-manipulation"
            aria-label="GPS Verify"
            data-testid="badge-gps-verify"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Verify
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-4">
        <section className="px-3 pt-4" aria-label="Quick actions" data-testid="metric-cards">
          <div className="flex gap-3 overflow-x-auto px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {metrics.map((card) => {
              const Icon = metricIcons[card.accent]
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveSurface(metricToSurface[card.id])}
                  className="relative flex w-[5.5rem] shrink-0 flex-col items-center gap-2 rounded-2xl bg-transparent px-1 py-1 text-center transition-opacity active:opacity-70 touch-manipulation"
                  aria-label={`${card.title}. ${card.subtitle}`}
                  title={card.detail}
                  data-testid={`metric-${card.id}`}
                >
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-coastal-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(255_248_247/0.12)]">
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-[14px]',
                        metricIconWrap[card.accent],
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    {card.badge ? (
                      <span className="absolute -top-1 -right-1 max-w-[2.75rem] truncate rounded-full bg-saffron px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_4px_10px_rgb(232_145_58/0.35)]">
                        {card.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="w-full text-[11px] font-medium leading-tight text-night-ink">
                    {card.title}
                  </span>
                  <span className="w-full text-[10px] leading-tight text-night-faint">
                    {card.subtitle}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Notes — first, replaces new address search */}
        <section className="mt-5 px-3" data-testid="notes-section">
          <button
            type="button"
            onClick={() => setNotesOpen((open) => !open)}
            className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
            aria-expanded={notesOpen}
            data-testid="button-toggle-notes"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-saffron-glow transition-transform',
                !notesOpen && '-rotate-90',
              )}
            />
            <StickyNote className="h-3.5 w-3.5 text-saffron-bright" aria-hidden />
            <span className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
              Notes
            </span>
            <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
              {notes.length}
            </span>
          </button>

          {notesOpen ? (
            <div className="animate-bfi-fade mt-1 space-y-2 rounded-2xl border border-night-line bg-coastal-deep/55 p-3 shadow-sm backdrop-blur-sm">
              <p className="px-0.5 text-[11px] text-night-faint">
                Save private details about this address
              </p>
              <form onSubmit={handleSaveNote} className="space-y-2" data-testid="notes-form">
                <textarea
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  rows={3}
                  placeholder="Add a note for this property…"
                  className="w-full resize-none rounded-xl border border-night-line bg-coastal-deep/70 px-3 py-2.5 text-sm text-night-ink outline-none placeholder:text-night-faint focus:border-saffron/60"
                  data-testid="input-property-note"
                />
                <button
                  type="submit"
                  disabled={!draftNote.trim()}
                  className={cn(
                    'inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors touch-manipulation',
                    draftNote.trim()
                      ? 'bg-saffron text-white hover:bg-saffron-deep shadow-[0_6px_16px_rgb(232_145_58/0.3)]'
                      : 'bg-night-ink/10 text-night-faint',
                  )}
                  data-testid="button-save-note"
                >
                  <Plus className="h-4 w-4" />
                  Save note
                </button>
              </form>

              {notes.length > 0 ? (
                <ul className="space-y-2 pt-1" data-testid="notes-list">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="flex gap-2 rounded-xl border border-night-line bg-coastal-deep/60 px-3 py-2.5"
                    >
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-bright" aria-hidden />
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
                        onClick={() => handleDeleteNote(note.id)}
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
                <p className="px-0.5 pb-1 text-[12px] text-night-faint">
                  No notes yet for {property.address}.
                </p>
              )}
            </div>
          ) : null}
        </section>

        {/* Searched History — after Notes */}
        <section className="mt-4 px-3" data-testid="history-section">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
            aria-expanded={historyOpen}
            data-testid="button-toggle-history"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-saffron-glow transition-transform',
                !historyOpen && '-rotate-90',
              )}
            />
            <span className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
              Searched History
            </span>
            <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
              {SEARCH_HISTORY.length}
            </span>
          </button>

          {historyOpen ? (
            <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-night-line bg-coastal-deep/55 p-2 shadow-sm backdrop-blur-sm">
              <p className="px-2 pb-1 text-[11px] text-night-faint">
                Previously searched and saved addresses
              </p>
              {SEARCH_HISTORY.map((item) => (
                <HistoryRow key={item.id} item={item} onSelect={openHistoryAddress} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {activeSurface ? (
        <CatchUpFlow
          key={activeSurface}
          surface={activeSurface}
          response={fetchSurfaceApi(activeSurface, property)}
          onClose={() => setActiveSurface(null)}
        />
      ) : null}
    </AppShell>
  )
}
