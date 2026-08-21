/**
 * Flatten any ATTOM property JSON into labeled rows.
 * Used for Tax History, Sales History, and Schools inventories
 * so we can see every field before trimming the UI.
 */

export type AttomInventoryRow = {
  groupId: string
  group: string
  label: string
  path: string
  value: string
}

export type AttomInventoryCard = {
  id: string
  headline: string
  rows: AttomInventoryRow[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEmptyValue(value: unknown) {
  if (value == null) return true
  if (typeof value === 'string' && !value.trim()) return true
  if (Array.isArray(value) && value.length === 0) return true
  if (isPlainObject(value) && Object.keys(value).length === 0) return true
  return false
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function moneyLabel(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function titleFromPath(path: string) {
  const last = path.split('.').pop() || path
  return last
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function groupLabel(key: string) {
  return titleFromPath(key)
}

function formatLeaf(path: string, value: unknown): string {
  if (isEmptyValue(value)) return 'Not published'
  const numeric = asNumber(value)
  const key = path.split('.').pop() || path
  if (numeric != null && /amt|amount|value|price|fee|taxamt|saleamt/i.test(key)) {
    return moneyLabel(numeric)
  }
  if (typeof value === 'string' && /date/i.test(key) && value.length >= 10) {
    return value.slice(0, 10)
  }
  if (numeric != null && /size|sqft/i.test(key)) {
    return `${Math.round(numeric).toLocaleString('en-US')} sqft`
  }
  if (numeric != null && typeof value !== 'string') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(numeric)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value).trim()
}

const HISTORY_ARRAY_KEYS = new Set([
  'assessmenthistory',
  'assessmentHistory',
  'salehistory',
  'saleHistory',
  'school',
  'schools',
])

function flattenLeaves(
  value: unknown,
  path: string,
  groupId: string,
  group: string,
  into: AttomInventoryRow[],
) {
  if (isEmptyValue(value)) return
  if (Array.isArray(value)) {
    if (value.every((item) => !isPlainObject(item) && !Array.isArray(item))) {
      into.push({
        groupId,
        group,
        label: titleFromPath(path),
        path,
        value: value.map((item) => String(item)).join(', '),
      })
      return
    }
    value.forEach((item, index) => {
      flattenLeaves(item, `${path}.${index}`, groupId, group, into)
    })
    return
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      flattenLeaves(value[key], path ? `${path}.${key}` : key, groupId, group, into)
    }
    return
  }
  into.push({
    groupId,
    group,
    label: titleFromPath(path),
    path,
    value: formatLeaf(path, value),
  })
}

function arrayItemHeadline(key: string, item: unknown, index: number) {
  if (!isPlainObject(item)) return `${groupLabel(key)} ${index + 1}`
  const tax = isPlainObject(item.tax) ? item.tax : item
  const year = tax.taxYear ?? tax.taxyear ?? tax.assessorYear
  if (year != null && String(year).trim()) return `Tax year ${year}`
  const saleDate =
    item.saleTransDate ||
    item.saleSearchDate ||
    (isPlainObject(item.amount) ? item.amount.saleRecDate || item.amount.saleAmt : undefined)
  if (typeof saleDate === 'string' && saleDate.trim()) {
    const buyer = typeof item.buyerName === 'string' && item.buyerName.trim()
      ? ` · ${item.buyerName}`
      : ''
    return `Sale ${String(saleDate).slice(0, 10)}${buyer}`
  }
  const schoolName = item.InstitutionName || item.institutionName || item.schoolName
  if (typeof schoolName === 'string' && schoolName.trim()) return schoolName
  const district = item.districtname
  if (typeof district === 'string' && district.trim()) return district
  return `${groupLabel(key)} ${index + 1}`
}

export function inventoryCardsFromAttomPayload(payload: unknown): AttomInventoryCard[] {
  if (!isPlainObject(payload)) return []
  const cards: AttomInventoryCard[] = []

  const scalarRows: AttomInventoryRow[] = []
  const scalarGroups = new Map<string, AttomInventoryRow[]>()

  for (const key of Object.keys(payload)) {
    const value = payload[key]
    if (isEmptyValue(value)) continue
    const arrayKey = HISTORY_ARRAY_KEYS.has(key)
    if (arrayKey && Array.isArray(value)) {
      value.forEach((item, index) => {
        const rows: AttomInventoryRow[] = []
        flattenLeaves(item, `${key}.${index}`, `${key}-${index}`, arrayItemHeadline(key, item, index), rows)
        if (rows.length === 0) return
        cards.push({
          id: `${key}-${index}`,
          headline: arrayItemHeadline(key, item, index),
          rows,
        })
      })
      continue
    }
    if (isPlainObject(value) || Array.isArray(value)) {
      const rows: AttomInventoryRow[] = []
      flattenLeaves(value, key, key, groupLabel(key), rows)
      if (rows.length > 0) scalarGroups.set(key, rows)
      continue
    }
    scalarRows.push({
      groupId: 'root',
      group: 'Record',
      label: titleFromPath(key),
      path: key,
      value: formatLeaf(key, value),
    })
  }

  if (scalarRows.length > 0) {
    cards.unshift({
      id: 'root',
      headline: 'Record',
      rows: scalarRows,
    })
  }

  for (const [key, rows] of scalarGroups) {
    cards.push({
      id: key,
      headline: groupLabel(key),
      rows,
    })
  }

  return cards
}

export function inventoryHasRows(payload: unknown) {
  return inventoryCardsFromAttomPayload(payload).some((card) => card.rows.length > 0)
}
