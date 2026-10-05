'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileText, ArrowLeft, Shield, Search, Filter } from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'

export default function AdminAuditPage() {
  const auditEntries = [
    {
      id: 'aud-001',
      actor: 'Campus Administrator (admin@campus.edu)',
      action: 'roster.bulk_import',
      details: 'Imported CSV roster batch with 1,248 student records.',
      timestamp: '2026-10-04 15:30:12 UTC',
      status: 'success',
    },
    {
      id: 'aud-002',
      actor: 'Prof. Rajesh Sharma (sharma@campus.edu)',
      action: 'acad.approve_resource',
      details: 'Approved lecture slides: CS201 Unit 3 Trees & Graphs.',
      timestamp: '2026-10-04 16:10:45 UTC',
      status: 'success',
    },
    {
      id: 'aud-003',
      actor: 'System Automation',
      action: 'geofence.boundary_refresh',
      details: 'Synchronized campus perimeter coordinates for Main Campus Polygon.',
      timestamp: '2026-10-04 17:00:00 UTC',
      status: 'success',
    },
    {
      id: 'aud-004',
      actor: 'Campus Administrator (admin@campus.edu)',
      action: 'digital_id.status_active',
      details: 'Renewed cryptographic signature for 23BCE1001 (Aarav Mehta).',
      timestamp: '2026-10-04 17:25:30 UTC',
      status: 'success',
    },
  ]

  return (
    <AppShell
      initialRole="admin"
      userName="Campus Administrator"
      identifier="ADM-001"
      department="Campus Governance & Security"
      userEmail="admin@campus.edu"
      activePath="/admin/audit"
    >
      <main className="max-w-6xl mx-auto space-y-6">
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
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <span>Admin Console</span>
            </Link>
          </div>

          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Immutable Audit Trail
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold font-display text-ink flex items-center gap-2">
            <FileText size={22} className="text-primary" />
            <span>Security & Administrative Audit Logs</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Tamper-evident record of administrative changes, roster operations, and moderation actions.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-surface-elevated flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Shield size={14} className="text-primary" />
              <span>System Events ({auditEntries.length})</span>
            </div>
            <span className="text-[11px] text-ink-muted">Encrypted SHA-256 Hashes</span>
          </div>

          <div className="divide-y divide-border">
            {auditEntries.map((log) => (
              <div key={log.id} className="p-4 hover:bg-surface-sunken/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      {log.action}
                    </span>
                    <span className="text-xs text-ink font-medium">{log.actor}</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">{log.details}</p>
                </div>
                <div className="text-[11px] text-ink-muted font-mono whitespace-nowrap shrink-0">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  )
}
