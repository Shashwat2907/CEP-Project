'use client'

import * as React from 'react'
import {
  MapPin,
  Wifi,
  Search,
  Shield,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { AdminCampusBoundary } from '@/features/presence/components/admin-campus-boundary'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { AppShell } from '@/shared/ui/app-shell'
import { addCampusIpRange, adminLookupUserPresence } from '@/features/presence/actions'
import { PresenceSession } from '@/features/presence/schema'

function AdminZonesContent() {
  // IP Range State
  const [ipRanges, setIpRanges] = React.useState<Array<{ id: string; cidr: string; label: string }>>([
    { id: '1', cidr: '127.0.0.0/8', label: 'Localhost Developer Range' },
    { id: '2', cidr: '172.16.0.0/16', label: 'Campus Wi-Fi AP Pool' },
  ])
  const [newCidr, setNewCidr] = React.useState('')
  const [newLabel, setNewLabel] = React.useState('')
  const [ipSuccess, setIpSuccess] = React.useState<string | null>(null)

  // Audit Lookup State
  const [targetUserId, setTargetUserId] = React.useState('')
  const [auditReason, setAuditReason] = React.useState('')
  const [lookupError, setLookupError] = React.useState<string | null>(null)
  const [lookupResult, setLookupResult] = React.useState<{
    sessions: PresenceSession[]
  } | null>(null)
  const [isLookingUp, setIsLookingUp] = React.useState(false)

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCidr.trim() || !newLabel.trim()) return

    const res = await addCampusIpRange({ cidr: newCidr.trim(), label: newLabel.trim() })
    if (res.ok) {
      setIpRanges((prev) => [...prev, res.data])
      setNewCidr('')
      setNewLabel('')
      setIpSuccess('IP CIDR range added successfully.')
      setTimeout(() => setIpSuccess(null), 3000)
    }
  }

  const handleAuditLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError(null)
    setLookupResult(null)

    if (!auditReason.trim()) {
      setLookupError('Stated justification reason is mandatory for auditing individual student presence.')
      return
    }

    setIsLookingUp(true)
    try {
      const res = await adminLookupUserPresence({
        targetUserId: targetUserId.trim() || 'default-user',
        reason: auditReason.trim(),
      })
      if (res.ok) {
        setLookupResult({ sessions: res.data.sessions })
      } else {
        setLookupError(res.error.message)
      }
    } catch {
      setLookupError('Lookup failed')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <div className="w-full py-2 space-y-10">
      <div>
        <h1 className="font-display text-h1 font-bold text-ink">Campus Zones & Boundaries</h1>
        <p className="text-small text-ink-muted mt-1">
          Define geofence boundaries, configure trusted campus Wi-Fi IP ranges, and audit presence access.
        </p>
      </div>

      {/* 1. Geofence Boundary Map & Polygon Editor */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <MapPin size={18} strokeWidth={1.75} className="text-ink" />
          <h2 className="font-display text-h3 font-bold text-ink">Campus Geofence Polygon</h2>
        </div>
        <AdminCampusBoundary />
      </section>

      {/* 2. Campus IP Ranges */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Wifi size={18} strokeWidth={1.75} className="text-ink" />
          <h2 className="font-display text-h3 font-bold text-ink">Campus Network IP Ranges</h2>
        </div>
        <p className="text-small text-ink-muted">
          Requests from these IP ranges automatically upgrade presence confidence to <strong>high</strong>.
        </p>

        <form onSubmit={handleAddIp} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-md bg-surface-sunken border border-border">
          <Input
            placeholder="CIDR (e.g. 10.20.0.0/16)"
            value={newCidr}
            onChange={(e) => setNewCidr(e.target.value)}
            className="font-mono text-small"
          />
          <Input
            placeholder="Label (e.g. Library Subnet)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="text-small"
          />
          <Button type="submit" variant="primary" size="sm" className="flex items-center justify-center gap-1.5">
            <Plus size={16} />
            <span>Add CIDR Range</span>
          </Button>
        </form>

        {ipSuccess && (
          <div className="p-3 rounded-md bg-in-campus/10 text-in-campus border border-in-campus/20 text-small flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{ipSuccess}</span>
          </div>
        )}

        <div className="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
          {ipRanges.map((ip) => (
            <div key={ip.id} className="p-3.5 flex items-center justify-between text-small">
              <div>
                <span className="font-mono font-bold text-ink mr-3">{ip.cidr}</span>
                <span className="text-ink-muted">{ip.label}</span>
              </div>
              <span className="font-mono text-meta text-in-campus px-2 py-0.5 rounded-sm bg-in-campus/10 border border-in-campus/20">
                ACTIVE
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Audited Individual Presence Lookup */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Shield size={18} strokeWidth={1.75} className="text-ink" />
          <h2 className="font-display text-h3 font-bold text-ink">Audited Student Presence Lookup</h2>
        </div>
        <p className="text-small text-ink-muted">
          Per privacy regulations (DPDP Act), looking up an individual student requires a mandatory reason, permanently logged in the audit trail.
        </p>

        <form onSubmit={handleAuditLookup} className="space-y-3 p-5 rounded-md bg-surface-sunken border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-meta font-mono font-medium text-ink block mb-1">
                Student User ID / Roll Number
              </label>
              <Input
                placeholder="e.g. 23BCE1042"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="font-mono text-small"
              />
            </div>

            <div>
              <label className="text-meta font-mono font-medium text-ink block mb-1">
                Stated Justification Reason (Required for Audit Log)
              </label>
              <Input
                placeholder="e.g. Emergency safety check authorized by Warden"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                className="text-small"
              />
            </div>
          </div>

          {lookupError && (
            <div className="p-3 rounded-md bg-danger/10 text-danger border border-danger/20 text-small flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{lookupError}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="sm" disabled={isLookingUp} className="flex items-center gap-2">
            <Search size={15} />
            <span>{isLookingUp ? 'Verifying & Auditing...' : 'Perform Audited Lookup'}</span>
          </Button>
        </form>

        {lookupResult && (
          <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
            <p className="text-small font-bold text-ink">Audit Logged Successfully • Recent Sessions:</p>
            {lookupResult.sessions.length === 0 ? (
              <p className="text-meta text-ink-muted">No recent sessions found for this user.</p>
            ) : (
              <ul className="text-small font-mono space-y-1">
                {lookupResult.sessions.map((s) => (
                  <li key={s.id} className="text-ink-muted">
                    {s.startedAt} — {s.endedAt ?? 'Ongoing'} ({s.durationMinutes ? `${Math.round(s.durationMinutes)}m` : 'Active'})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default function AdminZonesPage() {
  return (
    <AppShell
      initialRole="admin"
      userName="Admin User"
      identifier="A-001"
      department="Campus Administration"
      userEmail="admin@college.edu"
      activePath="/admin/zones"
    >
      <AdminZonesContent />
    </AppShell>
  )
}

