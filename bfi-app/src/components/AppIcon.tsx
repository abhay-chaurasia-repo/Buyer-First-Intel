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

      {/* =====================================================
          HOUSE
          ===================================================== */}

      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Slightly thinner / more inclined roof */}
        <path d="M104 250 L256 126 L408 250" />

        {/* Left wall + bottom floor.
            Stops well before the magnifying glass. */}
        <path d="M136 250 V382 H205" />
      </g>

      {/* =====================================================
          CHIMNEY
          ===================================================== */}

      <rect
        x="332"
        y="126"
        width="26"
        height="62"
        rx="2"
        fill="#FFFFFF"
      />

      {/* =====================================================
          MAGNIFYING GLASS
          Smaller than previous version and separated
          from the house wall/floor.
          ===================================================== */}

      <circle
        cx="258"
        cy="300"
        r="70"
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth="25"
      />

      {/* =====================================================
          FOUR-PANE WINDOW
          ===================================================== */}

      <g fill="#FFFFFF">
        <rect
          x="235"
          y="277"
          width="15"
          height="15"
          rx="2"
        />

        <rect
          x="258"
          y="277"
          width="15"
          height="15"
          rx="2"
        />

        <rect
          x="235"
          y="300"
          width="15"
          height="15"
          rx="2"
        />

        <rect
          x="258"
          y="300"
          width="15"
          height="15"
          rx="2"
        />
      </g>

      {/* =====================================================
          MAGNIFYING GLASS HANDLE

          Thin where it meets the circle,
          becoming thicker toward the end.
          ===================================================== */}

      {/* Thin connection from magnifying glass */}
      <line
        x1="307"
        y1="349"
        x2="330"
        y2="372"
        stroke="#FFFFFF"
        strokeWidth="16"
        strokeLinecap="round"
      />

      {/* Thick/bold outer handle */}
      <line
        x1="327"
        y1="369"
        x2="371"
        y2="413"
        stroke="#FFFFFF"
        strokeWidth="28"
        strokeLinecap="round"
      />
    </svg>
  )
}
