import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

/** Terracotta / warm brown from the attached logo reference */
export const APP_ICON_SAFFRON = '#C88A58'

type AppIconProps = {
  className?: string
  size?: number
  title?: string
  testId?: string
}

/**
 * Due Diligence app icon — matches the attached reference:
 * terracotta squircle, white house, nested loupe (~½ house width),
 * 4-pane window, uniform stroke weight.
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  // Uniform stroke — house, circle, and handle match the reference
  const stroke = 28
  // Loupe nested inside the house; diameter ~ half house width
  const loupeCx = 268
  const loupeCy = 300
  const loupeR = 78
  const loupeOuter = loupeR + stroke / 2
  const floorY = 378
  const floorDy = floorY - loupeCy
  const floorEndX =
    loupeCx - Math.sqrt(Math.max(loupeOuter * loupeOuter - floorDy * floorDy, 1))

  const handleStart = loupeR + stroke * 0.2
  const handleLen = 76
  const h0x = loupeCx + handleStart * Math.SQRT1_2
  const h0y = loupeCy + handleStart * Math.SQRT1_2
  const h1x = h0x + handleLen * Math.SQRT1_2
  const h1y = h0y + handleLen * Math.SQRT1_2

  // Window with clear margin inside the lens
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
      style={{ width: size, height: size }}
      data-testid={testId}
    >
      <title id={titleId}>{title}</title>
      <rect width="512" height="512" rx="114" ry="114" fill={APP_ICON_SAFFRON} />

      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Pitched roof with eaves — right tip near loupe */}
        <path d="M100 250 L256 138 L412 250" />
        {/* Left wall + floor meeting loupe rim */}
        <path d={`M132 250 V${floorY} H${floorEndX.toFixed(1)}`} />
        {/* Short right wall under eave, near circle */}
        <path d="M380 250 V274" />
      </g>

      {/* Solid rectangular chimney on right roof slope */}
      <rect x="332" y="130" width="26" height="48" rx="3" fill="#FFFFFF" />

      <circle
        cx={loupeCx}
        cy={loupeCy}
        r={loupeR}
        fill={APP_ICON_SAFFRON}
        stroke="#FFFFFF"
        strokeWidth={stroke}
      />

      <g fill="#FFFFFF">
        <rect x={gx} y={gy} width={pane} height={pane} rx="2.5" />
        <rect x={gx + pane + gap} y={gy} width={pane} height={pane} rx="2.5" />
        <rect x={gx} y={gy + pane + gap} width={pane} height={pane} rx="2.5" />
        <rect
          x={gx + pane + gap}
          y={gy + pane + gap}
          width={pane}
          height={pane}
          rx="2.5"
        />
      </g>

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
