'use client'

import React, { useState, useEffect } from 'react'
import { AppShell } from '@/shared/ui/app-shell'
import { cn } from '@/lib/utils'
import {
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  Search,
} from 'lucide-react'
import {
  adminGetOrganizersAction,
  adminUpdateOrganizerStatusAction,
} from '@/features/organizer/actions'
import type { OrganizerProfile, OrganizerStatus } from '@/features/organizer/schema'

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([])
  const [filterStatus, setFilterStatus] = useState<OrganizerStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadData = async () => {
    try {
      const data = await adminGetOrganizersAction()
      setOrganizers(data)
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateStatus = async (
    userId: string,
    status: OrganizerStatus,
    trusted?: boolean
  ) => {
    setIsProcessing(true)
    setFeedback(null)
    try {
      const res = await adminUpdateOrganizerStatusAction(userId, status, trusted)
      if (res.ok) {
        setFeedback(`Organizer status updated to ${status}.`)
        loadData()
      } else {
        setFeedback(res.error || 'Failed to update status')
      }
    } catch {
      setFeedback('Error updating organizer status')
    } finally {
      setIsProcessing(false)
    }
  }

  const filtered = organizers.filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        o.organization.toLowerCase().includes(q) ||
        o.contactName.toLowerCase().includes(q) ||
        o.contactEmail.toLowerCase().includes(q) ||
        o.purpose.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <AppShell
      initialRole="admin"
      userName="College Administrator"
      identifier="ADMIN-001"
      department="Campus Administration & Security"
      userEmail="admin@college.edu"
      activePath="/organizers"
    >
      <div className="w-full max-w-[1200px] py-4 space-y-6">
        <div>
          <h1 className="font-display text-h1 font-bold text-ink flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-ink" />
            External Organizers Review Queue
          </h1>
          <p className="text-small text-ink-muted mt-1">
            Review partner organizations, grant event posting privileges, and manage trusted partner status.
          </p>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-sm bg-surface-sunken border border-border text-small text-ink font-medium">
            {feedback}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search organizations or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-small pl-9 pr-3.5 py-2 rounded-sm bg-surface border border-border text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 text-small">
            {(['all', 'pending', 'approved', 'suspended'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={cn(
                  'px-3 py-1.5 rounded-sm text-small font-medium capitalize transition-colors cursor-pointer',
                  filterStatus === st
                    ? 'bg-ink text-on-ink font-semibold'
                    : 'bg-surface text-ink-muted border border-border hover:text-ink hover:bg-surface-sunken'
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Organizer Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="p-12 text-center rounded-md border border-dashed border-border bg-surface text-small text-ink-muted">
              No organizer registrations found matching the criteria.
            </div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.userId}
                className="p-5 rounded-md border border-border bg-surface space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display text-base font-bold text-ink">
                        {o.organization}
                      </span>
                      <span className="px-2 py-0.5 rounded-sm text-meta font-mono uppercase bg-surface-sunken text-ink-muted border border-border">
                        {o.orgType}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-sm text-meta font-mono font-medium border',
                          o.status === 'approved'
                            ? 'bg-success/10 text-success border-success/30'
                            : o.status === 'suspended'
                            ? 'bg-danger/10 text-danger border-danger/30'
                            : 'bg-warning/10 text-warning border-warning/30'
                        )}
                      >
                        {o.status.toUpperCase()}
                      </span>
                      {o.trusted && (
                        <span className="px-2 py-0.5 rounded-sm text-meta font-mono bg-surface-sunken text-ink border border-border flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-highlight" />
                          Trusted
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-small text-ink-muted mt-1">
                      <span>Contact: {o.contactName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-meta">
                        <Mail className="w-3 h-3 text-ink-muted" />
                        {o.contactEmail}
                      </span>
                      {o.phone && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-mono text-meta">
                            <Phone className="w-3 h-3 text-ink-muted" />
                            {o.phone}
                          </span>
                        </>
                      )}
                      {o.website && (
                        <>
                          <span>·</span>
                          <a
                            href={o.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ink hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {o.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(o.userId, 'approved')}
                          className="px-3 py-1.5 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(o.userId, 'rejected')}
                          className="px-3 py-1.5 rounded-sm border border-danger/30 text-danger hover:bg-danger/10 text-small font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {o.status === 'approved' && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(o.userId, 'approved', !o.trusted)}
                          className="px-3 py-1.5 rounded-sm text-small font-medium border border-border bg-surface text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                        >
                          {o.trusted ? 'Revoke Trusted' : 'Mark as Trusted'}
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(o.userId, 'suspended')}
                          className="px-3 py-1.5 rounded-sm border border-danger/30 text-danger hover:bg-danger/10 text-small font-medium transition-colors cursor-pointer"
                        >
                          Suspend
                        </button>
                      </>
                    )}

                    {o.status === 'suspended' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(o.userId, 'approved')}
                        className="px-3 py-1.5 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 transition-opacity cursor-pointer"
                      >
                        Re-Activate Account
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-sm bg-surface-sunken border border-border text-small text-ink-muted">
                  <span className="font-semibold text-ink">Stated Purpose: </span>
                  {o.purpose}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
