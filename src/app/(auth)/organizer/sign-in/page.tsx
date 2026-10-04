'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Globe,
  Phone,
  User,
  Sparkles,
  Lock,
} from 'lucide-react'
import { registerOrganizerAction, verifyOrganizerOtpAction } from '@/features/organizer/actions'
import type { OrganizerType } from '@/features/organizer/schema'

export default function OrganizerSignInPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form Fields
  const [organization, setOrganization] = useState('')
  const [orgType, setOrgType] = useState<OrganizerType>('company')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [purpose, setPurpose] = useState('')

  // OTP field
  const [otpCode, setOtpCode] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      const res = await registerOrganizerAction({
        organization: organization.trim(),
        orgType,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        purpose: purpose.trim(),
      })

      if (res.ok) {
        setStep('otp')
      } else {
        setErrorMsg(res.error || 'Failed to submit registration')
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      const res = await verifyOrganizerOtpAction({
        email: contactEmail.trim().toLowerCase(),
        code: otpCode.trim(),
      })

      if (res.ok) {
        setStep('success')
        setTimeout(() => {
          router.push('/organizer/dashboard')
        }, 1500)
      } else {
        setErrorMsg(res.error || 'Invalid verification code')
      }
    } catch {
      setErrorMsg('Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm bg-surface-sunken text-ink border border-border mb-3">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="font-display text-h1 font-bold tracking-tight text-ink">
          External Organizer Portal
        </h1>
        <p className="text-small text-ink-muted mt-1.5 max-w-sm mx-auto">
          For external companies, hackathon organizers, and other colleges hosting campus events
        </p>

        {/* Notice for campus members */}
        <div className="mt-4 p-3 rounded-sm bg-warning/10 border border-warning/30 text-small text-ink text-left">
          <p>
            Are you a student or faculty member?{' '}
            <Link href="/sign-in" className="font-semibold underline hover:text-ink">
              Use Campus Member Sign-In
            </Link>
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-md border border-border shadow-[var(--shadow-float)] space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-sm bg-danger/10 border border-danger/30 text-small text-danger font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-small font-semibold text-ink">
                  Organization / Entity Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. OpenSource India Foundation or DevHacks Inc."
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full text-small pl-9 pr-3.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-small font-semibold text-ink">
                    Organization Type *
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as OrganizerType)}
                    className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                  >
                    <option value="company">Corporate / Enterprise</option>
                    <option value="community">Developer Community</option>
                    <option value="college">Other College / University</option>
                    <option value="club">External Club / Foundation</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-small font-semibold text-ink">
                    Contact Person Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Seth"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full text-small pl-9 pr-3.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-small font-semibold text-ink">
                  Contact Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="contact@yourcompany.org"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full text-small pl-9 pr-3.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                  />
                </div>
                <p className="text-meta text-ink-muted">
                  Must be your company or personal email. College roster emails are rejected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-small font-semibold text-ink">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-small pl-9 pr-3.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-small font-semibold text-ink">
                    Official Website (Optional)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full text-small pl-9 pr-3.5 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-small font-semibold text-ink">
                  Purpose / What you want to host *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline the nature of events you plan to host (e.g. hackathons, tech workshops, coding challenges)..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-small px-3 py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Sending Code...' : 'Request Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-sm bg-surface-sunken text-ink border border-border mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-display text-h3 font-bold text-ink">Check your inbox</h3>
                <p className="text-small text-ink-muted">
                  We sent a 6-digit code to <span className="font-semibold text-ink">{contactEmail}</span>
                </p>
                <p className="text-meta font-mono text-ink bg-surface-sunken border border-border px-2 py-0.5 rounded-sm inline-block">Demo OTP: 123456</p>
              </div>

              <div>
                <label className="block text-small font-semibold text-ink mb-1 text-center">
                  6-Digit One-Time Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-48 mx-auto block text-center text-lg tracking-widest font-mono py-2 rounded-sm bg-surface-sunken border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex-1 py-2 rounded-sm border border-border bg-surface text-small font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="flex-1 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-in-campus mx-auto" />
              <h3 className="font-display text-h2 font-bold text-ink">
                Registration Submitted
              </h3>
              <p className="text-small text-ink-muted max-w-sm mx-auto">
                Your organizer profile has been created and submitted to campus administration.
                Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
