import type { MockProperty, PropertySaleEvent } from '@/data/mockProperty'
import { isMissingCountyNumber } from '@/lib/formatCountyFact'

/** Buyer-facing kind for a county recorder row. */
export type SaleEventKind = 'sale' | 'title-transfer' | 'loan'

function publishedAmount(amountLabel?: string) {
  return Boolean(amountLabel && amountLabel !== '—')
}

function haystack(event: Pick<PropertySaleEvent, 'deedType' | 'deedCode'>) {
  return `${event.deedType || ''} ${event.deedCode || ''}`.toLowerCase()
}

/**
 * ATTOM mixes real sales with quitclaims and loan recordings.
 * Buyers should only see ownership changes in Sales history.
 *
 * - Resale / Grant / Limited Warranty → sale
 * - Nominal / Quit claim → title transfer (not a market sale)
 * - Stand Alone Finance / Refinance / Trust deed with no price → loan, not a sale
 */
export function classifySaleEvent(
  event: Pick<PropertySaleEvent, 'deedType' | 'deedCode' | 'amountLabel'>,
): SaleEventKind {
  const text = haystack(event)
  const code = (event.deedCode || '').toUpperCase()

  const isQuitClaim =
    code === 'QC' || /\bquit\s*claim\b/.test(text) || /\bnominal\b/.test(text)

  const namedLoan =
    /stand\s*alone\s*finance/.test(text) ||
    /\brefinanc/.test(text) ||
    /construction\s*loan/.test(text)

  const trustDeedNoPrice =
    (code === 'TR' || code === 'DT') && !publishedAmount(event.amountLabel) && !isQuitClaim

  if (namedLoan || trustDeedNoPrice) return 'loan'
  if (isQuitClaim) return 'title-transfer'
  return 'sale'
}

export function isOwnershipSaleRow(event: PropertySaleEvent) {
  return classifySaleEvent(event) !== 'loan'
}

export function soldToLabel(event: PropertySaleEvent) {
  if (event.buyerName?.trim()) return event.buyerName
  if (classifySaleEvent(event) === 'title-transfer') return 'Title transfer'
  return '—'
}

export function saleRowHint(event: PropertySaleEvent) {
  const kind = classifySaleEvent(event)
  if (kind === 'title-transfer') return 'Title transfer — not a market sale'
  if (event.sellerName?.trim()) return `Seller ${event.sellerName}`
  return null
}

export function saleKindExplanation(event: PropertySaleEvent) {
  if (classifySaleEvent(event) !== 'title-transfer') return null
  return 'Ownership changed without a typical home sale — for example adding a family member or moving title into a trust.'
}

export function buyerSalesRows(property: MockProperty): PropertySaleEvent[] {
  if (property.salesHistory && property.salesHistory.length > 0) {
    return property.salesHistory.filter(isOwnershipSaleRow)
  }
  if (property.lastSaleDate && property.lastSaleDate !== '—') {
    return [
      {
        id: 'sale-latest',
        date: property.lastSaleDate,
        deedType: property.deedType || 'Recorded transfer',
        amountLabel: property.lastSalePriceLabel || '—',
      },
    ]
  }
  return []
}

function yearFromDate(raw?: string) {
  if (!raw) return null
  const match = raw.match(/(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

/** County files often start years after the home was built. */
export function salesHistoryCoverageNote(property: MockProperty, rows: PropertySaleEvent[]) {
  const built = isMissingCountyNumber(property.yearBuilt) ? null : property.yearBuilt
  const years = rows
    .map((row) => yearFromDate(row.date))
    .filter((year): year is number => year != null)
  const earliestSale = years.length > 0 ? Math.min(...years) : null
  const omittedLoans =
    (property.salesHistory || []).some((event) => classifySaleEvent(event) === 'loan')

  const parts: string[] = []
  if (built && earliestSale && built < earliestSale) {
    parts.push(
      `This home was built in ${built}. Recorded sales in this file start in ${earliestSale} — the original purchase may not appear here.`,
    )
  } else if (earliestSale) {
    parts.push(`Recorded sales in this file start in ${earliestSale}.`)
  }
  if (omittedLoans) {
    parts.push('Loan recordings (refinances) are not listed as sales.')
  }
  return parts.join(' ')
}
