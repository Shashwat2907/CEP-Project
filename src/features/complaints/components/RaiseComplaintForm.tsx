'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { AlertCircle, Shield, CheckCircle2, Lock, ThumbsUp } from 'lucide-react'
import { submitComplaint, findSimilarComplaints } from '../actions'
import type { ComplaintDomain, SimilarComplaint } from '../schema'

interface RaiseComplaintFormProps {
  domains: ComplaintDomain[]
}

export function RaiseComplaintForm({ domains }: RaiseComplaintFormProps) {
  const router = useRouter()
  const [domainId, setDomainId] = React.useState<string>('')
  const [subcategoryId, setSubcategoryId] = React.useState<string>('')
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [anonymous, setAnonymous] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successId, setSuccessId] = React.useState<string | null>(null)
  const [similarComplaints, setSimilarComplaints] = React.useState<SimilarComplaint[]>([])
  const [, setSearchingSimilar] = React.useState(false)

  const selectedDomain = domains.find((d) => d.id === domainId)
  const isSensitive = selectedDomain?.sensitive ?? false

  const displayedSimilar = isSensitive || title.trim().length < 4 ? [] : similarComplaints

  // Live similarity search with 350ms debounce
  React.useEffect(() => {
    if (isSensitive || title.trim().length < 4) {
      return
    }

    const timer = setTimeout(async () => {
      setSearchingSimilar(true)
      try {
        const results = await findSimilarComplaints(title, domainId || undefined)
        setSimilarComplaints(results)
      } catch {
        // Ignore network errors in background similarity search
      } finally {
        setSearchingSimilar(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [title, domainId, isSensitive])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!domainId) {
      setError('Please select a complaint category.')
      return
    }
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters.')
      return
    }
    if (body.trim().length < 10) {
      setError('Description must be at least 10 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await submitComplaint({
        domain_id: domainId,
        subcategory_id: subcategoryId || undefined,
        title: title.trim(),
        body: body.trim(),
        anonymous: isSensitive ? true : anonymous,
        attachments: [],
      })

      if (!res.ok) {
        setError(res.error.message)
      } else {
        setSuccessId(res.data.complaintId)
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (successId) {
    return (
      <Card className="border-success/30 bg-surface">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-display text-h3 font-semibold text-ink">Complaint Registered</h3>
          <p className="mt-1 text-small text-ink-muted">
            Your ticket has been assigned to the Level 1 authority and SLA tracking is active.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSuccessId(null)
                setTitle('')
                setBody('')
                setDomainId('')
                setSubcategoryId('')
                setAnonymous(false)
                setSimilarComplaints([])
              }}
            >
              Raise Another
            </Button>
            <Button onClick={() => router.push(`/complaints/${successId}`)}>
              View Ticket Details
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>Raise a Grievance</CardTitle>
        <CardDescription>
          Complaints are routed to designated authorities and escalated automatically if SLA deadlines are not met.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-small text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Domain Picker */}
          <div>
            <label className="mb-1 block text-small font-medium text-ink">
              Category / Domain <span className="text-danger">*</span>
            </label>
            <select
              value={domainId}
              onChange={(e) => {
                const val = e.target.value
                setDomainId(val)
                setSubcategoryId('')
                const target = domains.find((d) => d.id === val)
                if (target?.sensitive) {
                  setAnonymous(true)
                }
              }}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-small text-ink focus:border-ink focus:outline-none"
              required
            >
              <option value="">Select a category...</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.sensitive ? '(Private / Sensitive)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sensitive Notice */}
          {isSensitive && (
            <div className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 p-3 text-small text-ink">
              <Lock className="h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-warning">Strictly Confidential & Direct Route</p>
                <p className="text-meta text-ink-muted">
                  This issue routes directly to the Anti-Ragging Committee. Your identity is completely hidden,
                  and this complaint will never be displayed on the public tracker.
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-small font-medium text-ink">
              Complaint Subject <span className="text-danger">*</span>
            </label>
            <Input
              placeholder="Brief summary of the issue (e.g. Broken water tap on 2nd floor hostel)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={120}
            />
          </div>

          {/* Live Similar Grievances Suggestion */}
          {displayedSimilar.length > 0 && !isSensitive && (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-small font-semibold text-ink flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4 text-accent" />
                  Similar Open Grievances Already Reported ({displayedSimilar.length})
                </span>
                <span className="text-meta text-ink-muted">
                  Upvoting accelerates resolution
                </span>
              </div>
              <p className="text-meta text-ink-muted leading-normal">
                An issue matching yours may already be under review. You can upvote the existing ticket instead of creating a duplicate:
              </p>
              <div className="divide-y divide-border/50">
                {displayedSimilar.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/complaints/${item.id}`}
                        target="_blank"
                        className="text-small font-medium text-ink hover:underline line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <div className="text-meta text-ink-muted flex items-center gap-2 mt-0.5">
                        <span>{item.domain?.name}</span>
                        <span>•</span>
                        <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <Link href={`/complaints/${item.id}`} target="_blank">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 shrink-0 text-meta hover:border-ink"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{item.upvotes_count ?? 0}</span>
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-small font-medium text-ink">
              Detailed Description <span className="text-danger">*</span>
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-border bg-surface p-3 text-small text-ink focus:border-ink focus:outline-none"
              placeholder="Provide exact room/lab numbers, times, and clear details to help the authority resolve it quickly..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
            />
          </div>

          {/* Anonymous Toggle (only if non-sensitive; sensitive is always anonymous) */}
          {!isSensitive && (
            <div className="flex items-start gap-3 rounded-md border border-border bg-surface-sunken p-3">
              <input
                type="checkbox"
                id="anonymous-toggle"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-ink"
              />
              <label htmlFor="anonymous-toggle" className="cursor-pointer text-small">
                <span className="font-medium text-ink flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-ink-muted" /> File Anonymously
                </span>
                <span className="text-meta text-ink-muted block mt-0.5">
                  Your name will be hidden from all handlers and teachers. The system only stores your ID internally for abuse control.
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end pt-2">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? 'Submitting...' : 'Submit Grievance'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
