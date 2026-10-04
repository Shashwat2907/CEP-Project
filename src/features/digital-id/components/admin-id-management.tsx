'use client'

import * as React from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Filter,
  UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { updateDigitalIdStatusAction } from '../actions'
import type { DigitalIdStatus } from '../schema'

export interface UserDigitalIdRecord {
  id: string
  collegeId: string
  fullName: string
  collegeEmail: string
  role: 'student' | 'teacher' | 'admin'
  branch?: string | null
  year?: number | null
  digitalIdStatus: DigitalIdStatus
  revocationReason?: string | null
  revokedAt?: string | null
}

export interface AdminIdManagementProps {
  initialUsers?: UserDigitalIdRecord[]
}

const DEFAULT_MOCK_USERS: UserDigitalIdRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    collegeId: '23BCE1042',
    fullName: 'Shashwat Choudhary',
    collegeEmail: 'shashwat@campus.edu',
    role: 'student',
    branch: 'Computer Science & Engineering',
    year: 3,
    digitalIdStatus: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    collegeId: '23BCE1088',
    fullName: 'Kedar Kashinath Rao',
    collegeEmail: 'kedar@campus.edu',
    role: 'student',
    branch: 'Computer Science & Engineering',
    year: 3,
    digitalIdStatus: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    collegeId: '23BCE1120',
    fullName: 'Aarav Sharma',
    collegeEmail: 'aarav.sharma@campus.edu',
    role: 'student',
    branch: 'Information Technology',
    year: 2,
    digitalIdStatus: 'suspended',
    revocationReason: 'Library dues pending for >60 days',
    revokedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    collegeId: '22BME1005',
    fullName: 'Rohan Mehra',
    collegeEmail: 'rohan.mehra@campus.edu',
    role: 'student',
    branch: 'Mechanical Engineering',
    year: 4,
    digitalIdStatus: 'revoked',
    revocationReason: 'Exam malpractice under review by Dean Academic',
    revokedAt: '2026-09-28T14:30:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    collegeId: 'T-CS-102',
    fullName: 'Dr. Ramesh Iyer',
    collegeEmail: 'ramesh.iyer@campus.edu',
    role: 'teacher',
    branch: 'Computer Science & Engineering',
    year: null,
    digitalIdStatus: 'active',
  },
]

