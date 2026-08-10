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
 * Diffs vs prior mark: loupe sits further inside the house; handle is thicker.
 */
export function AppIcon({
  className,
  size = 36,
  title = APP_NAME,
  testId = 'app-icon',
}: AppIconProps) {
  const titleId = `${testId}-title`

  const stroke = 30
  // Attached reference: handle is noticeably thicker than house/circle strokes
  const handleStroke = 42
  // Pull loupe a bit further inside the house (left + slightly up)
  const loupeCx = 258
  const loupeCy = 296
  const loupeR = 82
  const loupeOuter = loupeR + stroke / 2
  const floorY = 380
  const floorDy = floorY - loupeCy
  const floorEndX =
    loupeCx - Math.sqrt(Math.max(loupeOuter * loupeOuter - floorDy * floorDy, 1))

  const handleStart = loupeR + stroke * 0.18
  const handleLen = 70
  const h0x = loupeCx + handleStart * Math.SQRT1_2
  const h0y = loupeCy + handleStart * Math.SQRT1_2
  const h1x = h0x + handleLen * Math.SQRT1_2
  const h1y = h0y + handleLen * Math.SQRT1_2

  const pane = 17
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
        <path d="M384 248 V270" />
      </g>

      {/* Solid filled chimney */}
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
        strokeWidth={handleStroke}
        strokeLinecap="round"
      />
    </svg>
  )
}
