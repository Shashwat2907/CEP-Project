import { Metadata } from 'next'
import Link from 'next/link'
import {
  Shield,
  Users,
  ShieldAlert,
  MapPin,
  FileText,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'
import { Button } from '@/shared/ui/button'

export const metadata: Metadata = {
  title: 'Admin Overview | Campus Super-App',
  description: 'Campus administration, roster health, zone tracking, and digital access control.',
}

export default function AdminOverviewPage() {
  return (
    <AppShell
      initialRole="admin"
      userName="Campus Administrator"
      identifier="ADM001"
      department="Central Administration"
      userEmail="admin@campus.edu"
      activePath="/admin"
    >
      <div className="max-w-[1200px] space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-ink text-on-ink font-semibold">
              Administrative control
            </span>
          </div>
          <h1 className="font-display text-display font-bold text-ink tracking-tight">
            Campus Administration & System Health
          </h1>
          <p className="text-small text-ink-muted mt-1 max-w-2xl">
            High-level operational overview across identity issuance, official roster synchronization, campus boundaries, and security audits.
          </p>
        </div>

        {/* Operational Health KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-md p-4 space-y-1">
            <span className="text-meta font-mono text-ink-muted flex items-center gap-1.5">
              <Users size={13} /> Active roster
            </span>
            <p className="font-display text-3xl font-bold text-ink">4,892</p>
            <span className="text-meta text-success font-medium flex items-center gap-1">
              <CheckCircle2 size={12} /> 100% matched to emails
            </span>
          </div>

          <div className="bg-surface border border-border rounded-md p-4 space-y-1">
            <span className="text-meta font-mono text-ink-muted flex items-center gap-1.5">
              <Activity size={13} /> On-campus now
            </span>
            <p className="font-display text-3xl font-bold text-in-campus">1,248</p>
            <span className="text-meta text-ink-muted">High-confidence heartbeats</span>
          </div>

          <div className="bg-surface border border-border rounded-md p-4 space-y-1">
            <span className="text-meta font-mono text-ink-muted flex items-center gap-1.5">
              <ShieldAlert size={13} /> Digital IDs active
            </span>
            <p className="font-display text-3xl font-bold text-ink">4,812</p>
            <span className="text-meta text-ink-muted">80 suspended or revoked</span>
          </div>

          <div className="bg-surface border border-border rounded-md p-4 space-y-1">
            <span className="text-meta font-mono text-ink-muted flex items-center gap-1.5">
              <AlertTriangle size={13} /> L3 escalations
            </span>
            <p className="font-display text-3xl font-bold text-danger">3</p>
            <span className="text-meta text-danger font-medium">Require Dean review</span>
          </div>
        </div>

        {/* Quick Management Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/digital-id"
            className="group p-5 bg-surface border border-border rounded-md hover:border-ink transition-colors flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-sm bg-surface-sunken flex items-center justify-center text-ink">
                  <ShieldAlert size={18} />
                </span>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="font-display text-h2 font-bold text-ink">
                Digital ID & Access Control
              </h2>
              <p className="text-small text-ink-muted leading-relaxed">
                Emergency token revocation, verification terminal access logs, and student credential suspension.
              </p>
            </div>
            <span className="text-meta font-mono text-ink font-semibold flex items-center gap-1">
              Manage credentials →
            </span>
          </Link>

          <Link
            href="/admin/roster"
            className="group p-5 bg-surface border border-border rounded-md hover:border-ink transition-colors flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-sm bg-surface-sunken flex items-center justify-center text-ink">
                  <Users size={18} />
                </span>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="font-display text-h2 font-bold text-ink">
                Roster CSV Import & Sync
              </h2>
              <p className="text-small text-ink-muted leading-relaxed">
                Upload student and teacher rosters with CSV schema validation, batch invitations, and deactivation sync.
              </p>
            </div>
            <span className="text-meta font-mono text-ink font-semibold flex items-center gap-1">
              Upload roster CSV →
            </span>
          </Link>

          <Link
            href="/admin/zones"
            className="group p-5 bg-surface border border-border rounded-md hover:border-ink transition-colors flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-sm bg-surface-sunken flex items-center justify-center text-ink">
                  <MapPin size={18} />
                </span>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="font-display text-h2 font-bold text-ink">
                Campus Polygon & Named Zones
              </h2>
              <p className="text-small text-ink-muted leading-relaxed">
                Draw geofenced boundaries for attendance presence, configure campus IP blocks, and set zone radii.
              </p>
            </div>
            <span className="text-meta font-mono text-ink font-semibold flex items-center gap-1">
              Configure geofences →
            </span>
          </Link>

          <Link
            href="/admin/audit"
            className="group p-5 bg-surface border border-border rounded-md hover:border-ink transition-colors flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-sm bg-surface-sunken flex items-center justify-center text-ink">
                  <FileText size={18} />
                </span>
                <ArrowRight size={16} className="text-ink-muted group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="font-display text-h2 font-bold text-ink">
                System Audit & Security Logs
              </h2>
              <p className="text-small text-ink-muted leading-relaxed">
                Immutable record of administrative actions, ID scans at security gates, roster changes, and role assignments.
              </p>
            </div>
            <span className="text-meta font-mono text-ink font-semibold flex items-center gap-1">
              View audit trails →
            </span>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
