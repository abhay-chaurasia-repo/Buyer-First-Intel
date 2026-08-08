import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, ShieldCheck, ThumbsUp, Users } from 'lucide-react'
import { IMPACT_PAGES, markImpactSeen, type ImpactPage } from '@/data/impactStory'
import { cn } from '@/lib/utils'

const AUTO_MS = 2000

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

function StorySlide({ page }: { page: ImpactPage }) {
  return (
    <div className="relative flex h-full w-full shrink-0 flex-col overflow-hidden">
      <img
        src={page.image}
        alt={page.imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/92"
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col px-5 pt-24 pb-4 sm:px-8">
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
    </div>
  )
}

/**
 * Asana-style impact story — auto-advances every 2s through three pages.
 */
export function ImpactStoryScreen() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [holding, setHolding] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const page = IMPACT_PAGES[index]!

  useEffect(() => {
    if (holding) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMPACT_PAGES.length)
    }, AUTO_MS)

    return () => window.clearInterval(timer)
  }, [holding, index])

  function goTo(next: number) {
    setIndex(next)
  }

  function finishAndGo(path: string) {
    markImpactSeen()
    navigate(path)
  }

  function onPointerDown(clientX: number) {
    touchStartX.current = clientX
    setHolding(true)
  }

  function onPointerUp(clientX: number) {
    const start = touchStartX.current
    touchStartX.current = null
    setHolding(false)
    if (start == null) return
    const delta = clientX - start
    if (Math.abs(delta) < 48) return
    if (delta < 0) {
      goTo((index + 1) % IMPACT_PAGES.length)
    } else {
      goTo((index - 1 + IMPACT_PAGES.length) % IMPACT_PAGES.length)
    }
  }

  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-ink text-white"
      data-testid="impact-story"
      data-page={page.id}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('button, a')) return
        onPointerDown(event.clientX)
      }}
      onPointerUp={(event) => {
        if (touchStartX.current == null) return
        onPointerUp(event.clientX)
      }}
      onPointerCancel={() => {
        touchStartX.current = null
        setHolding(false)
      }}
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-12 sm:px-8">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron text-white shadow-[0_6px_16px_rgb(232_145_58/0.35)]">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-sm font-semibold tracking-[0.14em] uppercase">BFI</span>
        </div>
        <button
          type="button"
          onClick={() => finishAndGo('/')}
          className="pointer-events-auto min-h-10 rounded-full px-3 text-sm font-medium text-white/80 transition-colors hover:text-white touch-manipulation"
          data-testid="button-impact-skip"
        >
          Skip
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
          data-testid="impact-carousel"
        >
          {IMPACT_PAGES.map((slide) => (
            <div key={slide.id} className="h-full w-full shrink-0">
              <StorySlide page={slide} />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-20 space-y-4 bg-gradient-to-t from-ink via-ink/95 to-transparent px-5 pb-8 pt-4 sm:px-8">
        <div className="flex items-center justify-center gap-2" aria-label="Story progress">
          {IMPACT_PAGES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              className="relative h-1.5 w-10 overflow-hidden rounded-full bg-white/25 touch-manipulation"
              aria-label={`Go to story ${i + 1}`}
              aria-current={i === index}
            >
              {i < index ? <span className="absolute inset-0 rounded-full bg-saffron" /> : null}
              {i === index ? (
                <span
                  key={index}
                  className={cn(
                    'absolute inset-y-0 left-0 w-full rounded-full bg-saffron animate-impact-progress',
                    holding && 'is-paused',
                  )}
                />
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => finishAndGo('/')}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-saffron text-base font-semibold text-white shadow-[0_10px_28px_rgb(232_145_58/0.4)] transition-colors hover:bg-saffron-deep touch-manipulation"
          data-testid="button-impact-continue"
        >
          Start due diligence
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
  )
}
