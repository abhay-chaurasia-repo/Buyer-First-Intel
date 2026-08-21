import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import {
  DILIGENCE_CHECKLIST_ITEMS,
  diligenceChecklistStats,
  loadDiligenceChecklistProgress,
  persistDiligenceChecklistProgress,
  type DiligenceChecklistProgress,
} from '@/data/propertyDiligenceChecklist'
import { cn } from '@/lib/utils'

type PropertyDiligenceChecklistProps = {
  propertyId: string
}

export function PropertyDiligenceChecklist({ propertyId }: PropertyDiligenceChecklistProps) {
  const { ownerId } = useAuth()
  const [progress, setProgress] = useState<DiligenceChecklistProgress>(() =>
    loadDiligenceChecklistProgress(propertyId),
  )
  const stats = useMemo(() => diligenceChecklistStats(progress), [progress])

  useEffect(() => {
    setProgress(loadDiligenceChecklistProgress(propertyId))
  }, [propertyId, ownerId])

  function handleToggle(itemId: string) {
    setProgress((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] }
      persistDiligenceChecklistProgress(propertyId, next)
      return next
    })
  }

  return (
    <section
      className="rounded-2xl border border-white/20 bg-night-elevated/45 px-3 py-3"
      data-testid="property-diligence-checklist"
      data-property-id={propertyId}
    >
      <div className="flex items-start gap-2 px-0.5">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-saffron-glow" strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
            This home&apos;s checklist
          </p>
          <p className="mt-1 text-[12px] leading-snug text-night-ink">
            Due diligence for this address only. Journey is your overall buying path — not this
            list.
          </p>
        </div>
        <span
          className="shrink-0 rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow"
          data-testid="diligence-checklist-count"
        >
          {stats.done}/{stats.total}
        </span>
      </div>

      <div className="mt-2 space-y-1">
        {DILIGENCE_CHECKLIST_ITEMS.map((item) => {
          const checked = Boolean(progress[item.id])
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleToggle(item.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors touch-manipulation',
                checked ? 'bg-saffron/10' : 'hover:bg-night-ink/10',
              )}
              aria-pressed={checked}
              data-testid={`diligence-item-${item.id}`}
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
                <span className="mt-0.5 block text-[11px] leading-relaxed text-night-ink">
                  {item.detail}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
