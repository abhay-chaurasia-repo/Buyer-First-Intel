/**
 * ATTOM often omits fields (e.g. yearBuilt). We store those as 0 / empty
 * placeholders — never show a fake zero in County’s Fact UI.
 */

/** Em dash for absent ATTOM / county facts (not a literal zero). */
export const COUNTY_FACT_MISSING = '—'

export function isMissingCountyNumber(value: number | null | undefined): boolean {
  return value == null || Number.isNaN(value) || value === 0
}

export function formatCountyNumber(value: number | null | undefined): string {
  if (isMissingCountyNumber(value)) return COUNTY_FACT_MISSING
  return String(value)
}

export function formatCountySqft(sqft: number | null | undefined): string {
  if (isMissingCountyNumber(sqft)) return COUNTY_FACT_MISSING
  return `${sqft!.toLocaleString()} sqft`
}

export function formatCountyLot(
  lotSqft: number | null | undefined,
  lotAcres?: number | null,
): string {
  const hasSqft = !isMissingCountyNumber(lotSqft)
  const hasAcres = lotAcres != null && !Number.isNaN(lotAcres) && lotAcres > 0
  if (!hasSqft && !hasAcres) return COUNTY_FACT_MISSING
  if (hasSqft && hasAcres) {
    return `${lotSqft!.toLocaleString()} sqft · ${lotAcres} ac`
  }
  if (hasSqft) return `${lotSqft!.toLocaleString()} sqft`
  return `${lotAcres} ac`
}

/** Empty / placeholder strings from blank county shells. */
export function formatCountyText(value: string | null | undefined): string {
  const t = (value ?? '').trim()
  if (!t || t === '-' || t === '—' || t.toLowerCase() === 'pending county assessor') {
    return COUNTY_FACT_MISSING
  }
  return t
}
