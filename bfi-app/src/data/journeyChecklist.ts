/** Home-buying journey checklist for the Journey tab. */

export const JOURNEY_STORAGE_KEY = 'bfi.journey-checklist'
/** Legacy key — read once so existing progress is not lost after rename */
const LEGACY_AUDIT_STORAGE_KEY = 'bfi.audit-checklist'

export type JourneyPhaseId =
  | 'prepare'
  | 'search'
  | 'diligence'
  | 'offer'
  | 'close'

export type JourneyPhase = {
  id: JourneyPhaseId
  title: string
  blurb: string
}

export type JourneyChecklistItem = {
  id: string
  phaseId: JourneyPhaseId
  title: string
  detail: string
}

export const JOURNEY_PHASES: JourneyPhase[] = [
  {
    id: 'prepare',
    title: 'Prepare',
    blurb: 'Money, criteria, and readiness before you hunt',
  },
  {
    id: 'search',
    title: 'Search & shortlist',
    blurb: 'Find addresses and park the ones worth diligence',
  },
  {
    id: 'diligence',
    title: 'Due diligence',
    blurb: 'Verify facts, visit on site, and read community signals',
  },
  {
    id: 'offer',
    title: 'Offer & negotiate',
    blurb: 'Price, terms, and contingencies with eyes open',
  },
  {
    id: 'close',
    title: 'Inspect & close',
    blurb: 'Final checks before you own it',
  },
]

export const JOURNEY_CHECKLIST: JourneyChecklistItem[] = [
  // Prepare
  {
    id: 'pre-approval',
    phaseId: 'prepare',
    title: 'Get pre-approved (or confirm cash budget)',
    detail: 'Know your ceiling before touring so diligence stays focused.',
  },
  {
    id: 'must-haves',
    phaseId: 'prepare',
    title: 'Write must-haves vs nice-to-haves',
    detail: 'Beds, commute, schools, lot, noise tolerance — keep it short.',
  },
  {
    id: 'team',
    phaseId: 'prepare',
    title: 'Line up buyer agent / attorney if you use one',
    detail: 'Decide who helps with offers, contracts, and disclosures.',
  },

  // Search
  {
    id: 'search-addresses',
    phaseId: 'search',
    title: 'Search candidate addresses in Due Diligence',
    detail: 'Start from Search and open each property command center.',
  },
  {
    id: 'star-watchlist',
    phaseId: 'search',
    title: 'Star properties into Watchlist',
    detail: 'Tap the star on a property page — it saves here automatically.',
  },
  {
    id: 'compare-shortlist',
    phaseId: 'search',
    title: 'Compare your shortlist side by side',
    detail: 'Narrow to a few addresses before deep diligence.',
  },

  // Diligence
  {
    id: 'county-vs-listing',
    phaseId: 'diligence',
    title: 'Check county facts vs listing size',
    detail: 'Open County’s Fact and Size & records labels for sqft mismatches.',
  },
  {
    id: 'sales-tax',
    phaseId: 'diligence',
    title: 'Review sales history and tax assessment',
    detail: 'Look at deed transfers and assessed value context.',
  },
  {
    id: 'verified-visit',
    phaseId: 'diligence',
    title: 'Complete a GPS verified visit',
    detail: 'Confirm presence on site — unlocks stronger community votes.',
  },
  {
    id: 'community-labels',
    phaseId: 'diligence',
    title: 'Read and upvote Buyer Community labels',
    detail: 'Plus and Watch signals from verified visitors on that address.',
  },
  {
    id: 'schools-check',
    phaseId: 'diligence',
    title: 'Confirm assigned schools',
    detail: 'Verify campuses and boundaries before you decide.',
  },
  {
    id: 'surroundings',
    phaseId: 'diligence',
    title: 'Note surroundings & utilities on site',
    detail: 'High-tension lines, towers, noise, drainage, parking feel.',
  },

  // Offer
  {
    id: 'comps-price',
    phaseId: 'offer',
    title: 'Anchor price with comps and tax context',
    detail: 'Use sales history and assessed value — not listing narrative alone.',
  },
  {
    id: 'contingencies',
    phaseId: 'offer',
    title: 'Set inspection / financing contingencies',
    detail: 'Decide what you need in the contract before you write.',
  },
  {
    id: 'submit-offer',
    phaseId: 'offer',
    title: 'Submit offer and track counter terms',
    detail: 'Keep notes on price, credits, and timeline changes.',
  },

  // Close
  {
    id: 'hire-inspector',
    phaseId: 'close',
    title: 'Hire a licensed home inspector',
    detail: 'Structure, systems, moisture — beyond a walkthrough vibe.',
  },
  {
    id: 'disclosures',
    phaseId: 'close',
    title: 'Review seller disclosures / HOA docs',
    detail: 'Read what the seller disclosed and what’s missing.',
  },
  {
    id: 'final-walkthrough',
    phaseId: 'close',
    title: 'Do final walkthrough before closing',
    detail: 'Confirm condition, repairs, and what’s staying.',
  },
  {
    id: 'close-day',
    phaseId: 'close',
    title: 'Close and record ownership',
    detail: 'Wire, sign, and keep your closing package handy.',
  },
]

export type JourneyProgress = Record<string, boolean>

export function loadJourneyProgress(): JourneyProgress {
  try {
    const raw =
      localStorage.getItem(JOURNEY_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_AUDIT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as JourneyProgress
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function persistJourneyProgress(progress: JourneyProgress) {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Ignore storage failures in demo shell
  }
}

export function journeyStats(progress: JourneyProgress) {
  const total = JOURNEY_CHECKLIST.length
  const done = JOURNEY_CHECKLIST.filter((item) => progress[item.id]).length
  return { total, done, remaining: total - done }
}
