import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Scale } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { NAR_SETTLEMENT_URL } from '@/data/nrecGuidance'

/**
 * Opens an official URL inside the app shell (iframe) so buyers stay in BFI.
 */
export function InAppBrowserScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const url = useMemo(() => {
    const raw = params.get('url')?.trim()
    if (!raw) return NAR_SETTLEMENT_URL
    try {
      const parsed = new URL(raw)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NAR_SETTLEMENT_URL
      }
      return parsed.toString()
    } catch {
      return NAR_SETTLEMENT_URL
    }
  }, [params])

  const host = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return 'source'
    }
  }, [url])

  return (
    <AppShell
      className="bfi-ink-wash"
      contentClassName="relative min-h-0 overflow-hidden bfi-ink-wash text-night-ink"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 shrink-0 border-b border-white/15 bg-coastal/90 backdrop-blur-md"
          data-testid="in-app-browser-top-bar"
        >
          <div className="flex items-center gap-2 px-2 py-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-night-muted transition-colors hover:bg-saffron/20 hover:text-saffron-glow touch-manipulation"
              aria-label="Back"
              data-testid="button-browse-back"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[11px] font-bold tracking-[0.14em] text-saffron-glow uppercase">
                In-app browser
              </p>
              <p className="truncate text-[12px] text-night-muted" title={url}>
                {host}
              </p>
            </div>
            <Link
              to="/guidance/buyer-commission-brief"
              className="shrink-0 rounded-full border border-saffron/40 bg-saffron/20 px-2.5 py-1 text-[10px] font-semibold text-saffron-glow touch-manipulation"
            >
              Buyer brief
            </Link>
          </div>
        </header>

        <div className="shrink-0 border-b border-white/15 bg-saffron/15 px-4 py-2.5">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-night-muted">
            <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron-glow" aria-hidden />
            Official settlement materials. Some sites block embedding — if the frame is blank, use
            the buyer brief summary still inside BFI.
          </p>
        </div>

        <div className="relative min-h-0 flex-1 bg-coastal-deep/40">
          <iframe
            title="Official real estate commission settlement site"
            src={url}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            data-testid="in-app-browser-frame"
          />
        </div>
      </div>
    </AppShell>
  )
}
