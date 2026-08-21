import type { ReactNode } from 'react'

/**
 * Modern mobile-app screen:
 * edge-to-edge on phones; centered phone device on larger displays.
 */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bfi-phone-stage" data-testid="phone-stage">
      <div className="bfi-phone-frame" data-testid="mobile-frame">
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
