import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, ShieldCheck, ThumbsUp, Users } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { APP_TAGLINE } from '@/data/brand'
import { IMPACT_PAGES, type ImpactPage } from '@/data/impactStory'
import { cn } from '@/lib/utils'

const AUTO_MS = 3500

function SizeSnippet() {
  return (
    <div
      className="rounded-2xl border border-white/25 bg-transparent p-3 text-night-ink"
      data-testid="impact-snippet-size"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-saffron/25">
          <FileText className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
        </span>
        <p className="font-display text-[10px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          County living area
        </p>
      </div>
      <div className="mt-3 flex min-h-11 items-center justify-between rounded-xl px-2 py-2">
        <span className="text-[13px] text-night-muted">County sqft</span>
        <span className="text-sm font-semibold text-night-ink">2,509</span>
      </div>
      <div className="mt-1.5 rounded-xl border border-saffron/35 bg-saffron/10 px-2.5 py-2">
        <p className="text-[10px] font-bold tracking-wide text-saffron-glow uppercase">
          Remote insight · no visit needed
        </p>
        <div className="mt-1.5 space-y-1">
          {[
            { text: 'Published listing size matches county', tone: 'plus' as const, votes: 4 },
            {
              text: 'Published listing size looks larger than county',
              tone: 'watch' as const,
              votes: 5,
            },
          ].map((label) => (
            <div key={label.text} className="flex items-center gap-2 py-1">
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  label.tone === 'plus'
                    ? 'bg-saffron/20 text-saffron-glow'
                    : 'bg-night-ink/12 text-night-muted',
                )}
              >
                {label.tone === 'plus' ? 'Plus' : 'Watch'}
              </span>
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-night-ink">
                {label.text}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-saffron-glow">
                <ThumbsUp className="h-3 w-3" strokeWidth={2.25} />
                {label.votes}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VisitsSnippet() {
  return (
    <div
      className="rounded-2xl border border-white/25 bg-transparent p-3 text-night-ink"
      data-testid="impact-snippet-visits"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-saffron/25">
          <ShieldCheck className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
            Verified visits
          </p>
          <p className="text-[11px] text-night-faint">6 visits · 5 with labels</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {[
          { when: 'Tue, Aug 5 · 9:03 AM', who: 'Visitor E', tag: '2 labels' },
          { when: 'Sat, Aug 1 · 6:15 PM', who: 'Visitor A', tag: '3 labels' },
          { when: 'Wed, Jul 22 · 11:48 AM', who: 'Visitor C', tag: '3 labels' },
        ].map((row) => (
          <div
            key={row.when}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-night-ink">{row.when}</p>
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
      className="rounded-2xl border border-white/25 bg-transparent p-3 text-night-ink"
      data-testid="impact-snippet-community"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-saffron/25">
          <Users className="h-4 w-4 text-saffron-glow" strokeWidth={2.25} />
        </span>
        <p className="font-display text-[10px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          Buyer Community
        </p>
      </div>
      <div className="mt-3 space-y-1">
        {[
          { text: 'Quiet at night', tone: 'plus' as const, votes: 4 },
          { text: 'High-tension cables nearby', tone: 'watch' as const, votes: 2 },
          { text: 'Published listing size matches county', tone: 'plus' as const, votes: 4 },
          { text: 'Mature trees', tone: 'plus' as const, votes: 4 },
        ].map((label) => (
          <div
            key={label.text}
            className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-2"
          >
            <span
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                label.tone === 'plus'
                  ? 'bg-saffron/20 text-saffron-glow'
                  : 'bg-night-ink/12 text-night-muted',
              )}
            >
              {label.tone === 'plus' ? 'Plus' : 'Watch'}
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-night-ink">
              {label.text}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-saffron-glow">
              <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="tabular-nums">{label.votes}</span>
            </span>
          </div>
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
  const isDay = page.mood === 'day'

  return (
    <div className="relative flex h-full w-full shrink-0 flex-col overflow-hidden">
      <img
        src={page.image}
        alt={page.imageAlt}
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          // Bright exteriors → dusk luminance like the visits slide
          isDay && 'brightness-[0.62] contrast-[1.12] saturate-[0.88]',
        )}
      />
      {/* Same pleasing visits wash: open mid so the scene shows; type still pops */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/58 via-ink/38 to-ink/90"
        aria-hidden
      />
      {/* Soft left scrim for copy — keeps brick / stoop / porch glow visible on the right */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink/45 via-ink/18 to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-8%,rgb(232_145_58/0.18),transparent_58%)]"
        aria-hidden
      />
      {/* Clear the logo + tagline, with a little air — not as much as before */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-[max(5.5rem,calc(var(--bfi-status-pad)+4rem))] pb-[11.5rem]">
        <p className="font-display text-[11px] font-bold tracking-[0.16em] text-saffron-glow uppercase">
          {page.eyebrow}
        </p>
        <h1 className="mt-3.5 max-w-[20rem] font-display text-[1.35rem] font-semibold leading-snug tracking-tight">
          <span className="bg-gradient-to-br from-saffron-glow via-saffron-bright to-saffron bg-clip-text text-transparent">
            {page.title}
          </span>
        </h1>
        <p className="mt-3.5 max-w-[20rem] text-[0.9rem] leading-relaxed text-night-muted">
          {page.body}
        </p>
        <div className="mt-5 max-w-sm animate-bfi-rise">
          <Snippet kind={page.snippet} />
        </div>
      </div>
    </div>
  )
}

/**
 * Welcome impact story — same scene language as inner diligence screens.
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
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden text-night-ink bfi-scene-type"
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
      {/* Full-bleed carousel — image fills the entire phone frame */}
      <div className="absolute inset-0 overflow-hidden">
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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-5 bfi-status-pad">
        <div className="pointer-events-auto flex items-center gap-2 pb-2 pt-1">
          <BrandLogo size={36} />
        </div>
        <span className="pointer-events-none shrink-0 rounded-full border border-saffron/40 bg-saffron/20 px-3 py-1 text-xs font-medium text-saffron-glow">
          {APP_TAGLINE}
        </span>
      </header>

      <div className="absolute inset-x-0 bottom-0 z-20 space-y-3 bg-gradient-to-t from-ink via-ink/90 to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
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
          onClick={() => navigate('/signup')}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-saffron text-base font-semibold text-white shadow-[0_6px_16px_rgb(232_145_58/0.3)] transition-colors hover:bg-saffron-deep touch-manipulation"
          data-testid="button-impact-continue"
        >
          Start due diligence
          <ArrowRight className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-transparent text-base font-semibold text-night-muted transition-colors hover:border-saffron/40 hover:text-saffron-glow touch-manipulation"
          data-testid="button-impact-login"
        >
          Already have an account? Log in
        </button>
      </div>
    </div>
  )
}
