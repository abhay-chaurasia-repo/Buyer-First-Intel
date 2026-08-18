import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Scale } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { getGuidanceDoc } from '@/data/nrecGuidance'

/**
 * In-app guidance reader — links open here instead of leaving the app shell.
 */
export function GuidanceScreen() {
  const navigate = useNavigate()
  const { docId = '' } = useParams<{ docId: string }>()
  const doc = getGuidanceDoc(docId)

  if (!doc) {
    return (
      <AppShell scene="guidance" contentClassName="relative text-night-ink">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-night-muted">Guidance not found.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-saffron px-4 text-sm font-semibold text-white touch-manipulation"
          >
            Back to Search
          </button>
        </div>
      </AppShell>
    )
  }

  const relatedId =
    doc.id === 'buyer-commission-brief'
      ? 'before-you-talk-to-an-agent'
      : 'buyer-commission-brief'
  const relatedLabel =
    doc.id === 'buyer-commission-brief'
      ? 'Before you talk to an agent'
      : 'What the commission settlements mean for you'

  return (
    <AppShell scene="guidance" contentClassName="relative overflow-hidden text-night-ink">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header
          className="relative z-20 shrink-0 bfi-status-pad"
          data-testid="guidance-top-bar"
        >
          <div
            className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-3 pb-2 pt-2"
            data-testid="page-title-open"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
              aria-label="Back"
              data-testid="button-guidance-back"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate font-display text-[11px] font-bold tracking-[0.14em] text-saffron-glow uppercase">
                {doc.eyebrow}
              </p>
              <p className="truncate font-display text-[14px] font-semibold text-night-ink">
                {doc.title}
              </p>
            </div>
            <span className="justify-self-end rounded-full border border-saffron/40 bg-saffron/20 px-1.5 py-1 text-[9px] font-medium text-saffron-glow sm:px-2.5 sm:text-[10px]">
              In-app
            </span>
          </div>
        </header>

        <article
          className="flex-1 overflow-y-auto px-5 py-5"
          data-testid={`guidance-doc-${doc.id}`}
        >
          <div className="mx-auto w-full">
            <div className="flex items-center gap-2 text-saffron-glow">
              <Scale className="h-5 w-5" strokeWidth={2.25} />
              <span className="text-[11px] font-semibold tracking-wide text-night-faint uppercase">
                {doc.updatedLabel}
              </span>
            </div>
            <h1 className="mt-3 text-center font-display text-[1.25rem] font-semibold tracking-tight text-night-ink">
              {doc.title}
            </h1>
            <p className="mt-2 text-center text-[0.95rem] leading-relaxed text-night-muted">{doc.summary}</p>

            <div
              className="mt-4 rounded-2xl border border-white/25 bg-transparent p-3 text-left"
              data-testid="guidance-disclaimer-note"
            >
              <p className="text-[10px] font-bold tracking-wide text-night-faint uppercase">Note</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-night-muted">
                General buyer education only — not legal advice and not an official settlement or
                REALTOR® channel. Confirm current rules with your agent or attorney before you sign.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {doc.sections.map((section) => (
                <section
                  key={section.heading}
                  className="rounded-2xl border border-white/25 bg-transparent p-4"
                >
                  <h2 className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
                    {section.heading}
                  </h2>
                  <div className="mt-2 space-y-3">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 48)}
                        className="text-[14px] leading-relaxed text-night-muted"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 space-y-2 border-t border-white/15 pt-5 pb-2">
              <p className="text-[12px] text-night-faint">Related in-app guidance</p>
              <Link
                to={`/guidance/${relatedId}`}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-saffron-glow touch-manipulation"
              >
                {relatedLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <div>
                <Link
                  to="/journey"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-saffron-glow touch-manipulation"
                >
                  Open Journey checklist
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </AppShell>
  )
}
