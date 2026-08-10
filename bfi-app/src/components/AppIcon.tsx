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
 * House outline + magnifying glass with a 2×2 window grid in the lens.
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
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Straight gable roof — wider/shorter house */}
        <path d="M78 255 L256 145 L434 255" />
        {/* Straight vertical chimney (not an L) */}
        <line x1="352" y1="175" x2="352" y2="118" />
        {/* Left wall + floor; open bottom-right for the loupe handle */}
        <path d="M112 255 V375 H275" />
        <path d="M400 255 V280" />
      </g>

      {/* Magnifier lens — saffron fill keeps house strokes from showing through */}
      <circle
        cx="256"
        cy="290"
        r="82"
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth="26"
      />

      {/* 2×2 window grid inside the lens */}
      <g fill="#FFFFFF">
        <rect x="230" y="264" width="22" height="22" rx="3" />
        <rect x="260" y="264" width="22" height="22" rx="3" />
        <rect x="230" y="294" width="22" height="22" rx="3" />
        <rect x="260" y="294" width="22" height="22" rx="3" />
      </g>

      {/* Magnifier handle at 45° */}
      <line
        x1="316"
        y1="348"
        x2="390"
        y2="422"
        stroke="#FFFFFF"
        strokeWidth="26"
        strokeLinecap="round"
      />
    </svg>
  )
}
