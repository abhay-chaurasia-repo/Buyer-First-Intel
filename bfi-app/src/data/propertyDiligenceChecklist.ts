/** Per-property due-diligence checklist. Separate from the Journey buying path. */

import { readScopedItem, writeScopedItem } from './ownerScope'

export const PROPERTY_DILIGENCE_CHECKLIST_KEY = 'bfi.property-diligence-checklist'

export type DiligenceChecklistItem = {
  id: string
  title: string
  detail: string
}

export const DILIGENCE_CHECKLIST_ITEMS: DiligenceChecklistItem[] = [
  {
    id: 'public-record',
    title: 'Public record checked',
    detail: 'Open County’s Fact for living area, beds, baths, and what the county has on file.',
  },
  {
    id: 'sqft-discrepancy',
    title: 'Square-footage discrepancy explained',
    detail: 'Compare county gross living area with the listing. Note why they differ, or that they match.',
  },
  {
    id: 'permits',
    title: 'Permits reviewed',
    detail: 'Check the city or county building department for additions, garage conversions, or unfinished space.',
  },
  {
    id: 'fema-flood',
    title: 'FEMA flood map reviewed',
    detail: 'Look up the flood zone on FEMA’s map. Ask an insurer what that means for a quote.',
  },
  {
    id: 'schools',
    title: 'School assignment verified',
    detail: 'Confirm campuses with the district. Nearby schools in the app are not an assignment.',
  },
  {
    id: 'hoa-docs',
    title: 'HOA documents requested',
    detail: 'Ask for CC&Rs, budget, and dues if the home is in an association.',
  },
  {
    id: 'disclosures',
    title: 'Seller disclosures reviewed',
    detail: 'Read what the seller disclosed and what is missing.',
  },
  {
    id: 'insurance-quote',
    title: 'Insurance quote requested',
    detail: 'Get a quote early. Flood zone, older roofs, and dogs can change the price.',
  },
  {
    id: 'inspection',
    title: 'Inspection scheduled',
    detail: 'Book a licensed inspector before any contingency deadline.',
  },
  {
    id: 'tax-record',
    title: 'Property tax record reviewed',
    detail: 'Open Tax History for assessed value and recent bills.',
  },
]

export type DiligenceChecklistProgress = Record<string, boolean>

type DiligenceChecklistStore = Record<string, DiligenceChecklistProgress>

function emptyProgress(): DiligenceChecklistProgress {
  return {}
}

function readStore(): DiligenceChecklistStore {
  try {
    const raw = readScopedItem(PROPERTY_DILIGENCE_CHECKLIST_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DiligenceChecklistStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: DiligenceChecklistStore) {
  writeScopedItem(PROPERTY_DILIGENCE_CHECKLIST_KEY, JSON.stringify(store))
}

export function loadDiligenceChecklistProgress(
  propertyId: string,
): DiligenceChecklistProgress {
  const entry = readStore()[propertyId]
  return entry && typeof entry === 'object' ? { ...entry } : emptyProgress()
}

export function persistDiligenceChecklistProgress(
  propertyId: string,
  progress: DiligenceChecklistProgress,
) {
  const store = readStore()
  store[propertyId] = progress
  writeStore(store)
}

export function toggleDiligenceChecklistItem(propertyId: string, itemId: string) {
  const progress = loadDiligenceChecklistProgress(propertyId)
  const next = { ...progress, [itemId]: !progress[itemId] }
  persistDiligenceChecklistProgress(propertyId, next)
  return next
}

export function diligenceChecklistStats(progress: DiligenceChecklistProgress) {
  const total = DILIGENCE_CHECKLIST_ITEMS.length
  const done = DILIGENCE_CHECKLIST_ITEMS.filter((item) => progress[item.id]).length
  return { total, done, remaining: total - done }
}
