import Link from 'next/link'
import { SaveBookmarkButton } from './SaveBookmarkButton'
import type { Resource } from '../schema'

interface ResourceCardProps {
  resource: Resource
  showStatus?: boolean
  showBookmark?: boolean
  /** If provided, rendered inside the card as action buttons */
  actions?: React.ReactNode
}

const STATUS_LABELS: Record<string, string> = {
  pending:  'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'var(--warning, #d97706)',
  approved: 'var(--success, #16a34a)',
  rejected: 'var(--destructive)',
}

const TYPE_LABELS: Record<string, string> = {
  notes:  'Notes',
  pyq:    'Past Year Questions',
  slides: 'Slides',
  other:  'Other',
}

export function ResourceCard({
  resource,
  showStatus = false,
  showBookmark = true,
  actions,
}: ResourceCardProps) {
  return (
    <article
      aria-label={`Resource: ${resource.title}`}
      style={{
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: 'var(--card)',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
          {resource.status === 'approved' ? (
            <Link
              href={`/acad/${resource.id}`}
              style={{
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {resource.title}
            </Link>
          ) : (
            resource.title
          )}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {showBookmark && resource.status === 'approved' && (
            <SaveBookmarkButton
              resourceId={resource.id}
              initialSaved={resource.is_saved ?? false}
            />
          )}

          {showStatus && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: STATUS_COLORS[resource.status] ?? 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {STATUS_LABELS[resource.status] ?? resource.status}
            </span>
          )}
        </div>
      </div>


      {/* Meta */}
      <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {resource.subject && (
          <span>{resource.subject.code} — {resource.subject.name}</span>
        )}
        <span>·</span>
        <span>{TYPE_LABELS[resource.type] ?? resource.type}</span>
        <span>·</span>
        <span>Year {resource.year}, {resource.branch}</span>
        {resource.uploader && (
          <>
            <span>·</span>
            <span>by {resource.uploader.full_name}</span>
          </>
        )}
      </div>

      {/* Rejection reason */}
      {resource.status === 'rejected' && resource.rejection_reason && (
        <p style={{ fontSize: '0.8rem', color: 'var(--destructive)', margin: 0 }}>
          Reason: {resource.rejection_reason}
        </p>
      )}

      {/* Processing status (for AI features — shown after approval) */}
      {resource.status === 'approved' && resource.processing_status === 'failed' && (
        <p style={{ fontSize: '0.8rem', color: 'var(--destructive)', margin: 0 }}>
          Processing failed — contact admin to retry.
        </p>
      )}

      {/* Action slot */}
      {actions && <div style={{ marginTop: '0.5rem' }}>{actions}</div>}
    </article>
  )
}
