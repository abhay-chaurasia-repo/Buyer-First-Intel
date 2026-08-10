import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

export const APP_ICON_SAFFRON = '#CA8544'

type AppIconProps = {
  className?: string
  size?: number
  title?: string
  testId?: string
}

/**
 * App icon matching the supplied reference image.
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

      {/* Orange rounded-square background */}
      <rect
        x="8"
        y="8"
        width="496"
        height="496"
        rx="88"
        fill={APP_ICON_SAFFRON}
      />

      {/* House */}
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="27"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Roof */}
        <path d="M112 250 L256 130 L400 250" />

        {/* Left wall and bottom */}
        <path d="M140 250 V385 H215" />

        {/* Right wall */}
        <path d="M372 250 V270" />
      </g>

      {/* Chimney */}
      <path
        d="M332 178 V128 H358 V198"
        fill="#FFFFFF"
      />

      {/* Magnifying glass */}
      <circle
        cx="258"
        cy="300"
        r="78"
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth="27"
      />

      {/* Four-pane window */}
      <g fill="#FFFFFF">
        <rect
          x="232"
          y="274"
          width="17"
          height="17"
          rx="2"
        />

        <rect
          x="257"
          y="274"
          width="17"
          height="17"
          rx="2"
        />

        <rect
          x="232"
          y="299"
          width="17"
          height="17"
          rx="2"
        />

        <rect
          x="257"
          y="299"
          width="17"
          height="17"
          rx="2"
        />
      </g>

      {/* Magnifying glass handle */}
      <line
        x1="313"
        y1="355"
        x2="365"
        y2="407"
        stroke="#FFFFFF"
        strokeWidth="27"
        strokeLinecap="round"
      />
    </svg>
  )
}
