import { requireRole } from '@/shared/auth/guards'
import { getPendingApprovals, getResourcesForTeacher, getSubjects } from '@/features/acad/queries'
import { ApprovalQueue } from '@/features/acad/components/ApprovalQueue'
import { UploadResourceForm } from '@/features/acad/components/UploadResourceForm'
import { ResourceCard } from '@/features/acad/components/ResourceCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Academic Resources — Teacher',
  description: 'Manage resource uploads, approve or reject student submissions.',
}

export default async function TeacherAcadPage() {
  await requireRole(['teacher', 'admin'])

  const [pending, allResources, subjects] = await Promise.all([
    getPendingApprovals(),
    getResourcesForTeacher(),
    getSubjects(),
  ])

  const approved = allResources.filter((r) => r.status === 'approved')

  return (
    <main style={{ padding: '1.5rem', maxWidth: '56rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Academic Resources
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
  )
}
