import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, ShieldCheck, ThumbsUp, Users } from 'lucide-react'
import { IMPACT_PAGES, markImpactSeen, type ImpactPage } from '@/data/impactStory'
import { cn } from '@/lib/utils'

function SizeSnippet() {
  return (
    <div
      className="rounded-2xl border border-white/25 bg-coastal/90 p-3 text-night-ink shadow-[0_16px_40px_rgb(42_31_32/0.35)] backdrop-blur-md"
      data-testid="impact-snippet-size"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-saffron/25">
          <FileText className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
        </span>
        <p className="font-display text-[10px] font-bold tracking-[0.16em] text-night-muted uppercase">
          Size & records
        </p>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between rounded-xl bg-coastal-deep/70 px-3 py-2.5">
          <span className="text-[12px] text-night-muted">County sqft</span>
          <span className="text-[13px] font-semibold text-night-ink">2,509</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-coastal-deep/70 px-3 py-2.5">
          <span className="text-[12px] text-night-muted">Listing claim</span>
          <span className="text-[13px] font-semibold text-saffron-glow">2,924</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-saffron/40 bg-saffron/20 px-3 py-2.5">
          <span className="text-[12px] text-saffron-glow">Delta</span>
          <span className="text-[13px] font-bold text-saffron-glow">+16%</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-night-faint">Listing size differs from county records</p>
    </div>
  )
}

function VisitsSnippet() {
  return (
    <div
      className="rounded-2xl border border-white/25 bg-coastal/90 p-3 text-night-ink shadow-[0_16px_40px_rgb(42_31_32/0.35)] backdrop-blur-md"
      data-testid="impact-snippet-visits"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-saffron/25">
          <ShieldCheck className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-bold tracking-[0.16em] text-night-muted uppercase">
            Verified visits
          </p>
          <p className="text-[11px] text-night-faint">6 visits · 5 with labels</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          { when: 'Tue, Aug 5 · 9:03 AM', who: 'Visitor E', tag: '2 labels' },
          { when: 'Sat, Aug 1 · 6:15 PM', who: 'Visitor A', tag: '3 labels' },
          { when: 'Wed, Jul 22 · 11:48 AM', who: 'Visitor C', tag: '3 labels' },
        ].map((row) => (
          <div
            key={row.when}
            className="flex items-center justify-between gap-2 rounded-xl bg-coastal-deep/70 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-night-ink">{row.when}</p>
              <p className="text-[11px] text-night-faint">{row.who}</p>
            </div>
            <span className="shrink-0 rounded-md bg-saffron/20 px-1.5 py-0.5 text-[10px] font-bold text-saffron-glow">
              {row.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommunitySnippet() {
  return (
    <div
      className="rounded-2xl border border-white/25 bg-coastal/90 p-3 text-night-ink shadow-[0_16px_40px_rgb(42_31_32/0.35)] backdrop-blur-md"
      data-testid="impact-snippet-community"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-saffron/25">
          <Users className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
        </span>
        <p className="font-display text-[10px] font-bold tracking-[0.16em] text-night-muted uppercase">
          Buyer Community
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { text: 'Quiet at night', tone: 'plus' as const, votes: 4 },
          { text: 'High-tension cables nearby', tone: 'watch' as const, votes: 2 },
          { text: 'Listing size differs from county', tone: 'watch' as const, votes: 3 },
          { text: 'Mature trees', tone: 'plus' as const, votes: 4 },
        ].map((label) => (
          <span
            key={label.text}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium',
              label.tone === 'plus'
                ? 'border-saffron/35 bg-saffron/15 text-saffron-glow'
                : 'border-white/20 bg-night-ink/10 text-night-muted',
            )}
          >
            <ThumbsUp className="h-3 w-3" strokeWidth={2.25} />
            {label.text}
            <span className="tabular-nums opacity-80">{label.votes}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Snippet({ kind }: { kind: ImpactPage['snippet'] }) {
  if (kind === 'size') return <SizeSnippet />
  if (kind === 'visits') return <VisitsSnippet />
  return <CommunitySnippet />
}

/**
 * Asana-style impact story — three pages that explain BFI before first use.
 */
export function ImpactStoryScreen() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const page = IMPACT_PAGES[index]!
  const isLast = index === IMPACT_PAGES.length - 1

  function finishAndGo(path: string) {
    markImpactSeen()
    navigate(path)
  }

  function handlePrimary() {
    if (isLast) {
      finishAndGo('/')
      return
    }
    setIndex((value) => value + 1)
  }

  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-ink text-white"
      data-testid="impact-story"
      data-page={page.id}
    >
      <img
        src={page.image}
        alt={page.imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/92"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-dvh flex-col px-5 pb-8 pt-12 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.35)]">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="font-display text-sm font-semibold tracking-[0.14em] uppercase">
              BFI
            </span>
          </div>
          <button
            type="button"
            onClick={() => finishAndGo('/')}
            className="min-h-10 rounded-full px-3 text-sm font-medium text-white/80 transition-colors hover:text-white touch-manipulation"
            data-testid="button-impact-skip"
          >
            Skip
          </button>
        </header>

        <div className="mt-8 flex flex-1 flex-col">
          <p className="font-display text-[11px] font-bold tracking-[0.18em] text-saffron-glow uppercase">
            {page.eyebrow}
          </p>
          <h1 className="mt-3 max-w-sm font-display text-[1.85rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">
            {page.title}
          </h1>
          <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-white/80">{page.body}</p>

          <div className="mt-8 max-w-sm animate-bfi-rise">
            <Snippet kind={page.snippet} />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-center gap-2" aria-label="Story progress">
            {IMPACT_PAGES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  'h-2 rounded-full transition-all touch-manipulation',
                  i === index ? 'w-7 bg-saffron' : 'w-2 bg-white/35 hover:bg-white/55',
                )}
                aria-label={`Go to story ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrimary}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-saffron text-base font-semibold text-white shadow-[0_10px_28px_rgb(232_145_58/0.4)] transition-colors hover:bg-saffron-deep touch-manipulation"
            data-testid="button-impact-continue"
          >
            {isLast ? 'Start due diligence' : 'Continue'}
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => finishAndGo('/login')}
            className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-white/90 underline-offset-2 hover:underline touch-manipulation"
            data-testid="button-impact-login"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  )
}
