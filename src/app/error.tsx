'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  React.useEffect(() => {
    // Log error to console / audit logger
    console.error('Unhandled app error caught by boundary:', error)
  }, [error])

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-border bg-surface rounded-md p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-danger/10 text-danger flex items-center justify-center shrink-0">
            <AlertCircle size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-h2 font-semibold text-ink">
              Something went wrong
            </h2>
            <p className="text-small text-ink-muted">
              An unexpected error occurred while rendering this page.
            </p>
          </div>
        </div>

        {error.message && (
          <div className="p-3 bg-surface-sunken border border-border rounded-sm font-mono text-meta text-danger overflow-x-auto">
            {error.message}
          </div>
        )}

        {error.digest && (
          <p className="text-[11px] font-mono text-ink-muted">
            Digest code: {error.digest}
          </p>
        )}

        <div className="pt-2 flex items-center gap-3">
          <Button variant="primary" onClick={() => reset()} className="flex items-center gap-2">
            <RefreshCw size={16} strokeWidth={1.75} />
            Try again
          </Button>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
