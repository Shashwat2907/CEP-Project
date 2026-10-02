import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Shared Empty State Component
 * Source of truth: documents/DESIGN.MD §2, §8 and AGENTS.MD §3
 *
 * Structure: Icon slot, clear title, one-line explanation, single verb button action.
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center p-8 rounded-md border border-dashed border-border bg-surface/50 text-ink max-w-md mx-auto',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted mb-4 border border-border">
            {icon}
          </div>
        )}
        <h3 className="font-display text-h3 font-semibold text-ink">{title}</h3>
        {description && (
          <p className="text-small text-ink-muted mt-1 max-w-xs">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    )
  }
)
EmptyState.displayName = 'EmptyState'
