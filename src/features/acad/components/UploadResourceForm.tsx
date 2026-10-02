'use client'

import { useRef, useState, useTransition } from 'react'
import { initiateUpload } from '../actions'
import type { Subject, ResourceType } from '../schema'

interface UploadResourceFormProps {
  subjects: Subject[]
  defaultYear?: number
  defaultBranch?: string
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'notes',  label: 'Notes' },
  { value: 'pyq',    label: 'Past Year Questions' },
  { value: 'slides', label: 'Slides / Presentations' },
  { value: 'other',  label: 'Other' },
]

const ALLOWED_MIME: Record<string, string> = {
  pdf:  'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function UploadResourceForm({
  subjects,
  defaultYear,
  defaultBranch,
}: UploadResourceFormProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const busy = isPending || uploading

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const form = e.currentTarget
    const fd = new FormData(form)
    const file = fileRef.current?.files?.[0]

    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'pptx', 'docx'].includes(ext)) {
      setError('Only PDF, PPTX and DOCX files are allowed.')
      return
    }

    const sizeMb = file.size / (1024 * 1024)
    fd.set('file_ext', ext)
    fd.set('file_size_mb', sizeMb.toString())

    startTransition(async () => {
      const result = await initiateUpload(fd)

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      // PUT the file directly to Supabase Storage via the signed URL
      setUploading(true)
      try {
        const res = await fetch(result.data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': ALLOWED_MIME[ext] ?? 'application/octet-stream' },
        })
        if (!res.ok) throw new Error('Storage upload failed')
        setSuccess(true)
        form.reset()
      } catch {
        setError('File upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Upload resource form"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '32rem' }}
    >
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Upload Resource</h2>

      {/* Title */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Title</span>
        <input
          id="resource-title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder="e.g. Data Structures Unit 3 Notes"
          disabled={busy}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
        />
      </label>

      {/* Subject */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Subject</span>
        <select
          id="resource-subject"
          name="subject_id"
          required
          disabled={busy}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name} (Year {s.year}, {s.branch})
            </option>
          ))}
        </select>
      </label>

      {/* Year + Branch */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Year</span>
          <select
            id="resource-year"
            name="year"
            required
            defaultValue={defaultYear ?? ''}
            disabled={busy}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
          >
            <option value="">Year…</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Branch</span>
          <input
            id="resource-branch"
            name="branch"
            type="text"
            required
            defaultValue={defaultBranch ?? ''}
            placeholder="e.g. CS"
            disabled={busy}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
          />
        </label>
      </div>

      {/* Type */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Resource type</span>
        <select
          id="resource-type"
          name="type"
          required
          disabled={busy}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
        >
          <option value="">Select type…</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      {/* File */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>File (PDF, PPTX or DOCX)</span>
        <input
          id="resource-file"
          ref={fileRef}
          type="file"
          accept=".pdf,.pptx,.docx"
          required
          disabled={busy}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
          Max 50 MB. PDF, PPTX and DOCX only.
        </span>
      </label>

      {/* Validation / error message */}
      {error && (
        <p role="alert" style={{ color: 'var(--destructive)', fontSize: '0.875rem' }}>
          {error}
        </p>
      )}

      {/* Success message */}
      {success && (
        <p role="status" style={{ color: 'var(--success, green)', fontSize: '0.875rem' }}>
          Upload submitted! {defaultYear ? 'It will appear once a teacher approves it.' : ''}
        </p>
      )}

      <button
        id="resource-upload-btn"
        type="submit"
        disabled={busy}
        style={{
          padding: '0.625rem 1.25rem',
          borderRadius: '0.375rem',
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          fontWeight: 600,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {uploading ? 'Uploading…' : isPending ? 'Preparing…' : 'Upload'}
      </button>
    </form>
  )
}
