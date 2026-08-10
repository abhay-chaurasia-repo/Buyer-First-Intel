import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

/**
 * Orange / terracotta background from the reference logo.
 */
export const APP_ICON_SAFFRON = '#C88A58'

type AppIconProps = {
  className?: string
  size?: number
  title?: string
  testId?: string
}

/**
 * Due Diligence app icon.
 *
 * Matches the supplied reference:
 * - Orange rounded-square / squircle background
 * - White minimalist house
 * - White magnifying glass integrated into the house
 * - Four-pane window inside the magnifying glass
 * - Thick, rounded, uniform strokes
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  // ------------------------------------------------------------
  // Main visual proportions
  // ------------------------------------------------------------

  const stroke = 26

  // Magnifying glass
  const loupeCx = 258
  const loupeCy = 300
  const loupeR = 78

  // House floor
  const floorY = 382

  // Calculate where the floor should stop underneath the loupe.
  // This makes the house and magnifying glass visually merge.
  const loupeOuter = loupeR + stroke / 2
  const floorDy = floorY - loupeCy

  const floorEndX =
    loupeCx -
    Math.sqrt(
      Math.max(loupeOuter * loupeOuter - floorDy * floorDy, 1),
    )

  // Magnifying-glass handle
  const handleStart = loupeR + stroke * 0.15
  const handleLen = 78

  const h0x =
    loupeCx + handleStart * Math.SQRT1_2

  const h0y =
    loupeCy + handleStart * Math.SQRT1_2

  const h1x =
    h0x + handleLen * Math.SQRT1_2

  const h1y =
    h0y + handleLen * Math.SQRT1_2

  // ------------------------------------------------------------
  // Four-pane window inside magnifying glass
  // ------------------------------------------------------------

  const pane = 16
  const gap = 7
  const grid = pane * 2 + gap

  const gx = loupeCx - grid / 2
  const gy = loupeCy - grid / 2

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-labelledby={titleId}
      className={cn('shrink-0', className)}
      style={{
        width: size,
        height: size,
      }}
      data-testid={testId}
    >
      <title id={titleId}>{title}</title>

      {/* ========================================================
          ORANGE APP ICON BACKGROUND
          ======================================================== */}

      <rect
        x="8"
        y="8"
        width="496"
        height="496"
        rx="92"
        fill={APP_ICON_SAFFRON}
      />

      {/* ========================================================
          HOUSE
          ======================================================== */}

      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Roof */}
        <path d="M102 250 L256 126 L412 250" />

        {/* Left wall + bottom floor */}
        <path
          d={`M132 250 V${floorY} H${floorEndX.toFixed(1)}`}
        />

        {/* Small right wall */}
        <path d="M380 250 V274" />
      </g>

      {/* ========================================================
          CHIMNEY
          ======================================================== */}

      <rect
        x="331"
        y="106"
        width="27"
        height="70"
        rx="3"
        fill="#FFFFFF"
      />

      {/* ========================================================
          MAGNIFYING GLASS
          ======================================================== */}

      <circle
        cx={loupeCx}
        cy={loupeCy}
        r={loupeR}
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth={stroke}
      />

      {/* ========================================================
          FOUR-PANE WINDOW
          ======================================================== */}

      <g fill="#FFFFFF">
        {/* Top-left */}
        <rect
          x={gx}
          y={gy}
          width={pane}
          height={pane}
          rx="2.5"
        />

        {/* Top-right */}
        <rect
          x={gx + pane + gap}
          y={gy}
          width={pane}
          height={pane}
          rx="2.5"
        />

        {/* Bottom-left */}
        <rect
          x={gx}
          y={gy + pane + gap}
          width={pane}
          height={pane}
          rx="2.5"
        />

        {/* Bottom-right */}
        <rect
          x={gx + pane + gap}
          y={gy + pane + gap}
          width={pane}
          height={pane}
          rx="2.5"
        />
      </g>

      {/* ========================================================
          MAGNIFYING GLASS HANDLE
          ======================================================== */}

      <line
        x1={h0x}
        y1={h0y}
        x2={h1x}
        y2={h1y}
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
