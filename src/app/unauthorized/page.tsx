'use client'

import * as React from 'react'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft, GraduationCap, Users, Shield } from 'lucide-react'
import { quickSwitchRoleAction } from '@/features/identity/actions'

export default function UnauthorizedPage() {
  const [switching, setSwitching] = React.useState(false)

  const handleRoleSwitch = async (role: 'student' | 'teacher' | 'admin') => {
    setSwitching(true)
    const email =
      role === 'teacher'
        ? 'sharma@campus.edu'
        : role === 'admin'
        ? 'admin@campus.edu'
        : 'student@campus.edu'

    if (typeof document !== 'undefined') {
      document.cookie = `dev_mock_user_email=${encodeURIComponent(email)}; path=/; max-age=604800; SameSite=Lax`
    }

    try {
      await quickSwitchRoleAction(email)
    } catch {
      // ignore
    }

    if (role === 'teacher') {
      window.location.href = '/teacher/acad'
    } else if (role === 'admin') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-sm p-6 md:p-8 space-y-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-danger/10 text-danger border border-danger/20 flex items-center justify-center">
          <ShieldAlert size={28} strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-danger font-semibold">
            403 — Access Restricted
          </span>
          <h1 className="text-2xl font-bold font-display text-ink tracking-tight">
            Restricted Campus Zone
          </h1>
          <p className="text-sm text-ink-muted">
            Your current account role does not have authorization to view this administrative or faculty portal.
          </p>
        </div>

        <div className="pt-2 border-t border-border space-y-3">
          <p className="text-xs font-mono uppercase text-ink-muted tracking-wider">
            Quick Switch Workspace Role (Local Dev)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={switching}
              onClick={() => handleRoleSwitch('student')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-sm border border-border bg-surface-sunken hover:border-ink transition-colors cursor-pointer text-xs"
            >
              <GraduationCap size={16} />
              <span>Student</span>
            </button>
            <button
              type="button"
              disabled={switching}
              onClick={() => handleRoleSwitch('teacher')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-sm border border-border bg-surface-sunken hover:border-ink transition-colors cursor-pointer text-xs"
            >
              <Users size={16} />
              <span>Faculty</span>
            </button>
            <button
              type="button"
              disabled={switching}
              onClick={() => handleRoleSwitch('admin')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-sm border border-border bg-surface-sunken hover:border-ink transition-colors cursor-pointer text-xs font-semibold text-danger"
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Student Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
