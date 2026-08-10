import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

/** Warm orange from the app-icon reference */
export const APP_ICON_SAFFRON = '#E98A2F'

type AppIconProps = {
  className?: string
  /** Rendered box size in CSS pixels */
  size?: number
  title?: string
  testId?: string
}

/**
 * Due Diligence app icon — professional flat vector mark.
 * White house + interlocking magnifier with a 4-pane window on a saffron squircle.
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  // Balanced geometry with comfortable padding (~14% margins)
  const stroke = 30
  const loupeCx = 268
  const loupeCy = 300
  const loupeR = 86
  const loupeOuter = loupeR + stroke / 2
  const floorY = 382
  const floorDy = floorY - loupeCy
  const floorEndX = loupeCx - Math.sqrt(Math.max(loupeOuter * loupeOuter - floorDy * floorDy, 0))

  // Handle starts on the rim (~45°) and stays short for small-size clarity
  const handleStart = loupeR + stroke * 0.15
  const handleLen = 72
  const h0x = loupeCx + handleStart * Math.SQRT1_2
  const h0y = loupeCy + handleStart * Math.SQRT1_2
  const h1x = h0x + handleLen * Math.SQRT1_2
  const h1y = h0y + handleLen * Math.SQRT1_2

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

      {/* iOS/Android app-icon squircle */}
      <rect width="512" height="512" rx="114" ry="114" fill={APP_ICON_SAFFRON} />

      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Pitched roof with slight eaves */}
        <path d="M96 248 L256 136 L416 248" />
        {/* Rectangular body — left wall + floor meeting the loupe rim */}
        <path d={`M128 248 V${floorY} H${floorEndX.toFixed(1)}`} />
        {/* Short right wall under the eave, interlocking with the loupe */}
        <path d="M384 248 V272" />
      </g>

      {/* Solid filled chimney on the right roof slope */}
      <rect x="334" y="128" width="28" height="52" rx="4" fill="#FFFFFF" />

      {/* Magnifier lens — orange fill clears house strokes inside the ring */}
      <circle
        cx={loupeCx}
        cy={loupeCy}
        r={loupeR}
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth={stroke}
      />

      {/* 4-pane window grid — tight, even, solid white squares */}
      <g fill="#FFFFFF">
        <rect x="247" y="279" width="18" height="18" rx="2.5" />
        <rect x="271" y="279" width="18" height="18" rx="2.5" />
        <rect x="247" y="303" width="18" height="18" rx="2.5" />
        <rect x="271" y="303" width="18" height="18" rx="2.5" />
      </g>

      {/* Short diagonal handle */}
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
