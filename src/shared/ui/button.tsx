import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'default' | 'compact' | 'sm' | 'icon'
}

/**
 * Shared Button Component
 * Source of truth: documents/DESIGN.MD §8
 *
 * Primary: Ink fill, on-ink text.
 * Secondary: Border, ink text, surface bg.
 * Ghost: Ink text, hover surface-sunken.
 * Danger: Danger fill, on-ink text.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', type = 'button', disabled, children, ...props }, ref) => {
    const variantStyles = {
      primary:
        'bg-ink text-on-ink hover:opacity-90 active:opacity-95 shadow-sm',
      secondary:
        'bg-surface border border-border text-ink hover:bg-surface-sunken',
      outline:
        'bg-transparent border border-border text-ink hover:bg-surface-sunken',
      ghost:
        'bg-transparent text-ink hover:bg-surface-sunken',
      danger:
        'bg-danger text-white hover:opacity-90 active:opacity-95 shadow-sm',
    }

    const sizeStyles = {
      default: 'h-10 px-4 py-2 text-body',
      compact: 'h-9 px-3 text-small',
      sm: 'h-8 px-2.5 text-meta',
      icon: 'h-10 w-10 p-0 justify-center',
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-sm',
          'transition-all duration-150 ease-out active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
