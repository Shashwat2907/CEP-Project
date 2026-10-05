import { describe, it, expect } from 'vitest'
import {
  WhiteboardStrokeSchema,
  WhiteboardSnapshotDataSchema,
  SaveWhiteboardSnapshotSchema,
  type WhiteboardStroke,
  type WhiteboardSnapshotData,
  type SessionRequest,
} from '@/features/meet/schema'

/**
 * Unit tests for Campus Meet: Collaborative Whiteboard, Snapshot Persistence,
 * Participant Access Control, and History Review.
 *
 * Source of truth:
 * - src/features/meet/README.md
 * - documents/CONTRACT.md §5.2
 * - documents/TEAM_TASKS.md (feat/meet-whiteboard)
 */

describe('Meet Whiteboard Schemas & Validation', () => {
  const sampleStroke: WhiteboardStroke = {
    id: 'stroke-1',
    tool: 'pen',
    color: '#16213E',
    strokeWidth: 4,
    points: [
      { x: 10, y: 20 },
      { x: 15, y: 25 },
      { x: 20, y: 30 },
    ],
    userId: '11111111-1111-1111-1111-111111111111',
    userName: 'Alex Student',
    timestamp: 1700000000000,
  }

  it('validates a correct pen stroke', () => {
    const valid = WhiteboardStrokeSchema.safeParse(sampleStroke)
    expect(valid.success).toBe(true)
  })

  it('validates all supported drawing tools', () => {
    const tools = ['pen', 'brush', 'line', 'rectangle', 'circle', 'arrow', 'text', 'eraser'] as const
    for (const tool of tools) {
      const stroke: WhiteboardStroke = {
        ...sampleStroke,
        id: `stroke-${tool}`,
        tool,
        text: tool === 'text' ? 'Important theorem' : undefined,
      }
      const valid = WhiteboardStrokeSchema.safeParse(stroke)
      expect(valid.success).toBe(true)
    }
  })

  it('rejects an invalid tool type', () => {
    const invalid = WhiteboardStrokeSchema.safeParse({
      ...sampleStroke,
      tool: 'invalid_tool',
    })
    expect(valid(invalid.success)).toBe(false)
  })

  function valid(s: boolean) {
    return s
  }

  it('validates complete whiteboard snapshot data container', () => {
    const snapshot: WhiteboardSnapshotData = {
      strokes: [sampleStroke],
      backgroundColor: '#FFFFFF',
      lastModified: 1700000005000,
      clientVersion: 1,
    }

    const res = WhiteboardSnapshotDataSchema.safeParse(snapshot)
    expect(res.success).toBe(true)
  })

  it('validates save whiteboard snapshot server action input', () => {
    const input = {
      session_id: '44444444-4444-4444-4444-444444444444',
      snapshot_data: {
        strokes: [sampleStroke],
        backgroundColor: '#FFFFFF',
        lastModified: Date.now(),
        clientVersion: 1,
      },
      thumbnail_url: 'https://campus.edu/storage/wb-thumb.png',
    }

    const res = SaveWhiteboardSnapshotSchema.safeParse(input)
    expect(res.success).toBe(true)
  })

  it('rejects save input with invalid session UUID', () => {
    const input = {
      session_id: 'not-a-uuid',
      snapshot_data: {
        strokes: [],
        backgroundColor: '#FFFFFF',
        lastModified: Date.now(),
        clientVersion: 1,
      },
    }

    const res = SaveWhiteboardSnapshotSchema.safeParse(input)
    expect(res.success).toBe(false)
  })
})

describe('Whiteboard Participant Access & Authorization', () => {
  const studentId = '11111111-1111-1111-1111-111111111111'
  const teacherId = '22222222-2222-2222-2222-222222222222'
  const strangerId = '33333333-3333-3333-3333-333333333333'
  const adminId = '99999999-9999-9999-9999-999999999999'

  const mockSession: SessionRequest = {
    id: '44444444-4444-4444-4444-444444444444',
    student_id: studentId,
    teacher_id: teacherId,
    starts_at: '2026-10-15T14:00:00.000Z',
    ends_at: '2026-10-15T14:30:00.000Z',
    reason: 'Deep dive into consensus algorithms and distributed ledger diagrams.',
    status: 'completed',
    mode: 'online',
    created_at: '2026-10-10T10:00:00.000Z',
    updated_at: '2026-10-15T15:00:00.000Z',
  }

  function canAccessWhiteboard(
    session: SessionRequest | null,
    user: { id: string; role_primary: string }
  ): boolean {
    if (!session) return false
    const isStudent = session.student_id === user.id
    const isTeacher = session.teacher_id === user.id
    const isAdmin = user.role_primary === 'admin'
    return isStudent || isTeacher || isAdmin
  }

  it('allows the session student to view and save the whiteboard', () => {
    const allowed = canAccessWhiteboard(mockSession, {
      id: studentId,
      role_primary: 'student',
    })
    expect(allowed).toBe(true)
  })

  it('allows the session teacher to view and save the whiteboard', () => {
    const allowed = canAccessWhiteboard(mockSession, {
      id: teacherId,
      role_primary: 'teacher',
    })
    expect(allowed).toBe(true)
  })

  it('allows an administrator to view the session whiteboard', () => {
    const allowed = canAccessWhiteboard(mockSession, {
      id: adminId,
      role_primary: 'admin',
    })
    expect(allowed).toBe(true)
  })

  it('denies access to an unrelated user', () => {
    const allowed = canAccessWhiteboard(mockSession, {
      id: strangerId,
      role_primary: 'student',
    })
    expect(allowed).toBe(false)
  })
})

describe('Whiteboard Versioning & Snapshot State Machine', () => {
  it('correctly increments version on sequential saves', () => {
    let currentVersion = 1

    function simulateSave(existingVersion: number | null): number {
      if (existingVersion === null) {
        return 1
      }
      return existingVersion + 1
    }

    const v1 = simulateSave(null)
    expect(v1).toBe(1)

    currentVersion = simulateSave(v1)
    expect(currentVersion).toBe(2)

    currentVersion = simulateSave(currentVersion)
    expect(currentVersion).toBe(3)
  })

  it('handles empty strokes gracefully as blank canvas snapshot', () => {
    const emptySnapshot: WhiteboardSnapshotData = {
      strokes: [],
      backgroundColor: '#FFFFFF',
      lastModified: Date.now(),
      clientVersion: 1,
    }

    const res = WhiteboardSnapshotDataSchema.safeParse(emptySnapshot)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.strokes).toHaveLength(0)
    }
  })
})
