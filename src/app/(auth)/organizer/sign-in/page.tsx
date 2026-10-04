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
    <div className="min-h-screen bg-[var(--surface-ground)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-600 border border-purple-500/20 mb-3 shadow-xs">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          External Organizer Portal
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
          For external companies, hackathon organizers, and other colleges hosting campus events
        </p>

        {/* Notice for campus members */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
          <p>
            Are you a student or faculty member?{' '}
            <Link href="/sign-in" className="font-bold underline hover:opacity-80">
              Use Campus Member Sign-In
            </Link>
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[var(--surface-paper)] py-8 px-6 sm:px-10 rounded-2xl border border-[var(--border-subtle)] shadow-xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Organization / Entity Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. OpenSource India Foundation or DevHacks Inc."
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Organization Type *
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as OrganizerType)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                  >
                    <option value="company">Corporate / Enterprise</option>
                    <option value="community">Developer Community</option>
                    <option value="college">Other College / University</option>
                    <option value="club">External Club / Foundation</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Contact Person Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Seth"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Contact Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="contact@yourcompany.org"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Must be your company or personal email. College roster emails are rejected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Official Website (Optional)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Purpose / What you want to host *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline the nature of events you plan to host (e.g. hackathons, tech workshops, coding challenges)..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Sending Code...' : 'Request Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Check your inbox</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  We sent a 6-digit code to <span className="font-semibold">{contactEmail}</span>
                </p>
                <p className="text-[11px] text-purple-600 font-mono">Demo OTP: 123456</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 text-center">
                  6-Digit One-Time Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-48 mx-auto block text-center text-lg tracking-widest font-mono py-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Registration Submitted
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
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
