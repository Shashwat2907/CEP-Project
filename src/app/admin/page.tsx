'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Shield,
  ShieldAlert,
  Users,
  MapPin,
  FileText,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Server,
  Activity,
} from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'

export default function AdminOverviewPage() {
  return (
    <AppShell
      initialRole="admin"
      userName="Campus Administrator"
      identifier="ADM-001"
      department="Campus Governance & Security"
      userEmail="admin@campus.edu"
      activePath="/admin"
    >
      <main className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb / Return to Homepage */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Return to Homepage</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-ink-muted">Administrator Control Center</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin Access Active</span>
            </span>
          </div>
        </div>

        {/* Hero */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-ink flex items-center gap-2.5">
            <span>Admin Governance Console</span>
          </h1>
          <p className="text-xs md:text-sm text-ink-muted mt-1 max-w-2xl">
            Campus-wide roster sync, cryptographic digital IDs, perimeter geofencing zones, and security audit trails.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-surface">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Active Students
            </span>
            <span className="text-2xl font-bold text-ink font-display mt-1 block">1,248</span>
            <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Synced with roster</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Faculty Staff
            </span>
            <span className="text-2xl font-bold text-ink font-display mt-1 block">84</span>
            <span className="text-[10px] text-indigo-600 font-medium mt-0.5 block">Department moderators</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Active Geofences
            </span>
            <span className="text-2xl font-bold text-ink font-display mt-1 block">6 Zones</span>
            <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">Campus perimeter bound</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              System Health
            </span>
            <span className="text-2xl font-bold text-emerald-600 font-display mt-1 block">99.9%</span>
            <span className="text-[10px] text-ink-muted font-medium mt-0.5 block">Zero escalated incidents</span>
          </div>
        </div>

        {/* Primary Management Hubs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/digital-id"
            className="p-5 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold mb-3">
                <ShieldAlert size={20} />
              </div>
              <h2 className="font-bold text-base text-ink group-hover:text-primary transition-colors font-display">
                Digital ID & Access Control
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Issue and revoke verifiable campus student and staff ID cards with dynamic cryptographic QR tokens.
              </p>
            </div>
            <span className="text-xs text-primary font-semibold mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Manage Digital IDs →
            </span>
          </Link>

          <Link
            href="/admin/roster"
            className="p-5 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold mb-3">
                <Users size={20} />
              </div>
              <h2 className="font-bold text-base text-ink group-hover:text-primary transition-colors font-display">
                Roster Import & Sync
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Upload CSV roster sheets to provision campus accounts, assign divisions and batches, and auto-populate academic cohorts.
              </p>
            </div>
            <span className="text-xs text-primary font-semibold mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Import Roster →
            </span>
          </Link>

          <Link
            href="/admin/zones"
            className="p-5 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold mb-3">
                <MapPin size={20} />
              </div>
              <h2 className="font-bold text-base text-ink group-hover:text-primary transition-colors font-display">
                Campus Geofence Zones
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Define and update high-precision GPS polygons for automated IN/OUT campus presence detection.
              </p>
            </div>
            <span className="text-xs text-primary font-semibold mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Configure Zones →
            </span>
          </Link>

          <Link
            href="/admin/organizers"
            className="p-5 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold mb-3">
                <UserCheck size={20} />
              </div>
              <h2 className="font-bold text-base text-ink group-hover:text-primary transition-colors font-display">
                Organizer Privileges
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Grant or revoke event ticketing and QR scanner permissions to student council members and event volunteers.
              </p>
            </div>
            <span className="text-xs text-primary font-semibold mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Manage Organizers →
            </span>
          </Link>
        </div>
      </main>
    </AppShell>
  )
}
