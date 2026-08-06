import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  Crosshair,
  Hash,
  StickyNote,
  Star,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  DEMO_PROPERTY,
  SEARCH_HISTORY,
  PROPERTY_CHANNELS,
  getChannelCanvas,
  getMetricCards,
  resolvePropertyFromQuery,
  type HistoryAddress,
  type MetricCard,
  type PropertyChannelId,
} from '@/data/mockProperty'
import { cn } from '@/lib/utils'

const metricToneClass: Record<MetricCard['tone'], string> = {
  alert: 'border-alert/25 bg-alert-soft text-alert',
  info: 'border-action/20 bg-action-soft text-action',
  neutral: 'border-line bg-paper text-ink',
  verified: 'border-verified/25 bg-verified-soft text-verified',
}

const metricToChannel: Record<MetricCard['id'], PropertyChannelId> = {
  'catch-up': '01-property-summary',
  huddles: '01-property-summary',
  later: '03-sales-and-deed',
  verified: '07-verified-buyer-insights',
}

function truncateAddress(address: string, max = 22) {
  if (address.length <= max) return address
  return `${address.slice(0, max - 1)}…`
}

function ChannelCanvasOverlay({
  channelId,
  property,
  onClose,
}: {
  channelId: PropertyChannelId
  property: ReturnType<typeof resolvePropertyFromQuery>
  onClose: () => void
}) {
  const canvas = getChannelCanvas(channelId, property)

  return (
    <div
      className="animate-bfi-fade fixed inset-0 z-[60] flex justify-center bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-canvas-title"
      data-testid="channel-canvas-overlay"
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-paper-elevated shadow-2xl">
        <header className="flex items-center gap-2 border-b border-line px-3 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-paper hover:text-ink touch-manipulation"
            aria-label="Close channel"
            data-testid="button-close-channel"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
              #{canvas.id}
            </p>
            <h2
              id="channel-canvas-title"
              className="truncate font-display text-lg font-semibold tracking-tight text-ink"
            >
              {canvas.title}
            </h2>
          </div>
        </header>

        <div className="animate-bfi-channel-in flex-1 overflow-y-auto px-4 py-5">
          <p className="text-sm leading-relaxed text-ink-muted">{canvas.subtitle}</p>

          {canvas.apiStub ? (
            <p
              className="mt-3 rounded-xl border border-dashed border-line bg-paper px-3 py-2 font-mono text-[11px] text-ink-faint"
              data-testid="channel-api-stub"
            >
              {canvas.apiStub.method} {canvas.apiStub.endpoint}
              <span className="mx-1.5 text-line-strong">·</span>
              {canvas.apiStub.resourceKey}
            </p>
          ) : null}

          <dl className="mt-5 space-y-3">
            {canvas.fields.map((field) => (
              <div
                key={`${field.label}-${field.value}`}
                className="rounded-2xl border border-line bg-paper-elevated px-4 py-3 shadow-sm"
              >
                <dt className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                  {field.label}
                </dt>
                <dd className="mt-1 text-[0.95rem] font-semibold text-ink">{field.value}</dd>
                {field.source ? (
                  <p className="mt-1 text-xs text-ink-faint">Source: {field.source}</p>
                ) : null}
              </div>
            ))}
          </dl>

          {canvas.notes && canvas.notes.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-display text-sm font-semibold text-ink">Notes</h3>
              <ul className="mt-3 space-y-2">
                {canvas.notes.map((note) => (
                  <li
                    key={note}
                    className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink-muted"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
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
      className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10 touch-manipulation"
      data-testid={`history-${item.id}`}
    >
      <Hash className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
        {item.address}
        <span className="text-slate-500">
          {' '}
          · {item.city}, {item.state}
        </span>
      </span>
      {item.hasPrivateNotes ? (
        <StickyNote
          className="h-3.5 w-3.5 shrink-0 text-amber-300"
          aria-label="Has private notes"
          data-testid={`history-notes-${item.id}`}
        />
      ) : null}
      {item.saved ? (
        <span className="shrink-0 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
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

  const [starred, setStarred] = useState(property.starred)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [activeChannel, setActiveChannel] = useState<PropertyChannelId | null>(null)

  const metrics = useMemo(() => getMetricCards(property), [property])
  const truncated = truncateAddress(property.address)

  function openHistoryAddress(item: HistoryAddress) {
    const full = `${item.address}, ${item.city}, ${item.state}`
    navigate(`/property/${encodeURIComponent(full)}`)
    setActiveChannel(null)
  }

  return (
    <AppShell
      className="bg-[#1a1d21]"
      contentClassName="min-h-0 bg-[#1a1d21] text-white"
    >
      {/* 1. Top Bar — Slack mobile style */}
      <header
        className="sticky top-0 z-20 border-b border-white/10 bg-[#1a1d21]/95 backdrop-blur-md"
        data-testid="property-top-bar"
      >
        <div className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setStarred((value) => !value)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white touch-manipulation"
            aria-label={starred ? 'Unstar property' : 'Star property'}
            aria-pressed={starred}
            data-testid="button-star-property"
          >
            <Star
              className={cn('h-5 w-5', starred && 'fill-amber-300 text-amber-300')}
              strokeWidth={starred ? 0 : 2}
            />
          </button>

          <h1
            className="truncate text-center font-display text-[15px] font-semibold tracking-tight text-white"
            title={`${property.address}, ${property.city}, ${property.state} ${property.zipCode}`}
            data-testid="text-truncated-address"
          >
            {truncated}
          </h1>

          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-teal-400/40 bg-teal-400/15 px-3 text-xs font-bold tracking-wide text-teal-200 transition-colors hover:bg-teal-400/25 touch-manipulation"
            aria-label="GPS Verify"
            data-testid="badge-gps-verify"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Verify
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* 2. Top Row Cards — 4 metric summary boxes */}
        <section className="px-3 pt-4" aria-label="Metric summaries" data-testid="metric-cards">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {metrics.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveChannel(metricToChannel[card.id])}
                className={cn(
                  'min-h-[5.75rem] w-[8.35rem] shrink-0 rounded-2xl border px-3 py-3 text-left shadow-sm transition-transform active:scale-[0.98] touch-manipulation',
                  metricToneClass[card.tone],
                )}
                data-testid={`metric-${card.id}`}
              >
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase opacity-80">
                  {card.title}
                </p>
                <p className="mt-1 font-display text-xl font-bold leading-none tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold leading-snug opacity-90">
                  {card.subtitle}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug opacity-70">{card.detail}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Unreads / History — collapsible */}
        <section className="mt-5 px-3" data-testid="history-section">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
            aria-expanded={historyOpen}
            data-testid="button-toggle-history"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform',
                !historyOpen && '-rotate-90',
              )}
            />
            <span className="font-display text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
              Unreads
            </span>
            <span className="text-[11px] font-medium text-slate-500">History</span>
            <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
              {SEARCH_HISTORY.length}
            </span>
          </button>

          {historyOpen ? (
            <div className="animate-bfi-fade mt-1 space-y-0.5 rounded-2xl border border-white/10 bg-[#12151a] p-2">
              <p className="px-2 pb-1 text-[11px] text-slate-500">
                Previously searched and saved addresses
              </p>
              {SEARCH_HISTORY.map((item) => (
                <HistoryRow key={item.id} item={item} onSelect={openHistoryAddress} />
              ))}
            </div>
          ) : null}
        </section>

        {/* 4. Property Channels List */}
        <section className="mt-5 px-3" aria-label="Property channels" data-testid="channels-list">
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="font-display text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
              Channels
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <ul className="space-y-0.5">
            {PROPERTY_CHANNELS.map((channel) => (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => setActiveChannel(channel.id)}
                  className="flex w-full min-h-12 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/10 touch-manipulation"
                  data-testid={`channel-${channel.id}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-400">
                    <Hash className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-100">
                      {channel.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {channel.description}
                    </span>
                  </span>
                  {channel.unread ? (
                    <span className="rounded-md bg-action px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {channel.unread}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 px-2">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center text-sm font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline"
              data-testid="link-new-search"
            >
              ← New address search
            </Link>
          </div>
        </section>
      </div>

      {/* 5. Channel Canvas overlay */}
      {activeChannel ? (
        <ChannelCanvasOverlay
          channelId={activeChannel}
          property={property}
          onClose={() => setActiveChannel(null)}
        />
      ) : null}
    </AppShell>
  )
}
