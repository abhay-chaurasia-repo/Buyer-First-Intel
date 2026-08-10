import { APP_NAME } from '@/data/brand'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  /** Pixel box size for the saffron app mark */
  size?: number
  alt?: string
  testId?: string
}

/**
 * App mark from the attached reference: house + magnifier on saffron tile.
 */
export function BrandLogo({
  className,
  size = 36,
  alt = APP_NAME,
  testId = 'brand-logo',
}: BrandLogoProps) {
  return (
    <img
      src="/logo.png?v=exact"
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
