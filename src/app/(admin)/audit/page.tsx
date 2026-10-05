'use client'

import * as React from 'react'
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  MapPin,
  Clock,
  ArrowDownUp,
} from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'
import { cn } from '@/lib/utils'

export interface AuditRecord {
  id: string
  timestamp: string
  actorName: string
  actorId: string
  action: string
  category: 'security' | 'roster' | 'presence' | 'complaints'
  target: string
  ipAddress: string
  reason?: string
}

const INITIAL_LOGS: AuditRecord[] = [
  {
    id: 'aud-001',
    timestamp: '2026-10-04 14:48:12',
    actorName: 'Gate 1 Verifier Station',
    actorId: 'VRF-MAIN-01',
    action: 'digital_id.verify_success',
    category: 'security',
    target: 'Student 23BCE1042 (Shashwat Choudhary)',
    ipAddress: '10.20.4.15',
    reason: 'Campus main perimeter physical entry scan',
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-04 14:15:00',
    actorName: 'Campus Cron Service',
    actorId: 'SYS-CRON-SLA',
    action: 'complaint.escalate_l2',
    category: 'complaints',
    target: 'Complaint CMP-102 (Hostel Water TDS)',
    ipAddress: '127.0.0.1',
    reason: 'SLA 48h exceeded without resolution; escalated to L3 Dean',
  },
  {
    id: 'aud-003',
    timestamp: '2026-10-04 12:30:24',
    actorName: 'Campus Administrator',
    actorId: 'ADM001',
    action: 'roster.bulk_import',
    category: 'roster',
    target: 'Batch 2026 Fall Roster (142 rows processed)',
    ipAddress: '10.20.1.100',
    reason: 'New semester matriculation sync',
  },
  {
    id: 'aud-004',
    timestamp: '2026-10-04 09:12:45',
    actorName: 'Security Desk B',
    actorId: 'DESK-SEC-B',
    action: 'lost_found.pickup_confirmed',
    category: 'security',
    target: 'Item LF-401 (Keys with Batman Keychain)',
    ipAddress: '10.20.8.22',
    reason: 'Verified claimant digital ID matches enrollment record',
  },
  {
    id: 'aud-005',
    timestamp: '2026-10-03 18:20:10',
    actorName: 'Campus Administrator',
    actorId: 'ADM001',
    action: 'organizer.approve',
    category: 'security',
    target: 'Robotics League International',
    ipAddress: '10.20.1.100',
    reason: 'External hackathon sponsorship credentials validated',
  },
]

export default function AdminAuditPage() {
  const [logs, setLogs] = React.useState<AuditRecord[]>(INITIAL_LOGS)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          log.action.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q) ||
          log.ipAddress.includes(q)
        )
      }
      return true
    })
  }, [logs, categoryFilter, searchQuery])

  return (
    <AppShell
      initialRole="admin"
      userName="Campus Administrator"
      identifier="ADM001"
      department="Central Administration"
      userEmail="admin@campus.edu"
      activePath="/admin/audit"
    >
      <div className="max-w-[1200px] space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-ink text-on-ink font-semibold">
              Audit log
            </span>
          </div>
          <h1 className="font-display text-display font-bold text-ink tracking-tight">
            Security & Administrative Audit Trail
          </h1>
          <p className="text-small text-ink-muted mt-1 max-w-2xl">
            Append-only forensic log of all ID token verifications, roster modifications, geofence updates, and authority handovers.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search audit trail by action, actor, target, or IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-sm pl-9 pr-3 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-mono"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface border border-border rounded-sm px-3 py-2 text-small text-ink font-mono"
          >
            <option value="all">All Categories</option>
            <option value="security">Security & ID Scans</option>
            <option value="complaints">Complaints & Escalation</option>
            <option value="roster">Roster & Permissions</option>
          </select>
        </div>

        {/* Audit Table */}
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[12px] font-mono text-ink-muted">
                  <th className="py-2.5 px-4 font-semibold">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4 font-semibold">Action</th>
                  <th className="py-2.5 px-4 font-semibold">Actor</th>
                  <th className="py-2.5 px-4 font-semibold">Target & reason</th>
                  <th className="py-2.5 px-4 font-semibold">IP address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-small font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="py-3 px-4 text-ink-muted text-meta whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-ink bg-surface-sunken px-1.5 py-0.5 rounded-xs border border-border">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink">
                      <span className="font-semibold block">{log.actorName}</span>
                      <span className="text-meta text-ink-muted">{log.actorId}</span>
                    </td>
                    <td className="py-3 px-4 text-ink max-w-md">
                      <span className="font-medium block">{log.target}</span>
                      {log.reason && (
                        <span className="text-meta text-ink-muted block mt-0.5">
                          {log.reason}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-ink-muted text-meta whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
