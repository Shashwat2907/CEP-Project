import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireRole } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getPendingApprovals, getResourcesForTeacher, getSubjects } from '@/features/acad/queries'
import { ApprovalQueue } from '@/features/acad/components/ApprovalQueue'
import { UploadResourceForm } from '@/features/acad/components/UploadResourceForm'
import { ResourceCard } from '@/features/acad/components/ResourceCard'
import { AppShell } from '@/shared/ui/app-shell'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Academic Resources — Teacher',
  description: 'Manage resource uploads, approve or reject student submissions.',
}

export default async function TeacherAcadPage() {
  await requireRole(['teacher', 'admin'])
  const profile = await getCurrentProfile()

  const [pending, allResources, subjects] = await Promise.all([
    getPendingApprovals(),
    getResourcesForTeacher(),
    getSubjects(),
  ])

  const approved = allResources.filter((r) => r.status === 'approved')

  return (
    <AppShell
      initialRole="teacher"
      userName={profile?.full_name || 'Prof. Rajesh Sharma'}
      identifier={profile?.college_id || 'TCH101'}
      department={profile?.branch || 'Computer Science'}
      userEmail={profile?.college_email || 'sharma@campus.edu'}
      activePath="/acad"
    >
      <main className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        {/* Navigation Breadcrumb / Return to Homepage */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border border-border bg-surface hover:bg-surface-sunken text-ink transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Return to Homepage</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-ink-muted">Academic Resources</span>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            Teacher Moderation
          </span>
        </div>

        <h1 className="text-2xl font-bold font-display text-ink mb-6">
          Academic Resources Dashboard
        </h1>

      {/* Approval queue */}
      <section aria-label="Approval queue" style={{ marginBottom: '2.5rem' }}>
        <ApprovalQueue resources={pending} />
      </section>

      {/* Teacher upload */}
      <section aria-label="Upload a resource" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Upload Resource
        </h2>
        <UploadResourceForm subjects={subjects} />
      </section>

      {/* All approved resources for teacher's subjects */}
      <section aria-label="Approved resources">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Approved Resources ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <div
            role="status"
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              border: '1px dashed var(--border)',
              borderRadius: '0.5rem',
            }}
          >
            <p>No approved resources yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {approved.map((r) => (
              <ResourceCard key={r.id} resource={r} showStatus />
            ))}
          </div>
        )}
      </section>
      </main>
    </AppShell>
  )
}
