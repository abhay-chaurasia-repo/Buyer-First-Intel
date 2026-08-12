import { useState } from 'react'
import { ChevronDown, StickyNote } from 'lucide-react'
import type { HistoryAddress } from '@/data/mockProperty'
import { cn } from '@/lib/utils'

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
        {item.city || item.state ? (
          <span className="text-night-faint">
            {' '}
            · {[item.city, item.state].filter(Boolean).join(', ')}
          </span>
        ) : null}
      </span>
      {item.hasPrivateNotes ? (
        <StickyNote
          className="h-3.5 w-3.5 shrink-0 text-saffron-glow"
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

type SearchHistoryPanelProps = {
  items: HistoryAddress[]
  onSelect: (item: HistoryAddress) => void
  className?: string
  defaultOpen?: boolean
}

/** Collapsible searched-address history for the Search home screen. */
export function SearchHistoryPanel({
  items,
  onSelect,
  className,
  defaultOpen = true,
}: SearchHistoryPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={cn('w-full', className)} data-testid="history-section">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left touch-manipulation"
        aria-expanded={open}
        data-testid="button-toggle-history"
      >
        <ChevronDown
          className={cn('h-4 w-4 text-saffron-glow transition-transform', !open && '-rotate-90')}
        />
        <span className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          Searched History
        </span>
        <span className="ml-auto rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
          {items.length}
        </span>
      </button>

      {open ? (
        <div
          className="animate-bfi-fade mt-1 rounded-2xl border border-white/25 bg-transparent p-2"
          data-testid="history-panel"
        >
          {items.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-night-faint">
              Addresses you search for diligence will show up here.
            </p>
          ) : (
            <>
              <p className="px-2 pb-1 text-[11px] text-night-faint">
                Previously searched addresses — scroll for your full history
              </p>
              <div
                className="max-h-[11.5rem] space-y-0.5 overflow-y-auto overscroll-contain pr-0.5"
                data-testid="history-scroll"
              >
                {items.map((item) => (
                  <HistoryRow key={item.id} item={item} onSelect={onSelect} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
