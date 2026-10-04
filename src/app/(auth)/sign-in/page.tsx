'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/ui'
import { requestCodeAction, verifyCodeAction, quickSwitchRoleAction } from '@/features/identity/actions'
import { Mail, KeyRound, ArrowLeft, AlertCircle } from 'lucide-react'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [step, setStep] = React.useState<'email' | 'code'>('email')
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    urlError === 'inactive'
      ? 'Your account has been marked inactive by the college administration.'
      : null
  )

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid college email.')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const res = await requestCodeAction({ email })
      if (res.success) {
        setInfoMessage(res.message || 'We sent a 6-digit code to your email.')
        setStep('code')
      } else {
        setErrorMessage(res.error || 'Failed to send verification code.')
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.length !== 6) {
      setErrorMessage('Verification code must be exactly 6 digits.')
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await verifyCodeAction({ email, code })
      if (res.success) {
        router.push('/')
        router.refresh()
      } else {
        setErrorMessage(res.error || 'Invalid verification code.')
      }
    } catch {
      setErrorMessage('Failed to verify code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* App Title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-h1 font-bold text-ink">Campus App</h1>
          <p className="text-ink-muted text-small mt-1">
            One platform for students, faculty, and administration
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {step === 'email' ? 'Sign in' : 'Enter 6-digit code'}
              </CardTitle>
              {step === 'code' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setCode('')
                    setErrorMessage(null)
                  }}
                  className="inline-flex items-center text-meta text-ink-muted hover:text-ink gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Change email
                </button>
              )}
            </div>
            <CardDescription>
              {step === 'email'
                ? 'Enter your registered college email to receive a sign-in code.'
                : `We sent a code to ${email}. Valid for 10 minutes.`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 p-3 rounded-sm border border-danger/30 bg-danger/5 text-danger text-small"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Info message */}
            {infoMessage && step === 'code' && (
              <div
                role="status"
                className="mb-4 p-3 rounded-sm border border-border bg-surface-sunken text-ink text-small"
              >
                {infoMessage}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-meta font-medium text-ink"
                  >
                    College email
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="student@campus.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full"
                >
                  {loading ? 'Sending code...' : 'Send verification code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="code"
                    className="block text-meta font-medium text-ink"
                  >
                    6-digit code
                  </label>
                  <div className="relative">
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="123456"
                      className="font-mono text-center tracking-widest text-h3"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                    />
                    <KeyRound className="absolute right-3 top-3 h-4 w-4 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Verifying...' : 'Sign in'}
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestCode}
                    className="text-small text-ink-muted hover:text-ink underline"
                  >
                    Didn&apos;t receive code? Resend
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-meta font-semibold text-ink-muted uppercase tracking-wider mb-2 text-center">
                Demo Accounts (1-Click Switch)
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    const res = await quickSwitchRoleAction('sharma@campus.edu')
                    if (res.success) {
                      window.location.href = '/teacher/acad'
                    } else {
                      setLoading(false)
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-sm border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-ink transition-colors flex items-center justify-between font-medium cursor-pointer"
                >
                  <span>👨‍🏫 <strong>Teacher:</strong> Prof. Rajesh Sharma (CS)</span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-mono">sharma@campus.edu</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    const res = await quickSwitchRoleAction('student@campus.edu')
                    if (res.success) {
                      window.location.href = '/'
                    } else {
                      setLoading(false)
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-sm border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-ink transition-colors flex items-center justify-between font-medium cursor-pointer"
                >
                  <span>🎓 <strong>Student:</strong> Aarav Mehta (23BCE1001)</span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">student@campus.edu</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true)
                    const res = await quickSwitchRoleAction('admin@campus.edu')
                    if (res.success) {
                      window.location.href = '/'
                    } else {
                      setLoading(false)
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-sm border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-ink transition-colors flex items-center justify-between font-medium cursor-pointer"
                >
                  <span>🛡️ <strong>Admin:</strong> Campus Administrator</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">admin@campus.edu</span>
                </button>
              </div>

              <p className="text-meta text-ink-muted text-center mt-3">
                No password required. Access is tied to your college mailbox.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SignInForm />
    </React.Suspense>
  )
}
