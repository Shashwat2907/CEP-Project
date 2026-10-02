import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-md bg-surface-sunken border border-border flex items-center justify-center text-ink-muted mb-4">
        <FileQuestion size={32} strokeWidth={1.75} />
      </div>
      <h1 className="font-display text-display font-bold text-ink">404 — Page Not Found</h1>
      <p className="text-body text-ink-muted mt-2 max-w-md">
        The campus page or resource you are looking for does not exist, has been moved, or requires higher access credentials.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="primary" className="flex items-center gap-2">
            <ArrowLeft size={16} strokeWidth={1.75} />
            Back to Campus Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
