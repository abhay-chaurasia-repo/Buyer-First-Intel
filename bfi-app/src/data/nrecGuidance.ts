/** In-app National Real Estate Commission (NREC) style guidance — demo content. */

export type GuidanceDoc = {
  id: string
  path: string
  eyebrow: string
  title: string
  summary: string
  updatedLabel: string
  sections: Array<{ heading: string; paragraphs: string[] }>
}

export const NREC_VISIT_VERDICT: GuidanceDoc = {
  id: 'nrec-visit-verdict',
  path: '/guidance/nrec-visit-verdict',
  eyebrow: 'National Real Estate Commission',
  title: 'Verdict on property visits & buyer costs',
  summary:
    'How on-site verification should work for buyers, what may be charged, and what must stay free of seller influence.',
  updatedLabel: 'Guidance brief · 2026',
  sections: [
    {
      heading: 'How a visit should work',
      paragraphs: [
        'A verified visit is a buyer-initiated presence confirmation at the listed address. Buyers should be able to confirm they were on site without dwelling timers, seller chaperones, or listing-agent gatekeeping of the verification itself.',
        'In Buyer-First Intel, Verify records GPS presence within roughly 100 meters of the property pin. Date and time are logged so other buyers can judge the pattern — the app does not invent a listing-post timestamp for you.',
        'Verified presence may unlock stronger weight on structured Buyer Community labels. Free-text marketing claims are not a substitute for these structured signals.',
      ],
    },
    {
      heading: 'What visiting should cost',
      paragraphs: [
        'Presence verification inside this buyer tool is free. There is no per-visit fee, no “verification credit,” and no charge to unlock county facts after a visit.',
        'Separate from the app: a broker or host may still set rules for physical showings (appointment windows, lockbox access). Those logistics are outside BFI. NREC guidance is that buyers should not be billed a special “due diligence visit fee” merely to stand on public right-of-way or confirm presence for their own records.',
        'If a third party demands payment solely to allow a GPS presence check, treat that as a red flag and document it in your private notes.',
      ],
    },
    {
      heading: 'Buyer-only stance',
      paragraphs: [
        'Visit logs and community labels exist to reduce manufactured urgency and asymmetric information. Seller-paid “boosted visit counts” or paid placement of labels conflict with this verdict and should not appear in a buyer-only workspace.',
        'Costs that are legitimate (inspection, appraisal, survey) remain the buyer’s choice after diligence — not a precondition of verifying that you visited.',
      ],
    },
    {
      heading: 'Practical checklist',
      paragraphs: [
        '1. Open the address in BFI and review County’s Fact vs listing size before you go.',
        '2. On site, tap Verify when you are within range — note the date and time yourself against when you believe the home was listed.',
        '3. Upvote Plus / Watch labels that match what you observed; those labels surface on Verified Visits for others.',
        '4. Keep private notes for anything sensitive; do not rely on free-text public comments.',
      ],
    },
  ],
}

export const NREC_COST_TRANSPARENCY: GuidanceDoc = {
  id: 'nrec-cost-transparency',
  path: '/guidance/nrec-cost-transparency',
  eyebrow: 'National Real Estate Commission',
  title: 'Cost transparency for buyer diligence',
  summary:
    'Which diligence steps should stay free, which are optional paid services, and how visits fit the fee picture.',
  updatedLabel: 'Guidance brief · 2026',
  sections: [
    {
      heading: 'Free by default in a buyer tool',
      paragraphs: [
        'Public-record lookup framing, visit presence confirmation, and structured community labels should not require a paywall.',
        'Watchlist and Journey checklist tracking are buyer productivity aids — not billable events.',
      ],
    },
    {
      heading: 'Optional paid work (outside the app)',
      paragraphs: [
        'Home inspection, specialized reports, surveys, and legal review are optional paid engagements the buyer chooses after early diligence.',
        'Those fees are not “visit costs.” Conflating them with a presence check misleads buyers about what verification means.',
      ],
    },
    {
      heading: 'Commission context',
      paragraphs: [
        'Broker compensation is negotiated and disclosed under applicable rules. Visit verification must not be bundled as a hidden add-on to commission or seller concessions.',
        'Buyers should be able to complete early diligence — including a verified visit — without triggering a commission obligation merely by confirming presence.',
      ],
    },
  ],
}

export const GUIDANCE_DOCS: GuidanceDoc[] = [NREC_VISIT_VERDICT, NREC_COST_TRANSPARENCY]

export function getGuidanceDoc(id: string) {
  return GUIDANCE_DOCS.find((doc) => doc.id === id)
}
