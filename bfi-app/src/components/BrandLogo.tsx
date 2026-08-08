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
 */
export function BrandLogo({
  className,
  size = 36,
  alt = 'Due Diligence',
  testId = 'brand-logo',
}: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={cn(
        'shrink-0 rounded-[22%] object-cover shadow-[0_6px_16px_rgb(232_145_58/0.35)]',
        className,
      )}
      style={{ width: size, height: size }}
      data-testid={testId}
      decoding="async"
    />
  )
}
