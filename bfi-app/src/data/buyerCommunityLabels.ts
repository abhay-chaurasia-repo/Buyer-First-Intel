/** Pre-developed Buyer Community labels — curated, not free-text. */

export type BuyerLabelCategoryId =
  | 'remote-records'
  | 'size-records'
  | 'surroundings'
  | 'structure'
  | 'parking'
  | 'noise-access'
  | 'lot-exterior'

export type BuyerLabelTone = 'positive' | 'negative'

export type BuyerLabelCategory = {
  id: BuyerLabelCategoryId
  title: string
  blurb: string
}

export type BuyerCommunityLabel = {
  id: string
  categoryId: BuyerLabelCategoryId
  /** Short fixed label shown in the list */
  text: string
  /** Positive uplift vs caution / concern */
  tone: BuyerLabelTone
  /** Seed community upvote count before local votes */
  seedVotes: number
  /**
   * When false, buyers can upvote remotely (e.g. while comparing listings).
   * Defaults to true — most labels need an on-site visit.
   */
  requiresVisit?: boolean
}

/** Display order for Buyer Community sections — remote Watch labels first. */
export const BUYER_LABEL_CATEGORIES: BuyerLabelCategory[] = [
  {
    id: 'remote-records',
    title: 'County vs listing',
    blurb:
      'No visit needed. Flag only if the published size looks larger than county. No votes here means buyers treat the listing as matching.',
  },
  {
    id: 'size-records',
    title: 'Size on site',
    blurb: 'Watch-outs from being at the pin. If nobody flags one, buyers treat that item as fine.',
  },
  {
    id: 'surroundings',
    title: 'Surroundings & utilities',
    blurb: 'Nearby lines, towers, corridors, and industrial feel — flag what you saw.',
  },
  {
    id: 'structure',
    title: 'Structure & condition',
    blurb: 'Observable condition — not a formal inspection.',
  },
  {
    id: 'parking',
    title: 'Parking',
    blurb: 'Flag constraints. Easy parking is assumed unless someone marks a Watch.',
  },
  {
    id: 'noise-access',
    title: 'Noise',
    blurb: 'Flag noise you noticed. Quiet is assumed unless someone marks a Watch.',
  },
  {
    id: 'lot-exterior',
    title: 'Lot & exterior',
    blurb: 'Specific lot features and outdoor watch-outs.',
  },
]

/**
 * Fixed labels. Watch = something off. Plus = a distinct feature, not “the Watch isn’t true.”
 * Absence of a Watch vote is the “it’s fine” signal — we don’t duplicate that as a Plus.
 */
