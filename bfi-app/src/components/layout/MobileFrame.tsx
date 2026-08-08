import type { ReactNode } from 'react'

/**
 * Mobile-app canvas: edge-to-edge on phones, phone-width column on larger screens.
 */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bfi-phone-stage" data-testid="phone-stage">
      <div className="bfi-phone-frame" data-testid="mobile-frame">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
