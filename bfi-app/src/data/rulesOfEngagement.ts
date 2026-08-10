/**
 * Buyer-facing rules of engagement — touring, visit costs, and commissions.
 * General education only; not legal advice. Practice varies by state / MLS / brokerage.
 */

export type RulesSection = {
  id: string
  title: string
  paragraphs: string[]
}

export const RULES_UPDATED_LABEL = 'Draft · modify anytime · not legal advice'

export const RULES_INTRO =
  'How touring, visit costs, and commissions usually work for buyers after the residential broker-commission settlements. Confirm everything with your agent and local rules before you sign.'

export const RULES_SECTIONS: RulesSection[] = [
  {
    id: 'touring',
    title: 'Visits & touring',
    paragraphs: [
      'In many MLS markets, if your agent uses the MLS you generally need a written buyer-broker agreement before touring a home. That is a practice change tied to the NAR / related settlements — not a single nationwide “NAR visit fee.”',
      'The agreement should spell out what the agent will do, how they are paid (flat fee, percent, hourly, or another clear amount), that commissions are negotiable and not set by law, and that they should not collect more than you agreed.',
      'Rules still vary by state, MLS, and brokerage. Ask before the first showing: “Do I need a signed buyer agreement to tour, and what does it commit me to?”',
    ],
  },
  {
    id: 'visit-cost',
    title: 'What a visit may cost',
    paragraphs: [
      'There is no standard NAR price “per visit.” Cost lives in your buyer agreement with the brokerage or agent.',
      'Common structures include a percentage of the purchase price, a flat fee, an hourly rate, or a retainer. Some agreements only become payable if you buy; others have different triggers — read the document.',
      'Before you tour: ask what you owe if you visit and do not buy, whether seller concessions can offset your agent’s fee, and when payment is due.',
    ],
  },
  {
    id: 'commissions',
    title: 'Commission charges (buyer & seller agents)',
    paragraphs: [
      'MLS listings are no longer allowed to host offers of compensation to buyer brokers the old way. Compensation is negotiated off-MLS between consumers and professionals.',
      'Seller-side and buyer-side fees are separate conversations. A seller may still choose to offer a concession that helps with your costs — that is not the same as a fixed MLS buyer-agent commission field.',
      'There is no universal “6% rule.” What you or the seller pay depends on the agreements each side signs and what gets negotiated in the deal.',
    ],
  },
  {
    id: 'negotiate',
    title: 'Can it be negotiated?',
    paragraphs: [
      'Yes. Buyer-agent compensation, seller-agent compensation, and how concessions are structured are generally negotiable.',
      'Negotiate the amount, the form (percent vs flat vs hourly), who pays whom, and what happens if the deal falls through — in writing, before you rely on verbal promises.',
      'Due Diligence does not set fees and is not a brokerage. Use this screen as a checklist of questions, then confirm with your agent, attorney, or local rules.',
    ],
  },
]
