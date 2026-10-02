import { describe, it, expect } from 'vitest'
import {
  UploadResourceSchema,
  ApproveResourceSchema,
  RejectResourceSchema,
  ResourceFilterSchema,
} from '@/features/acad/schema'
import { NotifyInputSchema } from '@/shared/notifications/notify'


/**
 * Unit tests for the Academic Resources feature.
 * Source of truth: src/features/acad/README.md §9 (Edge Cases), §3 (Fields)
 * Per AGENTS.md §4: business rule validation is tested here.
 */

describe('UploadResourceSchema', () => {
  const validInput = {
    title:        'Data Structures Notes',
    subject_id:   '00000000-0000-0000-0002-000000000001',
    year:         2,
    branch:       'Computer Science',
    type:         'notes',
    file_ext:     'pdf',
    file_size_mb: 5,
  }

  it('accepts valid input', () => {
    const result = UploadResourceSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects a title shorter than 3 characters', () => {
    const result = UploadResourceSchema.safeParse({ ...validInput, title: 'AB' })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/3 characters/)
  })

  it('rejects an invalid file extension', () => {
    const result = UploadResourceSchema.safeParse({ ...validInput, file_ext: 'xlsx' })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/PDF, PPTX and DOCX/)
  })

  it('accepts all allowed extensions', () => {
    for (const ext of ['pdf', 'pptx', 'docx'] as const) {
      const result = UploadResourceSchema.safeParse({ ...validInput, file_ext: ext })
      expect(result.success).toBe(true)
    }
  })

  it('rejects year 0', () => {
    const result = UploadResourceSchema.safeParse({ ...validInput, year: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects year 5', () => {
    const result = UploadResourceSchema.safeParse({ ...validInput, year: 5 })
    expect(result.success).toBe(false)
  })

  it('rejects all four years 1–4 as valid', () => {
    for (const year of [1, 2, 3, 4]) {
      const result = UploadResourceSchema.safeParse({ ...validInput, year })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid resource type', () => {
    const result = UploadResourceSchema.safeParse({ ...validInput, type: 'video' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid resource types', () => {
    for (const type of ['notes', 'pyq', 'slides', 'other'] as const) {
      const result = UploadResourceSchema.safeParse({ ...validInput, type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects an invalid UUID for subject_id', () => {
    const result = UploadResourceSchema.safeParse({ ...validInput, subject_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/subject/)
  })
})

describe('ApproveResourceSchema', () => {
  it('accepts a valid UUID', () => {
    const result = ApproveResourceSchema.safeParse({
      resource_id: '00000000-0000-0000-0002-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing resource_id', () => {
    const result = ApproveResourceSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('RejectResourceSchema', () => {
  const validReject = {
    resource_id:      '00000000-0000-0000-0002-000000000001',
    rejection_reason: 'Duplicate of an existing approved resource.',
  }

  it('accepts valid reject input', () => {
    expect(RejectResourceSchema.safeParse(validReject).success).toBe(true)
  })

  it('rejects a reason shorter than 5 characters', () => {
    const result = RejectResourceSchema.safeParse({ ...validReject, rejection_reason: 'No' })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toMatch(/reason/)
  })

  it('rejects a reason longer than 500 characters', () => {
    const result = RejectResourceSchema.safeParse({
      ...validReject,
      rejection_reason: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe('ResourceFilterSchema', () => {
  it('accepts empty filter (browse all)', () => {
    expect(ResourceFilterSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a full filter', () => {
    const result = ResourceFilterSchema.safeParse({
      year:       2,
      branch:     'Computer Science',
      subject_id: '00000000-0000-0000-0002-000000000001',
      type:       'notes',
      query:      'data structures',
    })
    expect(result.success).toBe(true)
  })

  it('coerces year from string', () => {
    const result = ResourceFilterSchema.safeParse({ year: '2' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.year).toBe(2)
  })

  it('rejects a query longer than 100 characters', () => {
    const result = ResourceFilterSchema.safeParse({ query: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('Acad Notification Schemas (README.md §10)', () => {
  it('validates acad.resource_approved notification payload', () => {
    const payload = {
      userId: '00000000-0000-0000-0001-000000000001',
      type: 'acad.resource_approved',
      title: 'Resource Approved',
      body: 'Your resource "Data Structures Notes" has been approved and is now live.',
      link: '/acad',
      payload: {
        resourceId: '00000000-0000-0000-0002-000000000001',
        title: 'Data Structures Notes',
      },
    }
    const result = NotifyInputSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('validates acad.resource_rejected notification payload', () => {
    const payload = {
      userId: '00000000-0000-0000-0001-000000000001',
      type: 'acad.resource_rejected',
      title: 'Resource Rejected',
      body: 'Your resource "Data Structures Notes" was not approved: Incomplete notes',
      link: '/acad',
      payload: {
        resourceId: '00000000-0000-0000-0002-000000000001',
        title: 'Data Structures Notes',
        reason: 'Incomplete notes',
      },
    }
    const result = NotifyInputSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})

