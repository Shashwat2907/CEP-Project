import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'ink'
    | 'ink-muted'
    | 'danger'
    | 'warning'
    | 'success'
    | 'in-campus'
    | 'out-campus'
    | 'highlight'
  size?: 'sm' | 'default'
  pill?: boolean
}

/**
 * Shared Chip / Status Badge Component
 * Source of truth: documents/DESIGN.MD §8, §9
 */
export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      pill = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-surface-sunken text-ink-muted border border-border',
      ink: 'bg-ink text-on-ink',
      'ink-muted': 'bg-surface-sunken text-ink-muted',
      danger: 'bg-danger text-white',
      warning: 'bg-warning text-white',
      success: 'bg-success text-white',
      'in-campus': 'bg-in-campus text-white',
      'out-campus': 'bg-out-campus text-white',
      highlight: 'bg-highlight text-ink font-semibold',
    }

    const sizeStyles = {
      sm: 'text-meta px-2 py-0.5',
      default: 'text-small px-2.5 py-1',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium leading-none whitespace-nowrap',
          pill ? 'rounded-full' : 'rounded-sm',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
Chip.displayName = 'Chip'
