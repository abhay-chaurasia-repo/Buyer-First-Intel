import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  /** Pixel box size — image fills the rounded saffron mark */
  size?: number
  alt?: string
  testId?: string
}

/**
 * App mark: house + magnifier on saffron tile (logo-only, no wordmark).
 * Matches the flat header mock (open house + loupe with 2×2 window).
 */
export function BrandLogo({
  className,
  size = 36,
  alt = 'Due Diligence',
  testId = 'brand-logo',
}: BrandLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-[22%] object-cover', className)}
      style={{ width: size, height: size }}
      data-testid={testId}
      decoding="async"
    />
  )
}
