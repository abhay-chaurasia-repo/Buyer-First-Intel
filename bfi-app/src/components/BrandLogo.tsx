import { AppIcon } from '@/components/AppIcon'
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
 * App mark: house + magnifier on saffron tile (logo-only, no wordmark).
 * Renders the high-fidelity inline SVG {@link AppIcon}.
 */
export function BrandLogo({
  className,
  size = 36,
  alt = APP_NAME,
  testId = 'brand-logo',
}: BrandLogoProps) {
  return (
    <AppIcon
      size={size}
      title={alt}
      testId={testId}
      className={cn(className)}
    />
  )
}
