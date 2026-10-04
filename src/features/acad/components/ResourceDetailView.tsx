import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { SaveBookmarkButton } from './SaveBookmarkButton'
import { ProcessingStatusBadge } from './ProcessingStatusBadge'
import { FlashcardDeckButton } from './FlashcardDeckButton'
import { DoubtChatButton } from './DoubtChatButton'
import type { Resource, DoubtMessage } from '../schema'

interface ResourceDetailViewProps {
  resource: Resource
  signedUrl: string
  chunkCount?: number
  hasDeck?: boolean
  cardCount?: number
  dueCount?: number
  doubtThreadId?: string
  initialDoubtMessages?: DoubtMessage[]
}


const TYPE_LABELS: Record<string, string> = {
  notes:  'Notes',
  pyq:    'Past Year Questions',
  slides: 'Lecture Slides',
  other:  'Reference Material',
}

const PROCESSING_STATUS_INFO: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  ready: {
    label: 'AI Ready (Chunked & Indexed)',
    color: 'var(--success, #16a34a)',
    icon: CheckCircle2,
  },
  processing: {
    label: 'AI Processing (Extracting chunks...)',
    color: 'var(--warning, #d97706)',
    icon: Clock,
  },
  failed: {
    label: 'AI Processing Failed',
    color: 'var(--destructive, #ef4444)',
    icon: AlertCircle,
  },
  not_started: {
    label: 'Queued for AI Indexing',
    color: 'var(--muted-foreground)',
    icon: Clock,
  },
}

export function ResourceDetailView({
  resource,
  signedUrl,
  chunkCount,
  hasDeck = false,
  cardCount = 0,
  dueCount = 0,
  doubtThreadId,
  initialDoubtMessages = [],
}: ResourceDetailViewProps) {
  const statusInfo =
    PROCESSING_STATUS_INFO[resource.processing_status] ?? PROCESSING_STATUS_INFO.not_started
  const StatusIcon = statusInfo.icon

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Back navigation */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Link
            href="/"
            style={{
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Return to Homepage
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link
            href="/acad"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Resources</span>
          </Link>
        </div>
      </div>

      {/* Main card */}
      <article
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Title and bookmark row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  background: 'var(--primary-subtle, rgba(59, 130, 246, 0.1))',
                  color: 'var(--primary)',
                }}
              >
                {TYPE_LABELS[resource.type] ?? resource.type}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  background: 'var(--muted, #f3f4f6)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {resource.file_ext.toUpperCase()}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1.25 }}>
              {resource.title}
            </h1>
          </div>

          <SaveBookmarkButton
            resourceId={resource.id}
            initialSaved={resource.is_saved ?? false}
          />
        </div>

        {/* Metadata Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
          }}
        >
          {/* Subject */}
          {resource.subject && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <FileText size={16} color="var(--primary)" style={{ marginTop: '0.125rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Subject</div>
                <div style={{ fontWeight: 600 }}>{resource.subject.code}</div>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>
                  {resource.subject.name}
                </div>
              </div>
            </div>
          )}

          {/* Academic Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <GraduationCap size={16} color="var(--primary)" style={{ marginTop: '0.125rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Program</div>
              <div style={{ fontWeight: 500 }}>
                Year {resource.year} · {resource.branch}
              </div>
            </div>
          </div>

          {/* Uploader */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <User size={16} color="var(--primary)" style={{ marginTop: '0.125rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Uploaded by</div>
              <div style={{ fontWeight: 500 }}>
                {resource.uploader?.full_name ?? 'Student Contributor'}
              </div>
            </div>
          </div>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Calendar size={16} color="var(--primary)" style={{ marginTop: '0.125rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Uploaded date</div>
              <div style={{ fontWeight: 500 }}>
                {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'Recent'}
              </div>
            </div>
          </div>
        </div>

        {/* AI Processing Status Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <StatusIcon size={16} color={statusInfo.color} />
            <span style={{ fontWeight: 600, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>
          <ProcessingStatusBadge
            status={resource.processing_status}
            resourceId={resource.id}
            chunkCount={chunkCount}
          />
        </div>


        {/* Primary Download Button */}
        <div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'var(--primary)',
              color: 'var(--primary-foreground, #fff)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            <Download size={18} />
            <span>Download {resource.file_ext.toUpperCase()} File</span>
          </a>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '0.5rem' }}>
            Secure download link valid for 60 minutes.
          </p>
        </div>

        {/* Future AI Actions Preview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginTop: '0.5rem',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
          }}
        >
          <FlashcardDeckButton
            resourceId={resource.id}
            hasDeck={hasDeck}
            cardCount={cardCount}
            dueCount={dueCount}
            processingStatus={resource.processing_status}
          />

          <DoubtChatButton
            resourceId={resource.id}
            resourceTitle={resource.title}
            processingStatus={resource.processing_status}
            initialMessages={initialDoubtMessages}
            initialThreadId={doubtThreadId}
          />
        </div>
      </article>
    </div>
  )
}
