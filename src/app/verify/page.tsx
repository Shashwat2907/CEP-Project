import { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { VerifierDesk } from '@/features/digital-id/components/verifier-desk'

export const metadata: Metadata = {
  title: 'Digital ID Verifier | Campus Super-App',
  description: 'Official clearance verification portal for campus guards, library, examination halls, and laboratories.',
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function VerifyPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const rawToken = resolvedParams.token
  const initialToken = typeof rawToken === 'string' ? rawToken : Array.isArray(rawToken) ? rawToken[0] : undefined

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Verifier Top Navigation Bar */}
      <header className="border-b border-border bg-surface sticky top-0 z-20">
        <div className="w-full max-w-[1200px] px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-sm hover:bg-surface-sunken text-ink-muted hover:text-ink transition-colors"
              title="Return to Campus Portal"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-ink text-on-ink flex items-center justify-center font-display font-black text-sm">
                C
              </div>
              <div>
                <span className="font-display font-bold text-ink text-small tracking-tight">
                  Campus ID Verifier
                </span>
                <span className="hidden sm:inline text-[11px] font-mono text-ink-muted ml-2">
                  Official Verification Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-meta font-mono px-2 py-0.5 rounded-sm bg-surface-sunken border border-border text-ink-muted">
              <ShieldCheck size={14} className="text-in-campus" />
              <span>HMAC Signed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Verification Workspace */}
      <main className="flex-1 w-full max-w-[1200px] px-4 md:px-6 py-6">
        <VerifierDesk initialToken={initialToken} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-[11px] font-mono text-ink-muted bg-surface/50">
        <div className="w-full max-w-[1200px] px-4 md:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>Campus Security & Identity Verification Subsystem</span>
          <span>Tokens rotate every 30 seconds, anti-screenshot enforced</span>
        </div>
      </footer>
    </div>
  )
}
