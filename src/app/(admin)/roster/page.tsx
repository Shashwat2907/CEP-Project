'use client'

import * as React from 'react'
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Mail,
  FileSpreadsheet,
} from 'lucide-react'
import { AppShell } from '@/shared/ui/app-shell'
import { RosterUploadCard } from '@/features/profile/components/roster-upload-card'
import { getRosterMembers } from '@/features/profile/actions'
import { RosterMember } from '@/features/profile/schema'
import { Input } from '@/shared/ui/input'
import { cn } from '@/lib/utils'

function AdminRosterContent() {
  const [members, setMembers] = React.useState<RosterMember[]>([
    {
      id: '1',
      collegeEmail: 'aarav.sharma@college.edu',
      collegeId: '23BCE1001',
      fullName: 'Aarav Sharma',
      role: 'student',
      branch: 'Computer Science & Engineering',
      year: 2,
      division: 'A',
      batch: 'B1',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      collegeEmail: 'priya.patel@college.edu',
      collegeId: '23BCE1002',
      fullName: 'Priya Patel',
      role: 'student',
      branch: 'Computer Science & Engineering',
      year: 2,
      division: 'A',
      batch: 'B2',
      status: 'invited',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      collegeEmail: 'sunita.rao@college.edu',
      collegeId: 'FAC-CS-042',
      fullName: 'Dr. Sunita Rao',
      role: 'teacher',
      branch: null,
      year: null,
      division: null,
      batch: null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])

  const [searchQuery, setSearchQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('all')

  React.useEffect(() => {
    async function loadMembers() {
      try {
        const res = await getRosterMembers(100)
        if (res.ok && res.data.length > 0) {
          setMembers(res.data)
        }
      } catch {
        // Fallback to initial mock data
      }
    }
    loadMembers()
  }, [])

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.collegeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.collegeId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || m.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="w-full py-2 space-y-10">
      <div>
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={24} className="text-ink" />
          <h1 className="font-display text-h1 font-bold text-ink">College Roster Management</h1>
        </div>
        <p className="text-small text-ink-muted mt-1">
          Import authoritative CSV files to establish college IDs, invite eligible members, and govern authentication access.
        </p>
      </div>

      {/* 1. CSV Upload Card */}
      <RosterUploadCard
        onImportComplete={(result) => {
          // Re-fetch members after successful import
          getRosterMembers(100).then((res) => {
            if (res.ok && res.data.length > 0) {
              setMembers(res.data)
            }
          })
        }}
      />

      {/* 2. Roster Member Directory */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users size={18} strokeWidth={1.75} className="text-ink" />
            <h2 className="font-display text-h3 font-bold text-ink">Roster Member Directory</h2>
            <span className="font-mono text-meta text-ink-muted bg-surface-sunken px-2 py-0.5 rounded-sm border border-border">
              {filteredMembers.length} members
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Search name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-small h-8 w-60"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 px-2 rounded-md border border-border bg-surface text-small text-ink focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="border border-border rounded-lg bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-small">
              <thead className="bg-surface-sunken/60 border-b border-border font-mono text-meta text-ink-muted uppercase">
                <tr>
                  <th className="p-3.5">College ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">College Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Academic Scope</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-sunken/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-ink">{m.collegeId}</td>
                    <td className="p-3.5 font-semibold text-ink">{m.fullName}</td>
                    <td className="p-3.5 font-mono text-ink-muted">{m.collegeEmail}</td>
                    <td className="p-3.5">
                      <span className="font-mono text-meta font-bold uppercase px-2 py-0.5 rounded-sm bg-surface-sunken text-ink border border-border">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-meta text-ink-muted">
                      {m.branch ? `${m.branch} (Y${m.year ?? 1})` : '—'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'font-mono text-meta font-bold px-2 py-0.5 rounded-sm',
                          m.status === 'active'
                            ? 'bg-in-campus/10 text-in-campus border border-in-campus/20'
                            : m.status === 'invited'
                            ? 'bg-highlight/15 text-ink border border-highlight/30'
                            : 'bg-surface-sunken text-ink-muted border border-border'
                        )}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function AdminRosterPage() {
  return (
    <AppShell
      initialRole="admin"
      userName="Admin User"
      identifier="ADM-001"
      department="Campus Administration"
      userEmail="admin@college.edu"
      activePath="/admin/roster"
    >
      <AdminRosterContent />
    </AppShell>
  )
}
