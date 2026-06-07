import { brand } from '@/lib/brand'

interface BrandLogoProps {
  variant?: 'light' | 'dark'
  className?: string
  /** Height in px, width scales proportionally */
  height?: number
}

/**
 * Renders the correct logo variant based on context.
 * - variant="light"  → transparent logo (use on white/light backgrounds)
 * - variant="dark"   → white-bg logo (use on dark/colored backgrounds)
 */
export function BrandLogo({ variant = 'light', className = '', height = 40 }: BrandLogoProps) {
  const src =
    variant === 'dark' && brand.assets.logoDarkUrl
      ? brand.assets.logoDarkUrl
      : brand.assets.logoUrl

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={brand.assets.logoAlt}
      style={{ height, width: 'auto' }}
      className={className}
    />
  )
}
