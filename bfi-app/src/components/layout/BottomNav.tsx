import { PrimaryNavPanel } from './PrimaryNavPanel'

export function BottomNav() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-50 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-1"
      data-testid="nav-bottom"
    >
      <PrimaryNavPanel testId="nav-bottom-panel" />
    </div>
  )
}
