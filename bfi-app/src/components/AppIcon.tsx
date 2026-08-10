import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

/** Brand saffron from the design system / reference mark */
export const APP_ICON_SAFFRON = '#e8913a'

type AppIconProps = {
  className?: string
  /** Rendered box size in CSS pixels */
  size?: number
  title?: string
  testId?: string
}

/**
 * Due Diligence app icon — flat vector mark on a saffron rounded square.
 * Refined house + magnifier with a lighter stroke and proportional 2×2 window.
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-labelledby={titleId}
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
      data-testid={testId}
    >
      <title id={titleId}>{title}</title>

      {/* Standard app-icon squircle */}
      <rect width="512" height="512" rx="114" ry="114" fill={APP_ICON_SAFFRON} />

      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Wider/shorter gable — straight roof lines */}
        <path d="M72 258 L256 148 L440 258" />
        {/* Simple vertical chimney outline on the right roof slope */}
        <line x1="350" y1="178" x2="350" y2="118" />
        {/*
          House body opens at bottom-right so the loupe handle
          completes that corner without overlapping strokes.
        */}
        <path d="M118 258 V372 H248" />
        <path d="M394 258 V278" />
      </g>

      {/* Magnifier lens — saffron fill clears house strokes behind the ring */}
      <circle
        cx="268"
        cy="292"
        r="78"
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth="20"
      />

      {/* Smaller, proportional 2×2 window grid inside the lens */}
      <g fill="#FFFFFF">
        <rect x="250" y="274" width="14" height="14" rx="2" />
        <rect x="272" y="274" width="14" height="14" rx="2" />
        <rect x="250" y="296" width="14" height="14" rx="2" />
        <rect x="272" y="296" width="14" height="14" rx="2" />
      </g>

      {/*
        Handle at 45° — starts on the lens rim and extends through the
        open house corner with a clean, single stroke.
      */}
      <line
        x1="324"
        y1="346"
        x2="392"
        y2="414"
        stroke="#FFFFFF"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  )
}
