import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Scale } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { getGuidanceDoc, inAppBrowsePath } from '@/data/nrecGuidance'

/**
 * In-app guidance reader — links open here instead of leaving the app shell.
 */
export function GuidanceScreen() {
  const navigate = useNavigate()
  const { docId = '' } = useParams<{ docId: string }>()
  const doc = getGuidanceDoc(docId)

  if (!doc) {
    return (
      <AppShell
        className="bfi-ink-wash"
        contentClassName="relative bfi-ink-wash text-night-ink"
      >
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
      : 'Commission settlement buyer brief'

  return (
    <AppShell
      className="bfi-ink-wash"
      contentClassName="relative overflow-hidden bfi-ink-wash text-night-ink"
    >
      <div className="pointer-events-none absolute inset-0 bfi-grid-wash opacity-50" aria-hidden />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 border-b border-white/15 bg-coastal/90 backdrop-blur-md"
          data-testid="guidance-top-bar"
        >
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-3 py-2.5">
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
              <p className="truncate font-display text-[14px] font-semibold text-saffron-glow/95">
                {doc.title}
              </p>
            </div>
            <span className="justify-self-end rounded-full border border-saffron/40 bg-saffron/20 px-1.5 py-1 text-[9px] font-medium text-saffron-glow sm:px-2.5 sm:text-[10px]">
              In-app
            </span>
          </div>
        </header>

        <article
          className="flex-1 overflow-y-auto px-5 py-5 sm:px-8"
          data-testid={`guidance-doc-${doc.id}`}
        >
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-2 text-saffron-glow">
              <Scale className="h-5 w-5" strokeWidth={2.25} />
              <span className="text-[11px] font-semibold tracking-wide text-night-faint uppercase">
                {doc.updatedLabel}
              </span>
            </div>
            <h1 className="mt-3 text-center font-display text-2xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-br from-saffron-glow via-saffron to-saffron-bright bg-clip-text text-transparent">
                {doc.title}
              </span>
            </h1>
            <p className="mt-2 text-center text-[0.95rem] leading-relaxed text-white/80">{doc.summary}</p>

            {doc.sourceUrl ? (
              <Link
                to={inAppBrowsePath(doc.sourceUrl)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-saffron/40 bg-saffron/20 px-4 text-sm font-semibold text-saffron-glow touch-manipulation"
                data-testid="link-open-official-source"
              >
                Open official source in app
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}

            <div className="mt-6 space-y-4">
              {doc.sections.map((section) => (
                <section
                  key={section.heading}
                  className="rounded-2xl border border-white/25 bg-coastal/90 p-4 shadow-[0_16px_40px_rgb(42_31_32/0.35)] backdrop-blur-md"
                >
                  <h2 className="font-display text-[11px] font-bold tracking-[0.16em] text-night-muted uppercase">
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
