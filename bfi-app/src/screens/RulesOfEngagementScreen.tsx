import { Link } from 'react-router-dom'
import { ArrowRight, Scale } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { inAppBrowsePath, NAR_SETTLEMENT_URL } from '@/data/nrecGuidance'
import {
  RULES_INTRO,
  RULES_SECTIONS,
  RULES_UPDATED_LABEL,
} from '@/data/rulesOfEngagement'

/**
 * Rules of engagement — touring, visit cost, commissions, negotiability.
 * Draft content; intended to be edited after review.
 */
export function RulesOfEngagementScreen() {
  return (
    <AppShell scene="guidance" sceneIntensity="medium" contentClassName="min-h-0 text-night-ink">
      <PageHeader
        title="Rules of engagement"
        description="Touring, visit costs, and commissions — before you sign."
        testId="rules-top-bar"
      />

      <div className="flex-1 overflow-y-auto px-3 py-4 pb-4">
        <div
          className="rounded-2xl border border-white/25 bg-transparent p-3"
          data-testid="rules-intro"
        >
          <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
            {RULES_UPDATED_LABEL}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-night-ink">{RULES_INTRO}</p>
        </div>

        <div className="mt-4 space-y-3">
          {RULES_SECTIONS.map((section) => (
            <section
              key={section.id}
              className="rounded-2xl border border-white/25 bg-transparent p-3"
              data-testid={`rules-section-${section.id}`}
            >
              <h2 className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                {section.title}
              </h2>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-[13px] leading-relaxed text-night-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Link
            to="/guidance/buyer-commission-brief"
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-saffron/40 bg-saffron/15 px-3 py-2.5 text-left touch-manipulation"
            data-testid="link-rules-commission-brief"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
                Deeper brief
              </span>
              <span className="mt-0.5 block text-[13px] font-semibold text-night-ink">
                What the commission settlements mean for you
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-saffron-glow" />
          </Link>

          <Link
            to={inAppBrowsePath(NAR_SETTLEMENT_URL)}
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/25 bg-transparent px-3 py-2.5 text-left touch-manipulation"
            data-testid="link-rules-official-settlement"
          >
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-night-faint uppercase">
                <Scale className="h-3.5 w-3.5 text-saffron-glow" strokeWidth={2.25} />
                Official source
              </span>
              <span className="mt-0.5 block text-[13px] font-semibold text-night-muted">
                NAR / HomeServices settlement site
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-night-faint" />
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
