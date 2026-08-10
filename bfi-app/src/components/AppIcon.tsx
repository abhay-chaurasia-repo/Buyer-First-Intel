import { cn } from '@/lib/utils'
import { APP_NAME } from '@/data/brand'

/** Warm orange from the attached app-icon reference */
export const APP_ICON_SAFFRON = '#E98A2F'

type AppIconProps = {
  className?: string
  size?: number
  title?: string
  testId?: string
}

/**
 * Due Diligence app icon — house + magnifier with 4-pane window on saffron squircle.
 * Loupe sits smaller and more inside the house; handle is thicker than the house stroke.
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  const stroke = 28
  const handleStroke = 38
  // Smaller loupe, pulled inward (more centered in the house)
  const loupeCx = 252
  const loupeCy = 292
  const loupeR = 70
  const loupeOuter = loupeR + stroke / 2
  // Keep floor intersecting the loupe rim (dy must stay < outer radius)
  const floorY = 368
  const floorDy = floorY - loupeCy
  const floorEndX =
    loupeCx - Math.sqrt(Math.max(loupeOuter * loupeOuter - floorDy * floorDy, 1))

  const handleStart = loupeR + stroke * 0.2
  const handleLen = 78
  const h0x = loupeCx + handleStart * Math.SQRT1_2
  const h0y = loupeCy + handleStart * Math.SQRT1_2
  const h1x = h0x + handleLen * Math.SQRT1_2
  const h1y = h0y + handleLen * Math.SQRT1_2

  // 2×2 window centered in the loupe
  const pane = 15
  const gap = 6
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
        <path d="M96 248 L256 136 L416 248" />
        <path d={`M128 248 V${floorY} H${floorEndX.toFixed(1)}`} />
        {/* Right wall stub under eave — stops above the inward loupe */}
        <path d="M384 248 V268" />
      </g>

      <rect x="334" y="128" width="28" height="52" rx="4" fill="#FFFFFF" />

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
        <rect x={gx + pane + gap} y={gy + pane + gap} width={pane} height={pane} rx="2.5" />
      </g>

      {/* Thicker handle to match the reference mark */}
      <line
        x1={h0x}
        y1={h0y}
        x2={h1x}
        y2={h1y}
        stroke="#FFFFFF"
        strokeWidth={handleStroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
