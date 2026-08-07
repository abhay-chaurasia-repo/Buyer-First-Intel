/** Pre-developed Buyer Community labels — curated, not free-text. */

export type BuyerLabelCategoryId =
  | 'noise-access'
  | 'parking'
  | 'structure'
  | 'lot-exterior'
  | 'surroundings'
  | 'deal-feel'

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
}

export const BUYER_LABEL_CATEGORIES: BuyerLabelCategory[] = [
  {
    id: 'noise-access',
    title: 'Noise & access',
    blurb: 'Balanced signals — quiet wins and noise concerns',
  },
  {
    id: 'parking',
    title: 'Parking',
    blurb: 'What’s easy about parking — and what isn’t',
  },
  {
    id: 'structure',
    title: 'Structure & condition',
    blurb: 'Observable upsides and care items — not a formal inspection',
  },
  {
    id: 'lot-exterior',
    title: 'Lot & exterior',
    blurb: 'Curb appeal strengths alongside outdoor watch-outs',
  },
  {
    id: 'surroundings',
    title: 'Surroundings & utilities',
    blurb: 'Power lines, towers, corridors, and nearby industrial feel',
  },
  {
    id: 'deal-feel',
    title: 'Deal feel',
    blurb: 'Encouraging and cautious market vibes from on-site presence',
  },
]

/**
 * Fixed label catalog with both positive and negative options.
 * Visitors cannot invent free-text — they only upvote these.
 */