export const BUYER_COMMUNITY_LABELS: BuyerCommunityLabel[] = [
  {
    id: 'published-listing-size-overstated',
    categoryId: 'remote-records',
    text: 'Published listing size looks larger than county',
    tone: 'negative',
    seedVotes: 0,
    requiresVisit: false,
  },

  { id: 'feels-smaller-than-listed', categoryId: 'size-records', text: 'Feels smaller than listed', tone: 'negative', seedVotes: 2 },
  { id: 'feels-larger-than-listed', categoryId: 'size-records', text: 'Feels larger than listed', tone: 'negative', seedVotes: 1 },
  { id: 'finished-area-unclear', categoryId: 'size-records', text: 'Finished vs unfinished area unclear', tone: 'negative', seedVotes: 1 },
  { id: 'garage-counted-as-living', categoryId: 'size-records', text: 'Garage may be counted as living area', tone: 'negative', seedVotes: 1 },

  { id: 'clear-skyline-views', categoryId: 'surroundings', text: 'Clear skyline / open views', tone: 'positive', seedVotes: 2 },
  { id: 'high-tension-cables-nearby', categoryId: 'surroundings', text: 'High-tension cables nearby', tone: 'negative', seedVotes: 2 },
  { id: 'power-lines-over-lot', categoryId: 'surroundings', text: 'Power lines over or beside lot', tone: 'negative', seedVotes: 1 },
  { id: 'cell-tower-visible', categoryId: 'surroundings', text: 'Cell tower visible nearby', tone: 'negative', seedVotes: 1 },
  { id: 'substation-nearby', categoryId: 'surroundings', text: 'Electrical substation nearby', tone: 'negative', seedVotes: 0 },
  { id: 'pipeline-or-easement', categoryId: 'surroundings', text: 'Pipeline / utility easement feel', tone: 'negative', seedVotes: 0 },
  { id: 'industrial-odor', categoryId: 'surroundings', text: 'Industrial odor at times', tone: 'negative', seedVotes: 0 },
  { id: 'rail-or-freeway-adjacent', categoryId: 'surroundings', text: 'Rail or freeway adjacent', tone: 'negative', seedVotes: 1 },

  { id: 'roof-looks-newer', categoryId: 'structure', text: 'Roof looks newer', tone: 'positive', seedVotes: 3 },
  { id: 'finished-basement', categoryId: 'structure', text: 'Finished basement present', tone: 'positive', seedVotes: 2 },
  { id: 'possible-garage-conversion', categoryId: 'structure', text: 'Possible garage conversion', tone: 'negative', seedVotes: 1 },
  { id: 'exterior-deferred-maintenance', categoryId: 'structure', text: 'Exterior deferred maintenance', tone: 'negative', seedVotes: 2 },
  { id: 'musty-or-moisture-smell', categoryId: 'structure', text: 'Musty or moisture smell', tone: 'negative', seedVotes: 0 },
  { id: 'dated-systems-feel', categoryId: 'structure', text: 'Dated systems feel', tone: 'negative', seedVotes: 1 },

  { id: 'tight-driveway', categoryId: 'parking', text: 'Tight driveway', tone: 'negative', seedVotes: 2 },
  { id: 'limited-street-parking', categoryId: 'parking', text: 'Limited street parking after 6pm', tone: 'negative', seedVotes: 2 },
  { id: 'steep-approach', categoryId: 'parking', text: 'Steep approach / incline', tone: 'negative', seedVotes: 0 },
  { id: 'shared-or-alley-access', categoryId: 'parking', text: 'Shared or alley access', tone: 'negative', seedVotes: 0 },

  { id: 'evening-street-noise', categoryId: 'noise-access', text: 'Evening street noise', tone: 'negative', seedVotes: 2 },
  { id: 'busy-morning-traffic', categoryId: 'noise-access', text: 'Busy morning traffic', tone: 'negative', seedVotes: 1 },
  { id: 'nearby-construction', categoryId: 'noise-access', text: 'Nearby construction', tone: 'negative', seedVotes: 0 },
  { id: 'plane-or-train-noise', categoryId: 'noise-access', text: 'Plane or train noise', tone: 'negative', seedVotes: 0 },

  { id: 'mature-trees', categoryId: 'lot-exterior', text: 'Mature trees', tone: 'positive', seedVotes: 4 },
  { id: 'fenced-yard', categoryId: 'lot-exterior', text: 'Fenced yard', tone: 'positive', seedVotes: 3 },
  { id: 'low-curb-appeal', categoryId: 'lot-exterior', text: 'Low curb appeal', tone: 'negative', seedVotes: 1 },
  { id: 'drainage-concern', categoryId: 'lot-exterior', text: 'Drainage / standing water concern', tone: 'negative', seedVotes: 1 },
  { id: 'hoa-restrictive-feel', categoryId: 'lot-exterior', text: 'HOA feels restrictive', tone: 'negative', seedVotes: 0 },
  { id: 'small-or-awkward-lot', categoryId: 'lot-exterior', text: 'Small or awkward lot', tone: 'negative', seedVotes: 0 },
]

export function labelsForCategory(categoryId: BuyerLabelCategoryId) {
  return BUYER_COMMUNITY_LABELS.filter((label) => label.categoryId === categoryId)
}

export function totalSeedVotes() {
  return BUYER_COMMUNITY_LABELS.reduce((sum, label) => sum + label.seedVotes, 0)
}

export function labelById(labelId: string) {
  return BUYER_COMMUNITY_LABELS.find((label) => label.id === labelId)
}

export function labelRequiresVisit(label: BuyerCommunityLabel) {
  return label.requiresVisit !== false
}

export function labelToneById(labelId: string): BuyerLabelTone | undefined {
  return BUYER_COMMUNITY_LABELS.find((label) => label.id === labelId)?.tone
}

/** Shared Plus / Watch definitions — keep UI copy consistent */
export const PLUS_LABEL_SHORT = 'a distinct feature buyers noticed'
export const WATCH_LABEL_SHORT = 'watch-outs to dig into'
export const PLUS_LABEL_MEANING =
  'A distinct feature — not the inverse of a Watch. If a Watch has no votes, buyers treat that item as fine.'
export const WATCH_LABEL_MEANING =
  'Watch-outs to dig into — caution signals before you commit more time or money.'
export const PLUS_WATCH_LEGEND_INTRO =
  'Labels are fixed (no free text). Flag what looked off. No vote on a Watch means buyers treat that item as fine — we don’t also ask you to confirm it was right.'
