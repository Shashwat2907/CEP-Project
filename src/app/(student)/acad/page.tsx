import { requireRole } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import { getApprovedResources, getMyPendingUploads, getSubjects } from '@/features/acad/queries'
import { ResourceCard } from '@/features/acad/components/ResourceCard'
import { UploadResourceForm } from '@/features/acad/components/UploadResourceForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Academic Resources',
  description: 'Browse, upload and download notes, slides and past year questions for your subjects.',
}

export default async function StudentAcadPage() {
  await requireRole(['student'])
  const profile = await getCurrentProfile()

  // Default filter: student's own year and branch (PLAN.md §5.6)
  const defaultYear   = profile?.year   ?? undefined
  const defaultBranch = profile?.branch ?? undefined

  const [resources, pending, subjects] = await Promise.all([
    getApprovedResources({
      year:   defaultYear,
      branch: defaultBranch,
    }),
    getMyPendingUploads(),
    getSubjects({ year: defaultYear, branch: defaultBranch }),
  ])

  return (
    <main style={{ padding: '1.5rem', maxWidth: '56rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Academic Resources
      </h1>

      {/* Upload form */}
      <section aria-label="Upload a resource" style={{ marginBottom: '2rem' }}>
        <UploadResourceForm
          subjects={subjects}
          defaultYear={defaultYear}
          defaultBranch={defaultBranch}
        />
      </section>

      {/* My pending uploads */}
      {pending.length > 0 && (
        <section aria-label="My pending uploads" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            My Pending Uploads ({pending.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map((r) => (
              <ResourceCard key={r.id} resource={r} showStatus />
            ))}
          </div>
        </section>
      )}

      {/* Approved resources */}
      <section aria-label="Approved resources">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Resources
          {defaultYear && defaultBranch
            ? ` — Year ${defaultYear}, ${defaultBranch}`
            : ''}
          {' '}({resources.length})
        </h2>

        {resources.length === 0 ? (
          <div
            role="status"
            style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', border: '1px dashed var(--border)', borderRadius: '0.5rem' }}
          >
            <p style={{ fontSize: '1rem' }}>No resources yet</p>
            <p style={{ fontSize: '0.875rem' }}>
              Be the first to upload notes or slides for your subjects.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {resources.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
