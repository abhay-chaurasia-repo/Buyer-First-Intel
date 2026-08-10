import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

/** Warm terracotta from the logo reference */
export const APP_ICON_SAFFRON = '#CA8544'

type AppIconProps = {
  className?: string
  size?: number
  title?: string
  testId?: string
}

/**
 * Due Diligence app icon — terracotta squircle, white house + loupe.
 * Thinner inclined roof; smaller floating loupe (no wall contact);
 * tapered handle (thin at rim → bold at tip); no right wall.
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

      <rect width="512" height="512" rx="114" ry="114" fill={APP_ICON_SAFFRON} />

      {/* Thinner, more inclined roof — no right wall */}
      <path
        d="M104 252 L256 120 L408 252"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left wall + floor only; stops short of the loupe */}
      <path
        d="M136 252 V380 H198"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Solid chimney — right side extends down to meet the roof slope */}
      <path
        d="M328 126 L372 126 L372 230 L328 190 Z"
        fill="#FFFFFF"
      />

      {/* Smaller floating loupe — not touching house walls */}
      <circle
        cx="268"
        cy="304"
        r="62"
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth="26"
      />

      {/* 4-pane window */}
      <g fill="#FFFFFF">
        <rect x="248" y="284" width="14" height="14" rx="2.5" />
        <rect x="270" y="284" width="14" height="14" rx="2.5" />
        <rect x="248" y="306" width="14" height="14" rx="2.5" />
        <rect x="270" y="306" width="14" height="14" rx="2.5" />
      </g>

      {/* Handle: thin where it meets the circle, bold toward the tip */}
      <line
        x1="314"
        y1="348"
        x2="338"
        y2="372"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <line
        x1="334"
        y1="368"
        x2="392"
        y2="426"
        stroke="#FFFFFF"
        strokeWidth="34"
        strokeLinecap="round"
      />
    </svg>
  )
}
