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
 * Bold white house + filled chimney + loupe with a tight 2×2 window grid.
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

      {/* App-icon squircle */}
      <rect width="512" height="512" rx="114" ry="114" fill={APP_ICON_SAFFRON} />

      {/* Solid filled chimney block on the right roof slope */}
      <rect x="338" y="118" width="28" height="52" rx="4" fill="#FFFFFF" />

      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Gable roof with slight eaves */}
        <path d="M86 252 L256 132 L426 252" />
        {/* Left wall + floor — stops cleanly at the loupe */}
        <path d="M122 252 V380 H250" />
        {/* Short right wall under the right eave */}
        <path d="M390 252 V278" />
      </g>

      {/* Magnifier — bold ring; saffron fill clears house strokes behind */}
      <circle
        cx="268"
        cy="300"
        r="86"
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth="28"
      />

      {/* Tight 2×2 solid white window grid */}
      <g fill="#FFFFFF">
        <rect x="246" y="278" width="18" height="18" rx="2.5" />
        <rect x="272" y="278" width="18" height="18" rx="2.5" />
        <rect x="246" y="304" width="18" height="18" rx="2.5" />
        <rect x="272" y="304" width="18" height="18" rx="2.5" />
      </g>

      {/* Thick solid handle toward bottom-right */}
      <line
        x1="332"
        y1="360"
        x2="404"
        y2="432"
        stroke="#FFFFFF"
        strokeWidth="28"
        strokeLinecap="round"
      />
    </svg>
  )
}
