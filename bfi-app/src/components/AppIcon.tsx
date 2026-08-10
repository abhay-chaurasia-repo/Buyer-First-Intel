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
 * Bold white house, solid filled chimney, loupe with a tight 2×2 window grid.
 * House baseline meets the loupe rim with no stray overhang.
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  // Geometry kept explicit so the floor meets the loupe rim cleanly.
  const loupeCx = 270
  const loupeCy = 302
  const loupeR = 88
  const stroke = 28
  const loupeOuter = loupeR + stroke / 2
  // Horizontal floor — ends at the left outer rim of the loupe (no overhang into the lens)
  const floorY = 386
  const floorDy = floorY - loupeCy
  const floorEndX = loupeCx - Math.sqrt(loupeOuter * loupeOuter - floorDy * floorDy)

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
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Gable roof with slight eaves */}
        <path d="M84 250 L256 128 L428 250" />
        {/* Left wall + floor — baseline stops exactly at the loupe outer rim */}
        <path d={`M120 250 V${floorY} H${floorEndX.toFixed(1)}`} />
        {/* Short right wall under the right eave, meeting the loupe */}
        <path d="M392 250 V272" />
      </g>

      {/* Solid filled-white rectangular chimney on the right roof slope */}
      <rect x="336" y="122" width="30" height="56" rx="4" fill="#FFFFFF" />

      {/* Bold loupe ring — saffron fill clears any covered house strokes */}
      <circle
        cx={loupeCx}
        cy={loupeCy}
        r={loupeR}
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth={stroke}
      />

      {/* Tight 2×2 solid white window grid */}
      <g fill="#FFFFFF">
        <rect x="249" y="281" width="18" height="18" rx="2.5" />
        <rect x="273" y="281" width="18" height="18" rx="2.5" />
        <rect x="249" y="305" width="18" height="18" rx="2.5" />
        <rect x="273" y="305" width="18" height="18" rx="2.5" />
      </g>

      {/* Thick solid handle — diagonal to bottom-right */}
      <line
        x1={loupeCx + loupeR * 0.72}
        y1={loupeCy + loupeR * 0.72}
        x2={loupeCx + loupeR * 0.72 + 78}
        y2={loupeCy + loupeR * 0.72 + 78}
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
