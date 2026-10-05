'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Chip } from '@/shared/ui/chip'
import { EmptyState } from '@/shared/ui/empty-state'
import { Calendar, Clock, Trash2, Plus, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import {
  saveAvailabilityRule,
  deleteAvailabilityRule,
  addAvailabilityException,
  deleteAvailabilityException,
} from '../actions'
import type { AvailabilityRule, AvailabilityException, SlotMinutes, ExceptionKind } from '../schema'

interface TeacherAvailabilityManagerProps {
  initialRules: AvailabilityRule[]
  initialExceptions: AvailabilityException[]
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function TeacherAvailabilityManager({
  initialRules,
  initialExceptions,
}: TeacherAvailabilityManagerProps) {
  const [rules, setRules] = React.useState<AvailabilityRule[]>(initialRules)
  const [exceptions, setExceptions] = React.useState<AvailabilityException[]>(initialExceptions)

  // Rule form state
  const [weekday, setWeekday] = React.useState<number>(1) // Monday
  const [startTime, setStartTime] = React.useState('14:00')
  const [endTime, setEndTime] = React.useState('16:00')
  const [slotMinutes, setSlotMinutes] = React.useState<SlotMinutes>(30)

  // Exception form state
  const [exceptionDate, setExceptionDate] = React.useState('')
  const [exceptionKind, setExceptionKind] = React.useState<ExceptionKind>('blocked')
  const [exceptionStartTime, setExceptionStartTime] = React.useState('')
  const [exceptionEndTime, setExceptionEndTime] = React.useState('')
  const [exceptionReason, setExceptionReason] = React.useState('')

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    setLoading(true)
    try {
      const res = await saveAvailabilityRule({
        weekday,
        start_time: startTime,
        end_time: endTime,
        slot_minutes: slotMinutes,
      })

      if (!res.ok) {
        setError(res.error.message)
      } else {
        setSuccess('Weekly schedule slot saved successfully.')
        setRules((prev) => [
          ...prev.filter(
            (r) => !(r.weekday === weekday && r.start_time.slice(0, 5) === startTime)
          ),
          {
            id: res.data.ruleId,
            teacher_id: '',
            weekday,
            start_time: startTime,
            end_time: endTime,
            slot_minutes: slotMinutes,
          },
        ].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await deleteAvailabilityRule({ rule_id: ruleId })
      if (!res.ok) {
        setError(res.error.message)
      } else {
        setRules((prev) => prev.filter((r) => r.id !== ruleId))
        setSuccess('Rule removed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!exceptionDate) {
      setError('Please select a date for the exception.')
      return
    }

    if (exceptionStartTime && exceptionEndTime && exceptionEndTime <= exceptionStartTime) {
      setError('Exception end time must be after start time.')
      return
    }

    setLoading(true)
    try {
      const res = await addAvailabilityException({
        date: exceptionDate,
        kind: exceptionKind,
        start_time: exceptionStartTime || undefined,
        end_time: exceptionEndTime || undefined,
        reason: exceptionReason || undefined,
      })

      if (!res.ok) {
        setError(res.error.message)
      } else {
        setSuccess(`Date override added for ${exceptionDate}.`)
        setExceptions((prev) => [
          ...prev,
          {
            id: res.data.exceptionId,
            teacher_id: '',
            date: exceptionDate,
            kind: exceptionKind,
            start_time: exceptionStartTime || null,
            end_time: exceptionEndTime || null,
            reason: exceptionReason || null,
          },
        ].sort((a, b) => a.date.localeCompare(b.date)))

        setExceptionDate('')
        setExceptionStartTime('')
        setExceptionEndTime('')
        setExceptionReason('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteException = async (exceptionId: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await deleteAvailabilityException({ exception_id: exceptionId })
      if (!res.ok) {
        setError(res.error.message)
      } else {
        setExceptions((prev) => prev.filter((e) => e.id !== exceptionId))
        setSuccess('Date override removed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-small text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-small text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 1. Weekly Recurring Availability */}
      <Card className="bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-h3">
            <Clock className="h-5 w-5 text-accent" /> Weekly Recurring Office Hours
          </CardTitle>
          <CardDescription>
            Define repeating weekly windows when students can book appointments with you.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* New Rule Form */}
          <form
            onSubmit={handleAddRule}
            className="grid gap-3 rounded-lg border border-border bg-surface-sunken p-4 sm:grid-cols-5 sm:items-end"
          >
            <div>
              <label className="mb-1 block text-meta font-medium text-ink">Weekday</label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-small text-ink focus:border-ink focus:outline-none"
              >
                {WEEKDAYS.map((day, idx) => (
                  <option key={day} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-meta font-medium text-ink">From</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-meta font-medium text-ink">To</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-meta font-medium text-ink">Slot Duration</label>
              <select
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value) as SlotMinutes)}
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-small text-ink focus:border-ink focus:outline-none"
              >
                <option value={15}>15 mins</option>
                <option value={20}>20 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
              </select>
            </div>

            <div>
              <Button type="submit" disabled={loading} className="w-full gap-1.5">
                <Plus className="h-4 w-4" /> Add Window
              </Button>
            </div>
          </form>

          {/* Active Rules List */}
          {rules.length === 0 ? (
            <EmptyState
              title="No recurring office hours configured"
              description="Add at least one weekly window above so students can discover bookable slots."
            />
          ) : (
            <div className="divide-y divide-border/40 rounded-lg border border-border bg-surface">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-small text-ink w-24">
                      {WEEKDAYS[r.weekday]}
                    </span>
                    <Chip variant="default" className="font-mono text-meta">
                      {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                    </Chip>
                    <span className="text-meta text-ink-muted">
                      ({r.slot_minutes} min slots)
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRule(r.id)}
                    disabled={loading}
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Date Exceptions & Holidays */}
      <Card className="bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-h3">
            <Calendar className="h-5 w-5 text-accent" /> Date Overrides & Leave Exceptions
          </CardTitle>
          <CardDescription>
            Block specific dates for holidays/leave or add extra slots for upcoming review days.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* New Exception Form */}
          <form
            onSubmit={handleAddException}
            className="grid gap-3 rounded-lg border border-border bg-surface-sunken p-4 sm:grid-cols-5 sm:items-end"
          >
            <div>
              <label className="mb-1 block text-meta font-medium text-ink">Date</label>
              <Input
                type="date"
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-meta font-medium text-ink">Type</label>
              <select
                value={exceptionKind}
                onChange={(e) => setExceptionKind(e.target.value as ExceptionKind)}
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-small text-ink focus:border-ink focus:outline-none"
              >
                <option value="blocked">Block (Leave/Holiday)</option>
                <option value="extra">Extra Slots</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-meta font-medium text-ink">
                Hours (Optional)
              </label>
              <div className="flex items-center gap-1">
                <Input
                  type="time"
                  placeholder="All day"
                  value={exceptionStartTime}
                  onChange={(e) => setExceptionStartTime(e.target.value)}
                />
                <span className="text-meta text-ink-muted">–</span>
                <Input
                  type="time"
                  placeholder="All day"
                  value={exceptionEndTime}
                  onChange={(e) => setExceptionEndTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-meta font-medium text-ink">
                Reason (Optional)
              </label>
              <Input
                placeholder="e.g. Conference, Viva"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <Button type="submit" disabled={loading} className="w-full gap-1.5">
                <Plus className="h-4 w-4" /> Save Override
              </Button>
            </div>
          </form>

          {/* Active Exceptions List */}
          {exceptions.length === 0 ? (
            <EmptyState
              title="No upcoming date overrides"
              description="Your weekly schedule will be active on all days without exceptions."
            />
          ) : (
            <div className="divide-y divide-border/40 rounded-lg border border-border bg-surface">
              {exceptions.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between p-3.5 hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-small text-ink w-28">
                      {ex.date}
                    </span>
                    <Chip
                      variant={ex.kind === 'blocked' ? 'danger' : 'success'}
                      className="capitalize"
                    >
                      {ex.kind === 'blocked' ? (
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> Blocked
                        </span>
                      ) : (
                        'Extra Slots'
                      )}
                    </Chip>

                    <span className="text-meta text-ink-muted">
                      {ex.start_time && ex.end_time
                        ? `${ex.start_time.slice(0, 5)} – ${ex.end_time.slice(0, 5)}`
                        : 'Whole Day'}
                    </span>

                    {ex.reason && (
                      <span className="text-meta text-ink-muted italic">
                        • {ex.reason}
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteException(ex.id)}
                    disabled={loading}
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
