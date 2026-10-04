import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/shared/auth/guards'
import { getCurrentProfile } from '@/shared/auth/session'
import {
  getApprovedResources,
  getMyPendingUploads,
  getSubjects,
} from '@/features/acad/queries'
import { ResourceCard } from '@/features/acad/components/ResourceCard'
import { UploadResourceForm } from '@/features/acad/components/UploadResourceForm'
import { ResourceFilterBar } from '@/features/acad/components/ResourceFilterBar'
import type { ResourceType } from '@/features/acad/schema'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Academic Resources',
  description: 'Browse, upload and download notes, slides and past year questions for your subjects.',
}

interface StudentAcadPageProps {
  searchParams: Promise<{
    year?: string
    branch?: string
    subject_id?: string
    type?: string
    q?: string
    saved?: string
  }>
}

export default async function StudentAcadPage({ searchParams }: StudentAcadPageProps) {
  await requireAuth()
  const profile = await getCurrentProfile()

  // Teachers/admins accessing /acad are routed to their teacher dashboard
  if (profile?.role_primary === 'teacher' || profile?.role_primary === 'admin') {
    redirect('/teacher/acad')
  }


  const sp = await searchParams

  // Default filter: student's own year and branch when no search/filter params exist
  const hasParamFilters = Boolean(
    sp.year !== undefined ||
    sp.branch !== undefined ||
    sp.subject_id !== undefined ||
    sp.type !== undefined ||
    sp.q !== undefined ||
    sp.saved !== undefined
  )

  const activeYear = hasParamFilters
    ? sp.year ? parseInt(sp.year, 10) : undefined
    : profile?.year ?? undefined

  const activeBranch = hasParamFilters
    ? sp.branch || undefined
    : profile?.branch ?? undefined

  const activeType =
    sp.type && ['notes', 'pyq', 'slides', 'other'].includes(sp.type)
      ? (sp.type as ResourceType)
      : undefined

  const activeSubjectId = sp.subject_id || undefined
  const activeQuery     = sp.q || undefined
  const isSavedOnly     = sp.saved === 'true'

  // Fetch approved resources, all subjects for filters/upload, and student pending uploads
  const [resources, allSubjects, pending] = await Promise.all([
    getApprovedResources({
      year:       activeYear,
      branch:     activeBranch,
      subject_id: activeSubjectId,
      type:       activeType,
      query:      activeQuery,
      saved:      isSavedOnly,
    }),
    getSubjects(),
    getMyPendingUploads(),
  ])

  return (
    <main style={{ padding: '1.5rem', maxWidth: '56rem', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Academic Resources
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
          Explore study materials, past year questions, and lecture slides verified by faculty.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Suspense fallback={<div style={{ height: '3.5rem', marginBottom: '1.5rem' }} />}>
        <ResourceFilterBar subjects={allSubjects} />
      </Suspense>

      {/* Upload Collapsible Section */}
      <details
        style={{
          marginBottom: '2rem',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          background: 'var(--card)',
          overflow: 'hidden',
        }}
      >
        <summary
          style={{
            padding: '0.875rem 1rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9375rem',
            userSelect: 'none',
            outline: 'none',
          }}
        >
          + Upload a new resource
        </summary>
        <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: '1rem' }}>
            <UploadResourceForm
              subjects={allSubjects}
              defaultYear={profile?.year ?? undefined}
              defaultBranch={profile?.branch ?? undefined}
            />
          </div>
        </div>
      </details>

      {/* Student's pending uploads */}
      {pending.length > 0 && !isSavedOnly && !activeQuery && (
        <section aria-label="My pending uploads" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            My Pending Submissions ({pending.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map((r) => (
              <ResourceCard key={r.id} resource={r} showStatus showBookmark={false} />
            ))}
          </div>
        </section>
      )}

      {/* Approved Resources List */}
      <section aria-label="Approved resources">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            {isSavedOnly ? 'Saved Bookmarks' : 'Available Resources'} ({resources.length})
          </h2>
          {activeYear && activeBranch && !isSavedOnly && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
              Year {activeYear} · {activeBranch}
            </span>
          )}
        </div>

        {resources.length === 0 ? (
          <div
            role="status"
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              border: '1px dashed var(--border)',
              borderRadius: '0.75rem',
              background: 'var(--card)',
            }}
          >
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
              {isSavedOnly
                ? 'No saved resources yet'
                : 'No resources match your filters'}
            </p>
            <p style={{ fontSize: '0.875rem', maxWidth: '24rem', margin: '0 auto' }}>
              {isSavedOnly
                ? 'Click the bookmark icon on any resource card to save it here for quick access.'
                : 'Try adjusting your year, branch, or search keywords to find what you are looking for.'}
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
