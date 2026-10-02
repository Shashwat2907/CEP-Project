import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { notify } from '@/shared/notifications/notify'
import { addCalendarEntry, removeCalendarEntry } from '@/shared/calendar/calendar'
import { writeAudit } from '@/shared/audit/audit'
import { emitEvent } from '@/shared/outbox/outbox'
import { NotificationPopover, type NotificationItem } from '@/shared/ui/notification-popover'

describe('Shared Helper — notify() (CONTRACT.md §5.2)', () => {
  it('successfully creates notification with valid payload', async () => {
    const userId = crypto.randomUUID()
    const result = await notify({
      userId,
      type: 'meet.accepted',
      title: 'Session Confirmed',
      body: 'Office hour session with Prof. Sharma confirmed for 2 PM.',
      link: '/meet/sessions/123',
      payload: { sessionId: '123' },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.userId).toBe(userId)
      expect(result.data.type).toBe('meet.accepted')
      expect(result.data.title).toBe('Session Confirmed')
      expect(result.data.readAt).toBeNull()
      expect(result.data.id).toBeDefined()
    }
  })

  it('fails validation on invalid recipient UUID', async () => {
    const result = await notify({
      userId: 'not-a-valid-uuid',
      type: 'meet.accepted',
      title: 'Session Confirmed',
      body: 'Meeting scheduled.',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.message).toContain('Invalid user UUID')
    }
  })

  it('persists through Supabase client when provided', async () => {
    const userId = crypto.randomUUID()
    const mockRecord = {
      id: 'notif-uuid-1',
      user_id: userId,
      type: 'complaint.escalated',
      title: 'Complaint Escalated',
      body: 'Your complaint was escalated to Level 2.',
      link: '/complaints/45',
      payload: {},
      read_at: null,
      created_at: new Date().toISOString(),
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
          }),
        }),
      }),
    }

    const result = await notify(
      {
        userId,
        type: 'complaint.escalated',
        title: 'Complaint Escalated',
        body: 'Your complaint was escalated to Level 2.',
      },
      mockClient
    )

    expect(result.ok).toBe(true)
    expect(mockClient.from).toHaveBeenCalledWith('notifications')
  })
})

describe('Shared Helper — addCalendarEntry() & removeCalendarEntry() (CONTRACT.md §5.2)', () => {
  it('successfully creates calendar entry for valid source type', async () => {
    const userId = crypto.randomUUID()
    const startsAt = new Date().toISOString()
    const endsAt = new Date(Date.now() + 3600000).toISOString()

    const result = await addCalendarEntry({
      userId,
      sourceType: 'meet',
      sourceId: 'session-77',
      title: 'Doubt Clearing Session',
      location: 'Room 304, CS Block',
      startsAt,
      endsAt,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.userId).toBe(userId)
      expect(result.data.sourceType).toBe('meet')
      expect(result.data.sourceId).toBe('session-77')
    }
  })

  it('rejects entries where endsAt is before startsAt', async () => {
    const userId = crypto.randomUUID()
    const startsAt = '2026-10-02T16:00:00.000Z'
    const endsAt = '2026-10-02T15:00:00.000Z' // Before startsAt

    const result = await addCalendarEntry({
      userId,
      sourceType: 'personal',
      title: 'Study group',
      startsAt,
      endsAt,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(result.error.message).toContain('endsAt must be after or equal to startsAt')
    }
  })

  it('successfully handles removeCalendarEntry', async () => {
    const result = await removeCalendarEntry({
      sourceType: 'meet',
      sourceId: 'session-77',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.removed).toBe(true)
    }
  })
})

describe('Shared Helper — writeAudit() (CONTRACT.md §5.2)', () => {
  it('writes audit log record with actor and entity', async () => {
    const actorId = crypto.randomUUID()
    const result = await writeAudit({
      actorId,
      action: 'roster.imported',
      entity: 'roster_import',
      entityId: 'batch-2026',
      meta: { rowCount: 150 },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.actorId).toBe(actorId)
      expect(result.data.action).toBe('roster.imported')
      expect(result.data.meta).toEqual({ rowCount: 150 })
    }
  })

  it('fails validation when required action or entity is missing', async () => {
    const result = await writeAudit({
      action: '',
      entity: 'profiles',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
    }
  })
})

describe('Shared Helper — emitEvent() (CONTRACT.md §5.2)', () => {
  it('enqueues outbox event with payload', async () => {
    const result = await emitEvent({
      type: 'session.accepted',
      payload: { sessionId: '99', studentId: 'stu-1' },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('session.accepted')
      expect(result.data.payload).toEqual({ sessionId: '99', studentId: 'stu-1' })
      expect(result.data.processedAt).toBeNull()
    }
  })
})

describe('UI Component — NotificationPopover', () => {
  const sampleNotifications: NotificationItem[] = [
    {
      id: 't-1',
      type: 'meet.accepted',
      title: 'Lab Session Confirmed',
      body: 'Your lab session with Prof. Rao is confirmed.',
      read: false,
      createdAt: '5m ago',
    },
    {
      id: 't-2',
      type: 'complaint.resolved',
      title: 'Water Cooler Fixed',
      body: 'Grievance #52 has been resolved by maintenance.',
      read: true,
      createdAt: '1h ago',
    },
  ]

  it('renders trigger button with unread count badge', () => {
    render(<NotificationPopover notifications={sampleNotifications} />)

    const bellBtn = screen.getByRole('button', { name: /1 unread notifications/i })
    expect(bellBtn).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens dialog on click and displays notification items', () => {
    render(<NotificationPopover notifications={sampleNotifications} />)

    const bellBtn = screen.getByRole('button', { name: /unread notifications/i })
    fireEvent.click(bellBtn)

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Lab Session Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Water Cooler Fixed')).toBeInTheDocument()
  })

  it('marks all as read when button is clicked', () => {
    const handleMarkAll = vi.fn()
    render(
      <NotificationPopover
        notifications={sampleNotifications}
        onMarkAllAsRead={handleMarkAll}
      />
    )

    const bellBtn = screen.getByRole('button', { name: /unread notifications/i })
    fireEvent.click(bellBtn)

    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i })
    fireEvent.click(markAllBtn)

    expect(handleMarkAll).toHaveBeenCalled()
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument()
  })
})
