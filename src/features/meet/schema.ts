import { z } from 'zod'

/**
 * Zod schemas and TypeScript types for Campus Meet (Availability & Scheduling).
 * Source of truth: src/features/meet/README.md & documents/CONTRACT.md
 */

// ---------------------------------------------------------------------------
// 1. Core Model Schemas
// ---------------------------------------------------------------------------

export const SlotMinutesSchema = z.union([
  z.literal(15),
  z.literal(20),
  z.literal(30),
  z.literal(45),
  z.literal(60),
])
export type SlotMinutes = z.infer<typeof SlotMinutesSchema>

export const ExceptionKindSchema = z.enum(['blocked', 'extra'])
export type ExceptionKind = z.infer<typeof ExceptionKindSchema>

export const AvailabilityRuleSchema = z.object({
  id:           z.string().uuid(),
  teacher_id:   z.string().uuid(),
  weekday:      z.number().int().min(0).max(6), // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time:   z.string(), // "14:00:00" or "14:00"
  end_time:     z.string(), // "16:00:00" or "16:00"
  slot_minutes: SlotMinutesSchema.default(30),
  created_at:   z.string().optional(),
})
export type AvailabilityRule = z.infer<typeof AvailabilityRuleSchema>

export const AvailabilityExceptionSchema = z.object({
  id:         z.string().uuid(),
  teacher_id: z.string().uuid(),
  date:       z.string(), // YYYY-MM-DD
  start_time: z.string().nullable().optional(),
  end_time:   z.string().nullable().optional(),
  kind:       ExceptionKindSchema,
  reason:     z.string().nullable().optional(),
  created_at: z.string().optional(),
})
export type AvailabilityException = z.infer<typeof AvailabilityExceptionSchema>

// ---------------------------------------------------------------------------
// 2. Computed / Generated Slots
// ---------------------------------------------------------------------------

export const GeneratedSlotSchema = z.object({
  id:           z.string(), // deterministic unique slot key e.g. "teacher-date-14:00"
  teacher_id:   z.string().uuid(),
  date:         z.string(), // YYYY-MM-DD
  start_time:   z.string(), // "14:00"
  end_time:     z.string(), // "14:30"
  slot_minutes: z.number().int(),
  is_available: z.boolean(),
  override_type: z.enum(['regular', 'extra', 'blocked']).default('regular'),
})
export type GeneratedSlot = z.infer<typeof GeneratedSlotSchema>

// ---------------------------------------------------------------------------
// 3. Teacher Profile & Directory
// ---------------------------------------------------------------------------

export const TeacherSummarySchema = z.object({
  id:                z.string().uuid(),
  full_name:         z.string(),
  department:        z.string().nullable().optional(),
  office_hours_text: z.string().nullable().optional(),
  avatar_url:        z.string().nullable().optional(),
  email:             z.string().email().optional(),
})
export type TeacherSummary = z.infer<typeof TeacherSummarySchema>

// ---------------------------------------------------------------------------
// 4. Form Action Input Schemas
// ---------------------------------------------------------------------------

const TimeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/
const DateRegex = /^\d{4}-\d{2}-\d{2}$/

export const SaveAvailabilityRuleSchema = z
  .object({
    id:           z.string().uuid().optional(),
    weekday:      z.number().int().min(0).max(6),
    start_time:   z.string().regex(TimeRegex, 'Start time must be HH:MM'),
    end_time:     z.string().regex(TimeRegex, 'End time must be HH:MM'),
    slot_minutes: SlotMinutesSchema.default(30),
  })
  .refine(
    (data) => {
      const s = data.start_time.slice(0, 5)
      const e = data.end_time.slice(0, 5)
      return e > s
    },
    { message: 'End time must be later than start time', path: ['end_time'] }
  )
export type SaveAvailabilityRuleInput = z.infer<typeof SaveAvailabilityRuleSchema>

export const AddExceptionSchema = z
  .object({
    date:       z.string().regex(DateRegex, 'Date must be YYYY-MM-DD'),
    kind:       ExceptionKindSchema,
    start_time: z.string().regex(TimeRegex, 'Invalid time format').optional().nullable(),
    end_time:   z.string().regex(TimeRegex, 'Invalid time format').optional().nullable(),
    reason:     z.string().max(200, 'Reason too long').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time.slice(0, 5) > data.start_time.slice(0, 5)
      }
      return true
    },
    { message: 'End time must be later than start time', path: ['end_time'] }
  )
export type AddExceptionInput = z.infer<typeof AddExceptionSchema>

export const DeleteRuleSchema = z.object({
  rule_id: z.string().uuid(),
})
export type DeleteRuleInput = z.infer<typeof DeleteRuleSchema>

export const DeleteExceptionSchema = z.object({
  exception_id: z.string().uuid(),
})
export type DeleteExceptionInput = z.infer<typeof DeleteExceptionSchema>

// ---------------------------------------------------------------------------
// 5. Booking & Session Requests Models
// ---------------------------------------------------------------------------

export const SessionStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'offline_selected',
  'online_selected',
  'completed',
  'cancelled',
  'expired',
])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

