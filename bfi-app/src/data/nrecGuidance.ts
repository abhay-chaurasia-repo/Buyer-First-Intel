/**
 * Buyer-facing guidance grounded in the residential real estate broker
 * commissions antitrust settlements (NAR / related defendants).
 * Official source: https://www.realestatecommissionlitigation.com/nar
 */

export const NAR_SETTLEMENT_URL =
  'https://www.realestatecommissionlitigation.com/nar'

export type GuidanceDoc = {
  id: string
  path: string
  eyebrow: string
  title: string
  summary: string
  updatedLabel: string
  sections: Array<{ heading: string; paragraphs: string[] }>
  /** Optional official URL opened inside the in-app browser */
  sourceUrl?: string
  sourceLabel?: string
}

export const BUYER_COMMISSION_BRIEF: GuidanceDoc = {
  id: 'buyer-commission-brief',
  path: '/guidance/buyer-commission-brief',
  eyebrow: 'For buyers · before you hire an agent',
  title: 'What the commission settlements mean for you',
  summary:
    'Residential broker-commission antitrust settlements changed how buyer representation and compensation are disclosed. Use this before you tour, make an offer, or sign with an agent.',
  updatedLabel: 'Buyer brief · based on public settlement materials',
  sourceUrl: NAR_SETTLEMENT_URL,
  sourceLabel: 'Official NAR / HomeServices settlement site',
  sections: [
    {
      heading: 'What the lawsuits were about',
      paragraphs: [
        'Several lawsuits alleged an anticompetitive agreement that resulted in home sellers paying inflated commissions to real estate brokers or agents, in violation of antitrust law.',
        'Settlements include The National Association of REALTORS® (NAR) and HomeServices (also known as Berkshire Hathaway HomeServices), among other defendants. Public materials state the combined settlement value with NAR, HomeServices, and other defendants is over $1 billion.',
        'The court granted final approval to the NAR and HomeServices settlements on November 27, 2024. Appeals can delay when settlements become final and when benefits are distributed — check the official site for the latest status.',
      ],
    },
    {
      heading: 'Who the settlement class focuses on',
      paragraphs: [
        'Eligibility to claim settlement benefits is primarily described for people who sold a home, listed it on an MLS, and paid a commission during eligible date ranges. That is seller-side claim language on the official site.',
        'As a buyer, you may not be filing that claim — but the practice changes that came with the settlement still affect how you hire an agent, what you sign before touring, and how compensation is negotiated.',
      ],
    },
    {
      heading: 'Practice changes that affect buyers',
      paragraphs: [
        'Offers of compensation to buyer brokers are no longer allowed on Multiple Listing Services (MLS). Compensation can still be negotiated off-MLS between consumers and professionals.',
        'If your agent uses an MLS, you generally need a written buyer agreement before touring a home. That agreement should state compensation in an objective way (for example a flat fee, percent, or hourly rate — not open-ended), say commissions are negotiable and not set by law, and limit the agent from collecting more than you agreed.',
        'Seller concessions (for example help with closing costs) may still appear in marketing channels in ways that differ from old “buyer agent commission on MLS” fields. Read every number yourself.',
      ],
    },
    {
      heading: 'Why Due Diligence puts facts first',
      paragraphs: [
        'Talking to an agent or writing an offer is easier when you already know the county record story: living area vs listing claims, tax history, sales history, schools, and what verified visitors labeled on site.',
        'Due Diligence is for home buyers: no MLS feed, no prices, county records and diligence tools first — so you walk into agent conversations with questions, not a blank slate.',
        'Star properties into Watchlist, verify visits on site, and use Journey to track prepare → diligence → offer → close.',
      ],
    },
  ],
}

export const BUYER_BEFORE_AGENT_BRIEF: GuidanceDoc = {
  id: 'before-you-talk-to-an-agent',
  path: '/guidance/before-you-talk-to-an-agent',
  eyebrow: 'Buyer playbook',
  title: 'Do this before you talk to a real estate agent',
  summary:
    'A short sequence so you keep leverage: know the property, know the commission rules, then decide what help you want to pay for.',
  updatedLabel: 'Buyer playbook · Due Diligence',
  sourceUrl: NAR_SETTLEMENT_URL,
  sourceLabel: 'Official settlement website',
  sections: [
    {
      heading: '1. Diligence the address yourself',
      paragraphs: [
        'Paste the address in Due Diligence. Compare County’s Fact to listing size. Read sales and tax history. Check schools and surroundings labels from verified visitors.',
        'Write private notes on what would change your mind. Star only the addresses worth a second look.',
      ],
    },
    {
      heading: '2. Know compensation is negotiable',
      paragraphs: [
        'Broker fees and commissions are not set by law. Before you tour with an MLS-using agent, expect a written buyer agreement that states what you will pay (or how pay is determined) in clear terms.',
        'Do not sign open-ended compensation language. Ask what happens if a seller later offers a concession — your agreement should cap what your agent can receive.',
      ],
    },
    {
      heading: '3. Decide what you want an agent for',
      paragraphs: [
        'Negotiation, contract paperwork, scheduling access, and local custom still matter. You can still choose full-service, limited service, or (where lawful) represent yourself with other professional help.',
        'Use Journey’s checklist so agent conversations stay on your timeline — not a pressure script.',
      ],
    },
    {
      heading: '4. Visit with your eyes open',
      paragraphs: [
        'Due Diligence Verify logs GPS presence with date and time at no charge inside the app. Use that log — and Buyer Community Plus/Watch labels — to remember what you actually observed before you escalate to an offer.',
      ],
    },
  ],
}

export const GUIDANCE_DOCS: GuidanceDoc[] = [BUYER_COMMISSION_BRIEF, BUYER_BEFORE_AGENT_BRIEF]

export function getGuidanceDoc(id: string) {
  // Legacy IDs from earlier drafts → current buyer briefs
  if (id === 'nrec-visit-verdict' || id === 'nrec-cost-transparency') {
    return BUYER_COMMISSION_BRIEF
  }
  return GUIDANCE_DOCS.find((doc) => doc.id === id)
}

export function inAppBrowsePath(url: string) {
  return `/browse?url=${encodeURIComponent(url)}`
}
