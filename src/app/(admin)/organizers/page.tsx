'use client'

import React, { useState, useEffect } from 'react'
import { AppShell } from '@/shared/ui/app-shell'
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
      <div className="max-w-6xl mx-auto py-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-purple-600" />
            External Organizers Review Queue
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Review partner organizations, grant event posting privileges, and manage trusted partner status
          </p>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-300 font-medium">
            {feedback}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search organizations or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3.5 py-2 rounded-xl bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 text-xs">
            {(['all', 'pending', 'approved', 'suspended'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-[var(--surface-paper)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Organizer Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-paper)] text-xs text-[var(--text-secondary)]">
              No organizer registrations found matching the criteria.
            </div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.userId}
                className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-bold text-[var(--text-primary)]">
                        {o.organization}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {o.orgType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          o.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : o.status === 'suspended'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {o.status.toUpperCase()}
                      </span>
                      {o.trusted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center gap-1 border border-purple-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          Trusted
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                      <span>Contact: {o.contactName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {o.contactEmail}
                      </span>
                      {o.phone && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
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
                            className="text-purple-600 hover:underline flex items-center gap-1"
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
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(o.userId, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                            o.trusted
                              ? 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'
                              : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-paper)]'
                          }`}
                        >
                          {o.trusted ? 'Revoke Trusted' : 'Mark as Trusted'}
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(o.userId, 'suspended')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-semibold"
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
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Re-Activate Account
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Stated Purpose: </span>
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
