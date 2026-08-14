import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type {
  MockProperty,
  PropertySaleEvent,
  PropertyTaxYear,
} from '@/data/mockProperty'
import { isMissingCountyNumber } from '@/lib/formatCountyFact'
import { cn } from '@/lib/utils'

type HistoryTab = 'sales' | 'tax'

const INITIAL_ROWS = 5

function formatDisplayDate(raw?: string) {
  if (!raw || raw === '—') return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildSalesRows(property: MockProperty): PropertySaleEvent[] {
  if (property.salesHistory && property.salesHistory.length > 0) {
    return property.salesHistory
  }
  if (property.lastSaleDate && property.lastSaleDate !== '—') {
    return [
      {
        id: 'sale-latest',
        date: property.lastSaleDate,
        deedType: property.deedType || 'Recorded transfer',
        documentNumber: property.saleDocumentNumber,
        amountLabel: property.lastSalePriceLabel || 'Not shown (buyer-first)',
      },
    ]
  }
  return []
}

function buildTaxRows(property: MockProperty): PropertyTaxYear[] {
  if (property.taxHistory && property.taxHistory.length > 0) {
    return property.taxHistory
  }
  if (!isMissingCountyNumber(property.taxYear)) {
    return [
      {
        id: `tax-current-${property.taxYear}`,
        taxYear: property.taxYear,
        taxAmountLabel: property.taxAmountLabel,
        assessedLabel: property.taxAssessedValueLabel,
        landLabel: property.taxLandLabel,
        improvementLabel: property.taxImprovementLabel,
        marketLabel: property.marketValueLabel,
      },
    ]
  }
  return []
}

function SaleRow({ event }: { event: PropertySaleEvent }) {
  const [open, setOpen] = useState(false)
  const extras = [
    event.recordedDate
      ? { label: 'Recorded', value: formatDisplayDate(event.recordedDate) }
      : null,
    event.deedCode ? { label: 'Deed code', value: event.deedCode } : null,
    event.documentType ? { label: 'Document type', value: event.documentType } : null,
    event.documentNumber ? { label: 'Document #', value: event.documentNumber } : null,
    event.buyerName ? { label: 'Buyer', value: event.buyerName } : null,
    event.sellerName ? { label: 'Seller', value: event.sellerName } : null,
    event.deedInLieu != null
      ? { label: 'Deed in lieu', value: event.deedInLieu ? 'Yes' : 'No' }
      : null,
    event.sellerCarryBack != null
      ? { label: 'Seller carry-back', value: event.sellerCarryBack ? 'Yes' : 'No' }
      : null,
    event.titleCompany ? { label: 'Title company', value: event.titleCompany } : null,
    event.lenderName ? { label: 'Lender', value: event.lenderName } : null,
    event.loanType ? { label: 'Loan type', value: event.loanType } : null,
    event.loanTermMonths
      ? { label: 'Loan term (months)', value: event.loanTermMonths }
      : null,
    event.loanDueDate
      ? { label: 'Loan due', value: formatDisplayDate(event.loanDueDate) }
      : null,
    event.loanDocumentNumber
      ? { label: 'Loan document #', value: event.loanDocumentNumber }
      : null,
    { label: 'Amount', value: event.amountLabel || 'Not shown (buyer-first)' },
  ].filter(Boolean) as { label: string; value: string }[]

  const eventLabel = [event.deedType, event.deedCode ? `(${event.deedCode})` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="border-b border-white/15 last:border-b-0" data-testid={`sale-row-${event.id}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-start gap-2 px-1 py-3 text-left touch-manipulation"
        aria-expanded={open}
      >
        <span className="text-[13px] font-medium text-night-ink">
          {formatDisplayDate(event.date)}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-night-ink">{eventLabel}</span>
          {event.sellerName || event.buyerName ? (
            <span className="mt-0.5 block truncate text-[11px] text-night-muted">
              {[event.sellerName ? `Seller ${event.sellerName}` : null, event.buyerName ? `Buyer ${event.buyerName}` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] text-night-muted">
          <span className="max-w-[6.5rem] truncate text-right text-[11px] text-night-faint">
            Not shown
          </span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-saffron-glow transition-transform', !open && '-rotate-90')}
          />
        </span>
      </button>
      {open ? (
        <dl className="mb-3 space-y-1.5 rounded-xl border border-white/20 bg-night-ink/[0.03] px-3 py-2.5">
          {extras.map((field) => (
            <div key={field.label} className="flex items-start justify-between gap-3">
              <dt className="text-[11px] text-night-muted">{field.label}</dt>
              <dd className="max-w-[65%] text-right text-[12px] font-medium text-night-ink">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

function TaxRow({ row }: { row: PropertyTaxYear }) {
  const [open, setOpen] = useState(false)
  const extras = [
    row.marketLabel ? { label: 'Market value', value: row.marketLabel } : null,
    row.landLabel ? { label: 'Land assessed', value: row.landLabel } : null,
    row.improvementLabel ? { label: 'Improvement assessed', value: row.improvementLabel } : null,
    row.assessorYear ? { label: 'Assessor year', value: String(row.assessorYear) } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="border-b border-white/15 last:border-b-0" data-testid={`tax-row-${row.id}`}>
      <button
        type="button"
        onClick={() => extras.length > 0 && setOpen((v) => !v)}
        className="grid w-full grid-cols-[4.25rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 px-1 py-3 text-left touch-manipulation"
        aria-expanded={open}
        disabled={extras.length === 0}
      >
        <span className="text-[13px] font-medium text-night-ink">{row.taxYear}</span>
        <span className="text-[13px] font-semibold text-night-ink">
          {row.taxAmountLabel || '—'}
        </span>
        <span className="text-right text-[13px] font-semibold text-night-ink">
          {row.assessedLabel || '—'}
        </span>
        {extras.length > 0 ? (
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-saffron-glow transition-transform', !open && '-rotate-90')}
          />
        ) : (
          <span className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      {open && extras.length > 0 ? (
        <dl className="mb-3 space-y-1.5 rounded-xl border border-white/20 bg-night-ink/[0.03] px-3 py-2.5">
          {extras.map((field) => (
            <div key={field.label} className="flex items-start justify-between gap-3">
              <dt className="text-[11px] text-night-muted">{field.label}</dt>
              <dd className="max-w-[65%] text-right text-[12px] font-medium text-night-ink">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

export function SalesTaxHistoryPanel({
  property,
  initialTab,
}: {
  property: MockProperty
  initialTab: HistoryTab
}) {
  const [tab, setTab] = useState<HistoryTab>(initialTab)
  const [showAllSales, setShowAllSales] = useState(false)
  const [showAllTax, setShowAllTax] = useState(false)

  const salesRows = useMemo(() => buildSalesRows(property), [property])
  const taxRows = useMemo(() => buildTaxRows(property), [property])

  const visibleSales = showAllSales ? salesRows : salesRows.slice(0, INITIAL_ROWS)
  const visibleTax = showAllTax ? taxRows : taxRows.slice(0, INITIAL_ROWS)
  const live = property.factsStatus === 'live'

  return (
    <div className="px-3 pt-2" data-testid="sales-tax-history-panel">
      <section className="rounded-2xl border border-white/25 bg-transparent px-3 py-3.5">
        <h2 className="px-1 font-display text-[15px] font-bold tracking-tight text-night-ink">
          Sales &amp; tax history
        </h2>
        <p className="mt-0.5 px-1 text-[11px] text-night-muted">
          {live
            ? 'ATTOM deed chain + multi-year assessor rolls · sale amounts hidden'
            : 'Demo shell — live ATTOM history appears after address resolve'}
        </p>

        <div
          className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-white/25 bg-night-ink/[0.04] p-1"
          role="tablist"
          aria-label="Sales and tax history"
        >
          {(
            [
              { id: 'sales' as const, label: 'Sales history', count: salesRows.length },
              { id: 'tax' as const, label: 'Tax history', count: taxRows.length },
            ] as const
          ).map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-semibold touch-manipulation transition-colors',
                  active
                    ? 'bg-saffron text-white shadow-sm'
                    : 'text-night-ink hover:bg-saffron/10',
                )}
                data-testid={`history-tab-${item.id}`}
              >
                {item.label}
                {item.count > 0 ? (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-saffron/15 text-saffron-glow',
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {tab === 'sales' ? (
          <div className="mt-3" role="tabpanel" data-testid="sales-history-table">
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] gap-2 border-b border-white/20 px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-night-faint">
              <span>Date</span>
              <span>Event</span>
              <span className="text-right">Amount</span>
            </div>
            {visibleSales.length > 0 ? (
              visibleSales.map((event) => <SaleRow key={event.id} event={event} />)
            ) : (
              <p className="px-1 py-6 text-center text-sm text-night-muted">
                No recorded transfers yet for this address.
              </p>
            )}
            {salesRows.length > INITIAL_ROWS ? (
              <button
                type="button"
                onClick={() => setShowAllSales((v) => !v)}
                className="mt-1 inline-flex min-h-10 items-center gap-1 px-1 text-[13px] font-semibold text-saffron-glow touch-manipulation"
                data-testid="button-show-more-sales"
              >
                {showAllSales ? 'Show less' : 'Show more'}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <p className="mt-2 px-1 text-[11px] text-night-faint">
              Sale prices intentionally hidden (buyer-first). Tap a row for deed, parties, and loan
              cues.
            </p>
          </div>
        ) : (
          <div className="mt-3" role="tabpanel" data-testid="tax-history-table">
            <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 border-b border-white/20 px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-night-faint">
              <span>Year</span>
              <span>Property taxes</span>
              <span className="text-right">Assessment</span>
              <span className="w-3.5" aria-hidden />
            </div>
            {visibleTax.length > 0 ? (
              visibleTax.map((row) => <TaxRow key={row.id} row={row} />)
            ) : (
              <p className="px-1 py-6 text-center text-sm text-night-muted">
                No assessor tax years yet for this address.
              </p>
            )}
            {taxRows.length > INITIAL_ROWS ? (
              <button
                type="button"
                onClick={() => setShowAllTax((v) => !v)}
                className="mt-1 inline-flex min-h-10 items-center gap-1 px-1 text-[13px] font-semibold text-saffron-glow touch-manipulation"
                data-testid="button-show-more-tax"
              >
                {showAllTax ? 'Show less' : 'Show more'}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <p className="mt-2 px-1 text-[11px] text-night-faint">
              Tap a year for market, land, and improvement values when published.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