export const SessionModeSchema = z.enum(['offline', 'online'])
export type SessionMode = z.infer<typeof SessionModeSchema>

export const SessionRequestSchema = z.object({
  id:             z.string().uuid(),
  student_id:     z.string().uuid(),
  teacher_id:     z.string().uuid(),
  starts_at:      z.string(),
  ends_at:        z.string(),
  reason:         z.string().min(20, 'Reason must be at least 20 characters'),
  status:         SessionStatusSchema,
  decline_reason: z.string().nullable().optional(),
  mode:           SessionModeSchema.nullable().optional(),
  location:       z.string().nullable().optional(),
  room_id:        z.string().nullable().optional(),
  created_at:     z.string(),
  updated_at:     z.string(),
  // Joined relational data
  student:        z.object({ full_name: z.string(), email: z.string().optional() }).optional(),
  teacher:        z.object({ full_name: z.string(), department: z.string().nullable().optional(), office_hours_text: z.string().nullable().optional() }).optional(),
})
export type SessionRequest = z.infer<typeof SessionRequestSchema>

export const CreateSessionRequestSchema = z
  .object({
    teacher_id: z.string().uuid(),
    starts_at:  z.string(),
    ends_at:    z.string(),
    reason:     z.string().min(20, 'Reason must be at least 20 characters').max(1000, 'Reason too long'),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: 'Session end time must be after start time',
    path: ['ends_at'],
  })
export type CreateSessionRequestInput = z.infer<typeof CreateSessionRequestSchema>

export const RespondSessionRequestSchema = z.object({
  session_id:     z.string().uuid(),
  action:         z.enum(['accept', 'decline']),
  decline_reason: z.string().max(500, 'Decline reason too long').optional(),
})
export type RespondSessionRequestInput = z.infer<typeof RespondSessionRequestSchema>

export const SelectSessionModeSchema = z.object({
  session_id: z.string().uuid(),
  mode:       SessionModeSchema,
})
export type SelectSessionModeInput = z.infer<typeof SelectSessionModeSchema>

export const CancelSessionRequestSchema = z.object({
  session_id:    z.string().uuid(),
  cancel_reason: z.string().max(500).optional(),
})
export type CancelSessionRequestInput = z.infer<typeof CancelSessionRequestSchema>

// ---------------------------------------------------------------------------
// 6. Action Result Container
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

// ---------------------------------------------------------------------------
// 7. Video Call & LiveKit Room Types
// ---------------------------------------------------------------------------

export type CallAccessErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_ONLINE_SESSION'
  | 'TOO_EARLY'
  | 'EXPIRED'
  | 'NOT_FOUND'

export type CallAccessResult =
  | {
      ok: true
      session: SessionRequest
      currentUserId: string
      userRole: 'teacher' | 'student' | 'admin'
      otherParticipantName: string
      otherParticipantRole: string
      roomName: string
      token: string
      serverUrl?: string
      isWindowActive: boolean
    }
  | {
      ok: false
      code: CallAccessErrorCode
      message: string
      startsAt?: string
      endsAt?: string
      session?: SessionRequest
    }

// ---------------------------------------------------------------------------
// 8. Whiteboard & Collaborative Canvas Types
// ---------------------------------------------------------------------------

export const WhiteboardPointSchema = z.object({
  x: z.number(),
  y: z.number(),
})
export type WhiteboardPoint = z.infer<typeof WhiteboardPointSchema>

export const WhiteboardToolSchema = z.enum([
  'pen',
  'brush',
  'line',
  'rectangle',
  'circle',
  'arrow',
  'text',
  'eraser',
])
export type WhiteboardTool = z.infer<typeof WhiteboardToolSchema>

export const WhiteboardStrokeSchema = z.object({
  id: z.string(),
  tool: WhiteboardToolSchema,
  color: z.string(),
  strokeWidth: z.number(),
  points: z.array(WhiteboardPointSchema),
  text: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  timestamp: z.number(),
})
export type WhiteboardStroke = z.infer<typeof WhiteboardStrokeSchema>

export const WhiteboardSnapshotDataSchema = z.object({
  strokes: z.array(WhiteboardStrokeSchema).default([]),
  backgroundColor: z.string().default('#FFFFFF'),
  lastModified: z.number().default(() => Date.now()),
  clientVersion: z.number().default(1),
})
export type WhiteboardSnapshotData = z.infer<typeof WhiteboardSnapshotDataSchema>

export const SaveWhiteboardSnapshotSchema = z.object({
  session_id: z.string().uuid(),
  snapshot_data: WhiteboardSnapshotDataSchema,
  thumbnail_url: z.string().optional().nullable(),
})
export type SaveWhiteboardSnapshotInput = z.infer<typeof SaveWhiteboardSnapshotSchema>

export const WhiteboardRecordSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  room_id: z.string(),
  snapshot_data: WhiteboardSnapshotDataSchema,
  thumbnail_url: z.string().nullable().optional(),
  version: z.number().int().positive(),
  saved_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type WhiteboardRecord = z.infer<typeof WhiteboardRecordSchema>


