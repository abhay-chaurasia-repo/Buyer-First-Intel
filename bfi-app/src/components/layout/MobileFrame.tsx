import type { ReactNode } from 'react'

/**
 * Locks the app into a phone-sized viewport.
 * On real phones it fills the screen; on larger displays it sits in a device frame.
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

