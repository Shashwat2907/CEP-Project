import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'sm' | 'default' | 'lg'
}

/**
 * Shared Avatar Component
 * Source of truth: documents/DESIGN.MD §5, §6
 *
 * Radius: r-full
 * Background: surface-sunken with 1px border
 */
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt = '', fallback = '?', size = 'default', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)

    const sizeStyles = {
      sm: 'h-8 w-8 text-meta',
      default: 'h-10 w-10 text-small',
      lg: 'h-14 w-14 text-body-strong',
    }

    const showImage = src && !imageError

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-sunken text-ink select-none font-medium',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="uppercase font-mono">{fallback.slice(0, 2)}</span>
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'
