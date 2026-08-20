import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { formatPresenceDay, latestPresenceEvent } from '@/data/ownerScope'
import {
  OBSERVATION_FIELDS,
  type ObservationField,
  type ObservationFieldId,
} from '@/data/observationFields'
import { useCommunityObservation } from '@/lib/useCommunityObservation'
import { cn } from '@/lib/utils'

function FieldRadios({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ObservationField
  value: string
  disabled: boolean
  onChange: (optionId: string) => void
}) {
  return (
    <fieldset className="space-y-1" data-testid={`observation-field-${field.id}`}>
      <legend className="px-1 pb-1 text-[13px] font-semibold text-night-ink">{field.title}</legend>
      <div className="space-y-0.5">
        {field.options.map((option) => {
          const selected = value === option.id
          return (
            <label
              key={option.id}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 touch-manipulation',
                disabled ? 'opacity-70' : 'hover:bg-night-ink/10',
                selected && 'bg-saffron/10',
              )}
            >
              <input
                type="radio"
                name={`observation-${field.id}`}
                value={option.id}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.id)}
                className="h-4 w-4 accent-[var(--color-saffron)]"
                data-testid={`observation-${field.id}-${option.id}`}
              />
              <span className="text-[13px] leading-snug text-night-ink">{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function FieldTally({
  field,
  counts,
  total,
}: {
  field: ObservationField
  counts: Record<string, number>
  total: number
}) {
  return (
    <section data-testid={`observation-tally-${field.id}`}>
      <p className="px-1 pb-1 text-[13px] font-semibold text-night-ink">{field.title}</p>
      <div className="space-y-1">
        {field.options.map((option) => {
          const count = counts[option.id] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div
              key={option.id}
              className="flex min-h-9 items-center gap-2 rounded-lg px-2"
              data-testid={`tally-${field.id}-${option.id}`}
            >
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-night-ink">
                {option.label}
              </span>
              <span className="w-16 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-1.5 rounded-full bg-saffron/70"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-6 text-right text-[12px] font-semibold tabular-nums text-night-ink">
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

type BuyerCommunityPanelProps = {
  propertyId: string
}

/**
 * Buyer Community: one GPS-gated structured observation per buyer.
 * Aggregates option counts. No Plus/Watch, no upvotes, no free text.
 */
export function BuyerCommunityPanel({ propertyId }: BuyerCommunityPanelProps) {
  const { ownerId } = useAuth()
  const {
    draft,
    submitted,
    onSiteOpen,
    summary,
    saving,
    saveError,
    setAnswer,
    submit,
    observationCount,
  } = useCommunityObservation(propertyId)
  const latestPresence = latestPresenceEvent(propertyId)
  const [savedFlash, setSavedFlash] = useState(false)
  const alreadySubmitted = submitted != null

  async function handleSubmit() {
    const ok = await submit()
    if (ok) {
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1600)
    }
  }

  return (
    <div
      className="mt-6 space-y-4 px-3 pt-1"
      data-testid="buyer-community-panel"
      data-owner={ownerId}
    >
      <div
        className="flex min-h-11 items-center justify-center px-2 py-1.5"
        data-testid="buyer-community-page-title"
      >
        <h2 className="text-center font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          Buyer Community
        </h2>
      </div>

      <p
        className="rounded-xl border border-white/20 bg-transparent px-3 py-2 text-[12px] leading-snug text-night-ink"
        data-testid="buyer-community-window-note"
      >
        {latestPresence
          ? onSiteOpen
            ? `You confirmed presence on ${formatPresenceDay(latestPresence.confirmedAt)}. That date stays. Submit one observation form for this address — you can update it for 2 weeks.`
            : `You confirmed presence on ${formatPresenceDay(latestPresence.confirmedAt)}. That date stays on the log. The 2-week observation window has ended — Confirm on site to add or update yours.`
          : 'Confirm presence at this pin to submit one structured observation. Fields are fixed. There is no free text, rating, or Plus/Watch vote.'}
      </p>

      {onSiteOpen ? (
        <section
          className="space-y-3 rounded-2xl border border-white/20 bg-night-elevated/45 px-3 py-3"
          data-testid="observation-form"
        >
          <div>
            <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
              Your observation
            </p>
            <p className="mt-1 text-[12px] leading-snug text-night-ink">
              One form per buyer. Choose what you saw during this visit — or mark not evaluated.
            </p>
          </div>

          {OBSERVATION_FIELDS.map((field) => (
            <FieldRadios
              key={field.id}
              field={field}
              value={draft[field.id]}
              disabled={saving}
              onChange={(optionId) => setAnswer(field.id as ObservationFieldId, optionId)}
            />
          ))}

          {saveError ? (
            <p className="px-1 text-[11px] leading-snug text-watch-glow" role="status">
              {saveError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-saffron/45 bg-saffron/15 px-4 text-[12px] font-semibold text-saffron-glow touch-manipulation disabled:opacity-60"
            data-testid="button-submit-observation"
          >
            {saving
              ? 'Saving…'
              : savedFlash
                ? 'Saved'
                : alreadySubmitted
                  ? 'Update observation'
                  : 'Submit observation'}
          </button>
        </section>
      ) : null}

      <section
        className="space-y-3 rounded-2xl border border-white/20 bg-transparent px-3 py-3"
        data-testid="observation-tallies"
      >
        <div>
          <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
            This home&apos;s observations
          </p>
          <p className="mt-1 text-[12px] leading-snug text-night-ink">
            {observationCount} buyer{observationCount === 1 ? '' : 's'} submitted a form. Counts
            are property-level tallies — not ratings.
          </p>
        </div>
        {OBSERVATION_FIELDS.map((field) => (
          <FieldTally
            key={field.id}
            field={field}
            counts={summary?.fields[field.id] ?? (submitted ? { [submitted[field.id]]: 1 } : {})}
            total={observationCount}
          />
        ))}
      </section>
    </div>
  )
}
