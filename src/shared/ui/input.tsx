import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

/**
 * Shared Input Component
 * Source of truth: documents/DESIGN.MD §8
 *
 * Background: --surface-sunken
 * Border: 1px --border
 * Radius: r-sm (6px)
 * Height: 40px
 * Focus ring: 2px --ink offset 2px
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full rounded-sm border bg-surface-sunken px-3 py-2 text-body text-ink',
          'placeholder:text-ink-muted transition-colors duration-150',
          'border-border focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
          error && 'border-danger focus-visible:outline-danger',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
