'use client'

import * as React from 'react'
import { CheckCircle2, Clock, AlertTriangle, ArrowUpRight, RotateCcw, FileText, User } from 'lucide-react'
import type { ComplaintEvent } from '../schema'

interface ComplaintTimelineProps {
  events: ComplaintEvent[]
}

function getEventIcon(type: string) {
  switch (type) {
    case 'submitted':
      return <FileText className="h-4 w-4 text-ink" />
    case 'assigned':
      return <User className="h-4 w-4 text-ink-muted" />
    case 'status_changed':
      return <Clock className="h-4 w-4 text-highlight" />
    case 'escalated':
      return <ArrowUpRight className="h-4 w-4 text-danger" />
    case 'resolved':
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case 'reopened':
      return <RotateCcw className="h-4 w-4 text-warning" />
    case 'closed':
      return <CheckCircle2 className="h-4 w-4 text-ink-muted" />
    default:
      return <Clock className="h-4 w-4 text-ink-muted" />
  }
}

export function ComplaintTimeline({ events }: ComplaintTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <p className="text-small text-ink-muted italic">No timeline events recorded yet.</p>
    )
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {events.map((evt) => {
        const timeFormatted = new Date(evt.created_at).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div key={evt.id} className="relative flex items-start gap-3">
            {/* Dot Icon */}
            <div className="absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-border shadow-xs">
              {getEventIcon(evt.type)}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-small font-semibold text-ink capitalize">
                  {evt.type.replace('_', ' ')}
                </span>
                <span className="text-meta text-ink-muted">{timeFormatted}</span>
              </div>

              {evt.actor?.full_name && (
                <p className="text-meta text-ink-muted">
                  By {evt.actor.full_name} ({evt.actor.role_primary})
                </p>
              )}

              {evt.note && (
                <p className="mt-1 rounded-md bg-surface-sunken p-2.5 text-small text-ink border border-border/50">
                  {evt.note}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