export const BUYER_COMMUNITY_LABELS: BuyerCommunityLabel[] = [
  // Noise & access — positive
  { id: 'quiet-at-night', categoryId: 'noise-access', text: 'Quiet at night', tone: 'positive', seedVotes: 4 },
  { id: 'calm-street-feel', categoryId: 'noise-access', text: 'Calm street feel', tone: 'positive', seedVotes: 3 },
  { id: 'easy-walkability', categoryId: 'noise-access', text: 'Easy walkability nearby', tone: 'positive', seedVotes: 2 },
  // Noise & access — negative
  { id: 'evening-street-noise', categoryId: 'noise-access', text: 'Evening street noise', tone: 'negative', seedVotes: 2 },
  { id: 'busy-morning-traffic', categoryId: 'noise-access', text: 'Busy morning traffic', tone: 'negative', seedVotes: 1 },
  { id: 'nearby-construction', categoryId: 'noise-access', text: 'Nearby construction', tone: 'negative', seedVotes: 0 },
  { id: 'plane-or-train-noise', categoryId: 'noise-access', text: 'Plane or train noise', tone: 'negative', seedVotes: 0 },

  // Parking — positive
  { id: 'easy-guest-parking', categoryId: 'parking', text: 'Easy guest parking', tone: 'positive', seedVotes: 4 },
  { id: 'roomy-driveway', categoryId: 'parking', text: 'Roomy driveway', tone: 'positive', seedVotes: 3 },
  { id: 'two-car-friendly', categoryId: 'parking', text: 'Comfortable for two cars', tone: 'positive', seedVotes: 2 },
  // Parking — negative
  { id: 'tight-driveway', categoryId: 'parking', text: 'Tight driveway', tone: 'negative', seedVotes: 2 },
  { id: 'limited-street-parking', categoryId: 'parking', text: 'Limited street parking after 6pm', tone: 'negative', seedVotes: 2 },
  { id: 'steep-approach', categoryId: 'parking', text: 'Steep approach / incline', tone: 'negative', seedVotes: 0 },
  { id: 'shared-or-alley-access', categoryId: 'parking', text: 'Shared or alley access', tone: 'negative', seedVotes: 0 },

  // Structure — positive
  { id: 'roof-looks-newer', categoryId: 'structure', text: 'Roof looks newer', tone: 'positive', seedVotes: 3 },
  { id: 'updated-interior-feel', categoryId: 'structure', text: 'Updated interior feel', tone: 'positive', seedVotes: 4 },
  { id: 'finished-basement', categoryId: 'structure', text: 'Finished basement present', tone: 'positive', seedVotes: 2 },
  { id: 'well-kept-exterior', categoryId: 'structure', text: 'Well-kept exterior', tone: 'positive', seedVotes: 3 },
  // Structure — negative
  { id: 'possible-garage-conversion', categoryId: 'structure', text: 'Possible garage conversion', tone: 'negative', seedVotes: 1 },
  { id: 'exterior-deferred-maintenance', categoryId: 'structure', text: 'Exterior deferred maintenance', tone: 'negative', seedVotes: 2 },
  { id: 'musty-or-moisture-smell', categoryId: 'structure', text: 'Musty or moisture smell', tone: 'negative', seedVotes: 0 },
  { id: 'dated-systems-feel', categoryId: 'structure', text: 'Dated systems feel', tone: 'negative', seedVotes: 1 },

  // Lot & exterior — positive
  { id: 'mature-trees', categoryId: 'lot-exterior', text: 'Mature trees', tone: 'positive', seedVotes: 4 },
  { id: 'strong-curb-appeal', categoryId: 'lot-exterior', text: 'Strong curb appeal', tone: 'positive', seedVotes: 3 },
  { id: 'fenced-yard', categoryId: 'lot-exterior', text: 'Fenced yard', tone: 'positive', seedVotes: 3 },
  { id: 'usable-backyard', categoryId: 'lot-exterior', text: 'Usable backyard space', tone: 'positive', seedVotes: 2 },
  // Lot & exterior — negative
  { id: 'low-curb-appeal', categoryId: 'lot-exterior', text: 'Low curb appeal', tone: 'negative', seedVotes: 1 },
  { id: 'drainage-concern', categoryId: 'lot-exterior', text: 'Drainage / standing water concern', tone: 'negative', seedVotes: 1 },
  { id: 'hoa-restrictive-feel', categoryId: 'lot-exterior', text: 'HOA feels restrictive', tone: 'negative', seedVotes: 0 },
  { id: 'small-or-awkward-lot', categoryId: 'lot-exterior', text: 'Small or awkward lot', tone: 'negative', seedVotes: 0 },

  // Surroundings & utilities — positive
  { id: 'no-overhead-power-lines', categoryId: 'surroundings', text: 'No overhead power lines in view', tone: 'positive', seedVotes: 3 },
  { id: 'clear-skyline-views', categoryId: 'surroundings', text: 'Clear skyline / open views', tone: 'positive', seedVotes: 2 },
  { id: 'clean-air-feel', categoryId: 'surroundings', text: 'Clean air feel on site', tone: 'positive', seedVotes: 2 },
  { id: 'quiet-utility-corridor', categoryId: 'surroundings', text: 'No obvious utility corridor', tone: 'positive', seedVotes: 1 },
  { id: 'buried-utilities-feel', categoryId: 'surroundings', text: 'Utilities feel buried / discreet', tone: 'positive', seedVotes: 2 },
  // Surroundings & utilities — negative
  { id: 'high-tension-cables-nearby', categoryId: 'surroundings', text: 'High-tension cables nearby', tone: 'negative', seedVotes: 2 },
  { id: 'power-lines-over-lot', categoryId: 'surroundings', text: 'Power lines over or beside lot', tone: 'negative', seedVotes: 1 },
  { id: 'cell-tower-visible', categoryId: 'surroundings', text: 'Cell tower visible nearby', tone: 'negative', seedVotes: 1 },
  { id: 'substation-nearby', categoryId: 'surroundings', text: 'Electrical substation nearby', tone: 'negative', seedVotes: 0 },
  { id: 'pipeline-or-easement', categoryId: 'surroundings', text: 'Pipeline / utility easement feel', tone: 'negative', seedVotes: 0 },
  { id: 'industrial-odor', categoryId: 'surroundings', text: 'Industrial odor at times', tone: 'negative', seedVotes: 0 },
  { id: 'rail-or-freeway-adjacent', categoryId: 'surroundings', text: 'Rail or freeway adjacent', tone: 'negative', seedVotes: 1 },

  // Deal feel — positive
  { id: 'fair-value-feel', categoryId: 'deal-feel', text: 'Feels fairly priced', tone: 'positive', seedVotes: 3 },
  { id: 'well-presented-showing', categoryId: 'deal-feel', text: 'Well-presented showing', tone: 'positive', seedVotes: 2 },
  { id: 'strong-showing-activity', categoryId: 'deal-feel', text: 'Strong showing activity', tone: 'positive', seedVotes: 1 },
  { id: 'seller-responsive-vibe', categoryId: 'deal-feel', text: 'Seller feels responsive', tone: 'positive', seedVotes: 1 },
  // Deal feel — negative
  { id: 'motivated-seller-vibe', categoryId: 'deal-feel', text: 'Motivated seller vibe', tone: 'negative', seedVotes: 0 },
  { id: 'long-on-market-feel', categoryId: 'deal-feel', text: 'Feels long on market', tone: 'negative', seedVotes: 1 },
  { id: 'price-high-for-condition', categoryId: 'deal-feel', text: 'Price feels high for condition', tone: 'negative', seedVotes: 2 },
  { id: 'needs-negotiation-room', categoryId: 'deal-feel', text: 'Needs negotiation room', tone: 'negative', seedVotes: 1 },
]

export function labelsForCategory(categoryId: BuyerLabelCategoryId) {
  return BUYER_COMMUNITY_LABELS.filter((label) => label.categoryId === categoryId)
}

export function totalSeedVotes() {
  return BUYER_COMMUNITY_LABELS.reduce((sum, label) => sum + label.seedVotes, 0)
}

export function labelToneById(labelId: string): BuyerLabelTone | undefined {
  return BUYER_COMMUNITY_LABELS.find((label) => label.id === labelId)?.tone
}
