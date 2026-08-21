/**
 * Buyer-facing guidance grounded in public residential broker-commission
 * settlement practice changes. Educational only — not legal advice.
 */

export type GuidanceDoc = {
  id: string
  path: string
  eyebrow: string
  title: string
  summary: string
  updatedLabel: string
  sections: Array<{ heading: string; paragraphs: string[] }>
}

export const BUYER_COMMISSION_BRIEF: GuidanceDoc = {
  id: 'buyer-commission-brief',
  path: '/guidance/buyer-commission-brief',
  eyebrow: 'For buyers · before you commit more time or money',
  title: 'What the commission settlements mean for you',
  summary:
    'Residential broker-commission antitrust settlements changed how buyer representation and compensation are disclosed. Use this before you tour, make an offer, or sign a representation agreement.',
  updatedLabel: 'Buyer brief · general education',
  sections: [
    {
      heading: 'What the lawsuits were about',
      paragraphs: [
        'Several lawsuits alleged an anticompetitive agreement that resulted in home sellers paying inflated commissions to real estate brokers or agents, in violation of antitrust law.',
        'Settlements included major industry defendants. Public materials described combined settlement value in the billions range across defendants.',
        'Court approvals and appeals can affect timing. Treat settlement status as changing — confirm current details with your agent or attorney, not this app alone.',
      ],
    },
    {
      heading: 'Who the settlement class focuses on',
      paragraphs: [
        'Eligibility to claim settlement benefits is primarily described for people who sold a home, listed it on an MLS, and paid a commission during eligible date ranges. That is seller-side claim language in public materials.',
        'As a buyer, you may not be filing that claim — but the practice changes that came with the settlement still affect touring, written agreements, and how compensation is negotiated.',
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
        'Writing an offer — or spending more time on a house — is easier when you already know the county record story: living area vs listing claims, tax history, sales history, schools, and what buyers labeled after confirming presence at the pin.',
        'Due Diligence is for home buyers: county records and diligence tools first, so you commit more time or money with questions answered.',
        'Star homes into Homes in Diligence, confirm presence at the pin, and use Journey to track Prepare → Diligence → Offer → Close.',
      ],
    },
  ],
}

export const BUYER_BEFORE_COMMIT_BRIEF: GuidanceDoc = {
  id: 'before-you-commit',
  path: '/guidance/before-you-commit',
  eyebrow: 'Buyer playbook',
  title: 'Do this before you commit more time or money',
  summary:
    'A short sequence so you keep leverage: know the property, know the commission rules, then decide what help you want to pay for.',
  updatedLabel: 'Buyer playbook · Due Diligence',
  sections: [
    {
      heading: '1. Diligence the address yourself',
      paragraphs: [
        'Paste the address in Due Diligence. Compare County’s Fact to listing size. Read sales and tax history. Check schools and surroundings labels from buyers who confirmed presence.',
        'Write private notes on what would change your mind. Star only the addresses worth a second look.',
      ],
    },
    {
      heading: '2. Know compensation is negotiable',
      paragraphs: [
        'Broker fees and commissions are not set by law. Before you tour in many MLS markets, expect a written buyer agreement that states what you will pay (or how pay is determined) in clear terms.',
        'Do not sign open-ended compensation language. Ask what happens if a seller later offers a concession — your agreement should cap what a representative can receive.',
      ],
    },
    {
      heading: '3. Decide what help you want to pay for',
      paragraphs: [
        'Negotiation, contract paperwork, scheduling access, and local custom still matter. You can still choose full-service, limited service, or (where lawful) represent yourself with other professional help.',
        'Use Journey for your overall buying path. Each saved home also has its own diligence checklist.',
      ],
    },
    {
      heading: '4. Confirm presence at the pin',
      paragraphs: [
        'Due Diligence’s Confirm action logs Presence Confirmed: your phone was within about 100 meters of the property pin, with date and time. That dated log is permanent. You can add Plus/Watch observations for two weeks after Confirm. The log does not prove you entered the home or completed a tour.',
      ],
    },
  ],
}

/** @deprecated old path — use BUYER_BEFORE_COMMIT_BRIEF */
export const BUYER_BEFORE_AGENT_BRIEF = BUYER_BEFORE_COMMIT_BRIEF

export const GUIDANCE_DOCS: GuidanceDoc[] = [BUYER_COMMISSION_BRIEF, BUYER_BEFORE_COMMIT_BRIEF]

export function getGuidanceDoc(id: string) {
  // Legacy IDs from earlier drafts → current buyer briefs
  if (id === 'nrec-visit-verdict' || id === 'nrec-cost-transparency') {
    return BUYER_COMMISSION_BRIEF
  }
  if (id === 'before-you-talk-to-an-agent') {
    return BUYER_BEFORE_COMMIT_BRIEF
  }
  return GUIDANCE_DOCS.find((doc) => doc.id === id)
}
