'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import { EmptyState } from '@/shared/ui/empty-state'
import { ThumbsUp, Clock, Filter, ArrowUpDown } from 'lucide-react'
import { toggleComplaintUpvote } from '../actions'
import type { Complaint, ComplaintDomain, ComplaintStatus } from '../schema'

interface PublicTrackerBoardProps {
  initialComplaints: Complaint[]
  domains: ComplaintDomain[]
}

function getStatusBadge(status: ComplaintStatus) {
  switch (status) {
    case 'submitted':
      return <Chip variant="default">SUBMITTED</Chip>
    case 'in_progress':
      return <Chip variant="highlight">IN PROGRESS</Chip>
    case 'escalated':
      return <Chip variant="danger">ESCALATED</Chip>
    case 'resolved':
      return <Chip variant="success">RESOLVED</Chip>
    case 'closed':
      return <Chip variant="default">CLOSED</Chip>
    default:
      return <Chip variant="default">{status.toUpperCase()}</Chip>
  }
}

export function PublicTrackerBoard({
  initialComplaints,
  domains,
}: PublicTrackerBoardProps) {
  const [complaints, setComplaints] = React.useState<Complaint[]>(initialComplaints)
  const [selectedDomain, setSelectedDomain] = React.useState<string>('all')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all')
  const [sortOrder, setSortOrder] = React.useState<'longest_pending' | 'most_upvoted' | 'newest'>('longest_pending')
  const [upvotingIds, setUpvotingIds] = React.useState<Set<string>>(new Set())
  const [now] = React.useState(() => Date.now())

  // Handle live upvote toggle
  const handleUpvote = async (complaintId: string) => {
    if (upvotingIds.has(complaintId)) return

    setUpvotingIds((prev) => new Set(prev).add(complaintId))

    // Optimistic UI update
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === complaintId) {
          const wasUpvoted = c.has_upvoted ?? false
          const currentCount = c.upvotes_count ?? 0
          return {
            ...c,
            has_upvoted: !wasUpvoted,
            upvotes_count: wasUpvoted ? Math.max(0, currentCount - 1) : currentCount + 1,
          }
        }
        return c
      })
    )

    try {
      const res = await toggleComplaintUpvote({ complaint_id: complaintId })
      if (!res.ok) {
        // Revert on failure
        setComplaints(initialComplaints)
      } else {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === complaintId
              ? { ...c, has_upvoted: res.data.upvoted, upvotes_count: res.data.count }
              : c
          )
        )
      }
    } catch {
      setComplaints(initialComplaints)
    } finally {
      setUpvotingIds((prev) => {
        const next = new Set(prev)
        next.delete(complaintId)
        return next
      })
    }
  }

  // Filter and sort complaints
  const filtered = complaints
    .filter((c) => {
      if (selectedDomain !== 'all' && c.domain_id !== selectedDomain) return false
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false
      return true
    })
    .sort((a, b) => {
      if (sortOrder === 'most_upvoted') {
        return (b.upvotes_count ?? 0) - (a.upvotes_count ?? 0)
      }
      if (sortOrder === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      // default: longest pending (oldest created first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  return (
    <div className="space-y-6">
      {/* Header controls & filters */}
      <Card className="bg-surface p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-muted shrink-0" />
            <span className="text-small font-semibold text-ink">Filters:</span>

            {/* Category / Domain Filter */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-small text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">All Domains</option>
              {domains
                .filter((d) => !d.sensitive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-small text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-ink-muted shrink-0" />
            <span className="text-small font-semibold text-ink">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-small text-ink focus:border-ink focus:outline-none font-medium"
            >
              <option value="longest_pending">Longest Pending (Default)</option>
              <option value="most_upvoted">Most Upvoted</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Complaints List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No grievances match the filter"
          description="Try selecting a different domain or status to view community complaints."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => {
            const daysPending = Math.floor(
              (now - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
            )

            const isResolvedOrClosed = item.status === 'resolved' || item.status === 'closed'

            return (
              <Card
                key={item.id}
                className="bg-surface hover:border-border-strong transition-all duration-150"
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(item.status)}
                      <span className="text-small font-semibold text-ink">
                        {item.domain?.name}
                      </span>
                      <span className="text-meta text-ink-muted">
                        • Level {item.current_level}
                      </span>

                      {!isResolvedOrClosed && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface-sunken px-2 py-0.5 text-meta text-ink-muted font-medium border border-border/40">
                          <Clock className="h-3 w-3" />
                          {daysPending === 0 ? 'Opened today' : `Pending ${daysPending}d`}
                        </span>
                      )}
                    </div>

                    {/* Upvote Button on Tracker Card */}
                    {!isResolvedOrClosed && (
                      <Button
                        size="sm"
                        variant={item.has_upvoted ? 'primary' : 'outline'}
                        className="gap-1.5 self-start sm:self-auto shrink-0"
                        onClick={() => handleUpvote(item.id)}
                        disabled={upvotingIds.has(item.id)}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${item.has_upvoted ? 'fill-current' : ''}`} />
                        <span>{item.upvotes_count ?? 0}</span>
                        <span className="hidden sm:inline">
                          {item.has_upvoted ? 'Upvoted' : 'Upvote'}
                        </span>
                      </Button>
                    )}
                  </div>

                  <Link href={`/complaints/${item.id}`} className="block group">
                    <h3 className="mt-2 text-h3 text-ink group-hover:text-ink-strong transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                  </Link>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-small text-ink-muted line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40 text-meta text-ink-muted">
                    <span>
                      {item.anonymous ? 'Anonymous Student' : item.author?.full_name ?? 'Student'}
                    </span>
                    <Link
                      href={`/complaints/${item.id}`}
                      className="font-medium text-ink hover:underline text-small"
                    >
                      View Details →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
