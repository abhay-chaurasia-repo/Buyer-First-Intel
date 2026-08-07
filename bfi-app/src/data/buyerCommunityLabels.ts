/** Pre-developed Buyer Community labels — curated, not free-text. */

export type BuyerLabelCategoryId =
  | 'noise-access'
  | 'parking'
  | 'structure'
  | 'lot-exterior'
  | 'deal-feel'

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
  /** Seed community upvote count before local votes */
  seedVotes: number
}

export const BUYER_LABEL_CATEGORIES: BuyerLabelCategory[] = [
  {
    id: 'noise-access',
    title: 'Noise & access',
    blurb: 'What verified visitors noticed about sound and getting around',
  },
  {
    id: 'parking',
    title: 'Parking',
    blurb: 'Driveway and street parking signals',
  },
  {
    id: 'structure',
    title: 'Structure & condition',
    blurb: 'Observable building condition — not a formal inspection',
  },
  {
    id: 'lot-exterior',
    title: 'Lot & exterior',
    blurb: 'Curb appeal, drainage, trees, and outdoor feel',
  },
  {
    id: 'deal-feel',
    title: 'Deal feel',
    blurb: 'Light market / seller signals from on-site presence',
  },
]

/**
 * Fixed label catalog. Add or rename here when product expands the set.
 * Visitors cannot invent free-text labels — they only upvote these.
 */
export const BUYER_COMMUNITY_LABELS: BuyerCommunityLabel[] = [
  // Noise & access
  { id: 'evening-street-noise', categoryId: 'noise-access', text: 'Evening street noise', seedVotes: 3 },
  { id: 'quiet-at-night', categoryId: 'noise-access', text: 'Quiet at night', seedVotes: 2 },
  { id: 'busy-morning-traffic', categoryId: 'noise-access', text: 'Busy morning traffic', seedVotes: 1 },
  { id: 'nearby-construction', categoryId: 'noise-access', text: 'Nearby construction', seedVotes: 0 },
  { id: 'plane-or-train-noise', categoryId: 'noise-access', text: 'Plane or train noise', seedVotes: 0 },

  // Parking
  { id: 'tight-driveway', categoryId: 'parking', text: 'Tight driveway', seedVotes: 4 },
  { id: 'limited-street-parking', categoryId: 'parking', text: 'Limited street parking after 6pm', seedVotes: 2 },
  { id: 'easy-guest-parking', categoryId: 'parking', text: 'Easy guest parking', seedVotes: 1 },
  { id: 'steep-approach', categoryId: 'parking', text: 'Steep approach / incline', seedVotes: 0 },
  { id: 'shared-or-alley-access', categoryId: 'parking', text: 'Shared or alley access', seedVotes: 0 },

  // Structure
  { id: 'possible-garage-conversion', categoryId: 'structure', text: 'Possible garage conversion', seedVotes: 1 },
  { id: 'finished-basement', categoryId: 'structure', text: 'Finished basement present', seedVotes: 2 },
  { id: 'roof-looks-newer', categoryId: 'structure', text: 'Roof looks newer', seedVotes: 1 },
  { id: 'exterior-deferred-maintenance', categoryId: 'structure', text: 'Exterior deferred maintenance', seedVotes: 2 },
  { id: 'updated-interior-feel', categoryId: 'structure', text: 'Updated interior feel', seedVotes: 0 },
  { id: 'musty-or-moisture-smell', categoryId: 'structure', text: 'Musty or moisture smell', seedVotes: 0 },

  // Lot & exterior
  { id: 'low-curb-appeal', categoryId: 'lot-exterior', text: 'Low curb appeal', seedVotes: 1 },
  { id: 'mature-trees', categoryId: 'lot-exterior', text: 'Mature trees', seedVotes: 3 },
  { id: 'drainage-concern', categoryId: 'lot-exterior', text: 'Drainage / standing water concern', seedVotes: 1 },
  { id: 'hoa-active', categoryId: 'lot-exterior', text: 'HOA appears active', seedVotes: 0 },
  { id: 'fenced-yard', categoryId: 'lot-exterior', text: 'Fenced yard', seedVotes: 2 },

  // Deal feel
  { id: 'motivated-seller-vibe', categoryId: 'deal-feel', text: 'Motivated seller vibe', seedVotes: 0 },
  { id: 'long-on-market-feel', categoryId: 'deal-feel', text: 'Feels long on market', seedVotes: 1 },
  { id: 'price-high-for-condition', categoryId: 'deal-feel', text: 'Price feels high for condition', seedVotes: 2 },
  { id: 'strong-showing-activity', categoryId: 'deal-feel', text: 'Strong showing activity', seedVotes: 0 },
]

export function labelsForCategory(categoryId: BuyerLabelCategoryId) {
  return BUYER_COMMUNITY_LABELS.filter((label) => label.categoryId === categoryId)
}

export function totalSeedVotes() {
  return BUYER_COMMUNITY_LABELS.reduce((sum, label) => sum + label.seedVotes, 0)
}