export function AdminIdManagement({
  initialUsers = DEFAULT_MOCK_USERS,
}: AdminIdManagementProps) {
  const [users, setUsers] = React.useState<UserDigitalIdRecord[]>(initialUsers)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | DigitalIdStatus>('all')
  const [selectedUser, setSelectedUser] = React.useState<UserDigitalIdRecord | null>(null)
  const [actionTargetStatus, setActionTargetStatus] = React.useState<DigitalIdStatus>('revoked')
  const [reasonInput, setReasonInput] = React.useState('')
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [feedback, setFeedback] = React.useState<string | null>(null)

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.collegeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.collegeEmail.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || u.digitalIdStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchQuery, statusFilter])

  const openStatusDialog = (user: UserDigitalIdRecord, targetStatus: DigitalIdStatus) => {
    setSelectedUser(user)
    setActionTargetStatus(targetStatus)
    setReasonInput(user.revocationReason || '')
    setIsDialogOpen(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedUser) return
    setIsUpdating(true)
    try {
      const res = await updateDigitalIdStatusAction({
        userId: selectedUser.id,
        status: actionTargetStatus,
        reason: reasonInput,
      })

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id
              ? {
                  ...u,
                  digitalIdStatus: actionTargetStatus,
                  revocationReason: actionTargetStatus !== 'active' ? reasonInput : null,
                  revokedAt: actionTargetStatus !== 'active' ? new Date().toISOString() : null,
                }
              : u
          )
        )
        setFeedback(`ID status for ${selectedUser.fullName} set to ${actionTargetStatus.toUpperCase()}`)
        setIsDialogOpen(false)
      } else {
        alert(res.message)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-surface border border-border rounded-md p-5 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-ink" size={20} />
              <h1 className="font-display text-h2 font-bold text-ink">
                Digital ID & Access Control
              </h1>
            </div>
            <p className="text-small text-ink-muted mt-0.5">
              Instant revocation, suspension, and clearance governance across all campus gates.
            </p>
          </div>

          <div className="flex items-center gap-2 text-meta font-mono">
            <span className="px-2 py-1 bg-surface-sunken border border-border rounded-sm text-ink font-semibold">
              Total Active: {users.filter((u) => u.digitalIdStatus === 'active').length}
            </span>
            <span className="px-2 py-1 bg-danger/10 border border-danger/30 rounded-sm text-danger font-semibold">
              Revoked: {users.filter((u) => u.digitalIdStatus === 'revoked').length}
            </span>
          </div>
        </div>

        {feedback && (
          <div className="p-3 bg-in-campus/10 border border-in-campus/30 rounded-sm text-small text-in-campus flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-mono underline hover:text-ink cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by roll number, name, or email..."
              className="w-full bg-surface-sunken border border-border rounded-sm pl-9 pr-3 py-2 text-small font-mono text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-ink-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | DigitalIdStatus)}
              className="bg-surface-sunken border border-border rounded-sm px-3 py-2 text-small font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="revoked">Revoked Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Roster Table */}
      <div className="bg-surface border border-border rounded-md shadow-none overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
          <span className="text-small font-bold text-ink font-display">
            Member Credentials ({filteredUsers.length})
          </span>
          <span className="text-[11px] font-mono text-ink-muted">
            Instant Server-Side Sync
          </span>
        </div>

        <div className="divide-y divide-border overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-sunken/30 text-[11px] font-mono text-ink-muted border-b border-border">
                <th className="px-4 py-2.5">Roll / ID</th>
                <th className="px-4 py-2.5">Member Name</th>
                <th className="px-4 py-2.5">Branch / Role</th>
                <th className="px-4 py-2.5">Digital ID Status</th>
                <th className="px-4 py-2.5 text-right">Instant Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-small">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted font-mono">
                    No matching members found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-ink whitespace-nowrap">
                      {user.collegeId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink leading-snug">
                        {user.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-ink-muted">
                        {user.collegeEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <div>{user.branch || '—'}</div>
                      <div className="text-[11px] font-mono capitalize">
                        {user.role} {user.year ? `· Year ${user.year}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.digitalIdStatus === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/30 text-[11px] font-mono font-semibold">
                          <CheckCircle size={12} /> ACTIVE
                        </span>
                      ) : user.digitalIdStatus === 'suspended' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-warning/15 text-warning-border border border-warning text-[11px] font-mono font-semibold">
                            <AlertTriangle size={12} /> SUSPENDED
                          </span>
                          {user.revocationReason && (
                            <p className="text-[10px] text-ink-muted mt-0.5 truncate max-w-[200px]" title={user.revocationReason}>
                              {user.revocationReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-danger/10 text-danger border border-danger/30 text-[11px] font-mono font-semibold">
                            <XCircle size={12} /> REVOKED
                          </span>
                          {user.revocationReason && (
                            <p className="text-[10px] text-danger mt-0.5 truncate max-w-[200px]" title={user.revocationReason}>
                              {user.revocationReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {user.digitalIdStatus !== 'active' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openStatusDialog(user, 'active')}
                            className="text-xs h-7 px-2"
                          >
                            <ShieldCheck size={13} className="text-in-campus" />
                            <span>Reinstate</span>
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openStatusDialog(user, 'suspended')}
                              className="text-xs h-7 px-2 text-warning-border hover:bg-warning/10"
                            >
                              <span>Suspend</span>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => openStatusDialog(user, 'revoked')}
                              className="text-xs h-7 px-2"
                            >
                              <UserX size={13} />
                              <span>Revoke</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Status Action Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionTargetStatus === 'active'
                ? 'Reinstate Digital ID Credential'
                : actionTargetStatus === 'suspended'
                ? 'Suspend Digital ID Access'
                : 'Instantly Revoke Digital ID'}
            </DialogTitle>
            <DialogDescription>
              {actionTargetStatus === 'active'
                ? `Restore all campus gate, library, and examination clearances for ${selectedUser?.fullName} (${selectedUser?.collegeId}).`
                : `Instantly block gate entry and QR verification for ${selectedUser?.fullName} (${selectedUser?.collegeId}). Any live 30s tokens will be rejected immediately upon scanning.`}
            </DialogDescription>
          </DialogHeader>

          {actionTargetStatus !== 'active' && (
            <div className="space-y-2 py-2">
              <label className="text-small font-medium text-ink block">
                Administrative Reason (shown to guards & student)
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Disciplinary suspension, lost physical card, exam malpractice..."
                rows={3}
                className="w-full bg-surface-sunken border border-border rounded-sm p-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink font-body"
              />
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant={actionTargetStatus === 'revoked' ? 'danger' : 'primary'}
              onClick={handleConfirmStatusChange}
              disabled={isUpdating}
            >
              {isUpdating && <RefreshCw size={14} className="animate-spin" />}
              <span>
                Confirm {actionTargetStatus.toUpperCase()}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
