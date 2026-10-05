'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { initiateUpload } from '../actions'
import type { Subject, ResourceType } from '../schema'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface UploadResourceFormProps {
  subjects: Subject[]
  defaultYear?: number
  defaultBranch?: string
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'notes', label: 'Notes' },
  { value: 'pyq', label: 'Past Year Questions' },
  { value: 'slides', label: 'Slides / Presentations' },
  { value: 'other', label: 'Other' },
]

const ALLOWED_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function UploadResourceForm({
  subjects,
  defaultYear,
  defaultBranch,
}: UploadResourceFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
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

      // PUT the file directly to Storage via the signed or local mock upload URL
      setUploading(true)
      try {
        const uploadUrl = result.data.uploadUrl
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': ALLOWED_MIME[ext] ?? 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
            'X-Resource-Title': encodeURIComponent((fd.get('title') as string) || file.name),
          },
        })
        if (!res.ok) throw new Error('Storage upload failed')
        setSuccess(true)
        setSelectedFileName(null)
        form.reset()
        router.refresh()
      } catch {
        setError('File upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    })
  }

  const selectStyle: React.CSSProperties = {
    colorScheme: 'light dark',
    backgroundColor: 'var(--surface-sunken)',
    color: 'var(--text-primary)',
  }

  const optionStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-paper)',
    color: 'var(--text-primary)',
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Upload resource form"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] p-6 shadow-sm space-y-5 max-w-xl transition-all"
    >
      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
          <Upload className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Upload Resource</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Share notes, slides, or past papers with students and faculty
          </p>
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="resource-title" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
          Document Title
        </label>
        <input
          id="resource-title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder="e.g. CST Module 4: Memory Management & Paging Notes"
          disabled={busy}
          style={selectStyle}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-[var(--surface-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 transition-all disabled:opacity-50"
        />
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="resource-subject" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
          Subject Course
        </label>
        <select
          id="resource-subject"
          name="subject_id"
          required
          disabled={busy}
          style={selectStyle}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-[var(--surface-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-sm text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
        >
          <option value="" style={optionStyle}>
            Select subject…
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id} style={optionStyle}>
              {s.code} — {s.name} (Year {s.year}, {s.branch})
            </option>
          ))}
        </select>
      </div>

      {/* Year + Branch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="resource-year" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
            Academic Year
          </label>
          <select
            id="resource-year"
            name="year"
            required
            defaultValue={defaultYear ?? ''}
            disabled={busy}
            style={selectStyle}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-[var(--surface-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-sm text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
          >
            <option value="" style={optionStyle}>
              Select Year…
            </option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y} style={optionStyle}>
                Year {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="resource-branch" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
            Branch / Department
          </label>
          <input
            id="resource-branch"
            name="branch"
            type="text"
            required
            defaultValue={defaultBranch ?? ''}
            placeholder="e.g. Computer Science"
            disabled={busy}
            style={selectStyle}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-[var(--surface-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {/* Type */}
      <div>
        <label htmlFor="resource-type" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
          Resource Type
        </label>
        <select
          id="resource-type"
          name="type"
          required
          disabled={busy}
          style={selectStyle}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:border-[var(--border)] focus:border-[var(--primary)] focus:bg-[var(--surface-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-sm text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
        >
          <option value="" style={optionStyle}>
            Select type…
          </option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value} style={optionStyle}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload */}
      <div>
        <label htmlFor="resource-file" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
          File (PDF, PPTX, or DOCX)
        </label>
        <div className="relative">
          <input
            id="resource-file"
            ref={fileRef}
            type="file"
            accept=".pdf,.pptx,.docx"
            required
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              setSelectedFileName(f ? f.name : null)
            }}
            style={selectStyle}
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs text-[var(--text-secondary)] file:mr-3.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary)] file:text-[var(--on-ink)] hover:file:opacity-90 cursor-pointer disabled:opacity-50 transition-all"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-1.5 px-0.5">
          <span>Max 50 MB. High-yield text documents are prioritized for AI flashcards.</span>
          {selectedFileName && (
            <span className="font-semibold text-[var(--primary)] truncate max-w-[200px] flex items-center gap-1">
              <FileText className="w-3 h-3 shrink-0" />
              {selectedFileName}
            </span>
          )}
        </div>
      </div>

      {/* Validation / error message */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Upload successful! {defaultYear ? 'Document submitted for faculty review.' : 'Available in repository & AI flashcards.'}
          </span>
        </div>
      )}

      <button
        id="resource-upload-btn"
        type="submit"
        disabled={busy}
        className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary)] hover:opacity-90 active:scale-98 text-[var(--on-ink)] font-bold text-xs tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading & Extracting Content…</span>
          </>
        ) : isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Preparing Upload…</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </>
        )}
      </button>
    </form>
  )
}

