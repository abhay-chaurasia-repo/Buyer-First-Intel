import { SEARCH_PLAN } from '@/data/authPolicy'
import { monthLabel, type SearchQuotaSnapshot } from '@/data/searchQuota'

type SearchQuotaBarProps = {
  snapshot: SearchQuotaSnapshot
}

export function SearchQuotaBar({ snapshot }: SearchQuotaBarProps) {
  if (snapshot.unlimited) {
    return (
      <p
        className="text-center text-[12px] font-medium text-saffron-glow"
        data-testid="search-quota-unlimited"
      >
        Unlimited searches · {snapshot.monthLabel}
      </p>
    )
  }

  const left =
    typeof snapshot.remaining === 'number' ? snapshot.remaining : SEARCH_PLAN.freeSearchesPerMonth

  return (
    <p
      className="text-center text-[12px] text-night-muted"
      data-testid="search-quota-remaining"
    >
      <span className="font-semibold text-night-ink">{left}</span> of{' '}
      {SEARCH_PLAN.freeSearchesPerMonth} free searches left this month
    </p>
  )
}

type SearchPaywallProps = {
  snapshot: SearchQuotaSnapshot
  onUnlock: () => void
}

export function SearchPaywall({ snapshot, onUnlock }: SearchPaywallProps) {
  return (
    <div
      className="mt-4 rounded-[1.25rem] border border-saffron/40 bg-saffron/15 p-4 text-center"
      data-testid="search-paywall"
    >
      <p className="font-display text-[1.05rem] font-semibold tracking-tight text-night-ink">
        You’ve used your {SEARCH_PLAN.freeSearchesPerMonth} free searches
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-night-muted">
        Unlock unlimited address searches for the rest of {monthLabel(snapshot.monthKey)} for{' '}
        {SEARCH_PLAN.currencyLabel}.
      </p>
      <button
        type="button"
        onClick={onUnlock}
        className="mt-3.5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-saffron px-5 text-[0.95rem] font-semibold text-white shadow-[0_10px_28px_rgb(232_145_58/0.35)] touch-manipulation hover:bg-saffron-deep"
        data-testid="button-unlock-unlimited-searches"
      >
        Unlock unlimited · {SEARCH_PLAN.currencyLabel}
      </button>
      <p className="mt-2 text-[11px] text-night-faint">
        Demo unlock on this device — real checkout comes with payments.
      </p>
    </div>
  )
}
