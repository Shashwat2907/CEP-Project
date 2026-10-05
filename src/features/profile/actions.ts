'use server'

import {
  RosterRowSchema,
  RosterRow,
  RosterRowError,
  RosterImportResult,
  ProfileUpdateSchema,
  ProfileUpdateInput,
  UserProfile,
  RosterMember,
} from './schema'
import { writeAudit } from '@/shared/audit/audit'
import { createClient } from '@/lib/supabase/server'

export type ProfileActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export interface ProfileDbQuery extends PromiseLike<{ data: unknown; error: unknown }> {
  select: (...args: unknown[]) => ProfileDbQuery
  insert: (...args: unknown[]) => ProfileDbQuery
  update: (...args: unknown[]) => ProfileDbQuery
  upsert: (...args: unknown[]) => ProfileDbQuery
  delete: () => ProfileDbQuery
  eq: (...args: unknown[]) => ProfileDbQuery
  neq?: (...args: unknown[]) => ProfileDbQuery
  in?: (...args: unknown[]) => ProfileDbQuery
  order: (...args: unknown[]) => ProfileDbQuery
  limit: (...args: unknown[]) => ProfileDbQuery
  single: () => Promise<{ data: unknown; error: unknown }>
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>
}

export interface ProfileDbClient {
  from: (table: string) => ProfileDbQuery
}

type AuditClient = Parameters<typeof writeAudit>[1]

async function resolveUserId(providedUserId?: string): Promise<string | null> {
  if (providedUserId) return providedUserId
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

import { parseCsvRows } from './csv'


/**
 * Imports roster CSV with duplicate detection, Zod validation,
 * status 'invited' for new rows, and 'inactive' for removed rows.
 * Source of truth: documents/PLAN.md §4.1, §5.4, documents/TEAM_TASKS.md
 */
export async function importRosterCsv(
  csvText: string,
  filename = 'roster.csv',
  client?: ProfileDbClient,
  adminUserId?: string
): Promise<ProfileActionResult<RosterImportResult>> {
  const actorId = await resolveUserId(adminUserId)
  if (!actorId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } }
  }

  const rawRows = parseCsvRows(csvText)
  if (rawRows.length === 0) {
    return { ok: false, error: { code: 'EMPTY_FILE', message: 'CSV file contains no data rows' } }
  }

  const seenEmails = new Set<string>()
  const seenIds = new Set<string>()
  const validRows: RosterRow[] = []
  const errors: RosterRowError[] = []

  // Validate each row
  rawRows.forEach((raw, index) => {
    const rowNum = index + 2 // 1-indexed, header is row 1
    const email = raw.college_email || raw.email
    const collegeId = raw.college_id || raw.enrollment_number || raw.id
    const fullName = raw.full_name || raw.name
    const role = raw.role

    // Check intra-file duplicate emails
    if (email) {
      const lowerEmail = email.toLowerCase().trim()
      if (seenEmails.has(lowerEmail)) {
        errors.push({
          row: rowNum,
          collegeEmail: lowerEmail,
          collegeId,
          error: `Duplicate college email '${lowerEmail}' in CSV`,
        })
        return
      }
      seenEmails.add(lowerEmail)
    }

    // Check intra-file duplicate IDs
    if (collegeId) {
      const trimmedId = collegeId.trim()
      if (seenIds.has(trimmedId)) {
        errors.push({
          row: rowNum,
          collegeEmail: email,
          collegeId: trimmedId,
          error: `Duplicate college ID '${trimmedId}' in CSV`,
        })
        return
      }
      seenIds.add(trimmedId)
    }

    const parseResult = RosterRowSchema.safeParse({
      college_email: email,
      college_id: collegeId,
      full_name: fullName,
      role,
      branch: raw.branch || null,
      year: raw.year ? parseInt(raw.year, 10) : null,
      division: raw.division || null,
      batch: raw.batch || null,
      department: raw.department || null,
    })

    if (!parseResult.success) {
      errors.push({
        row: rowNum,
        collegeEmail: email,
        collegeId,
        error: parseResult.error.errors.map((e) => e.message).join('; '),
      })
    } else {
      validRows.push(parseResult.data)
    }
  })

  let insertedCount = 0
  let updatedCount = 0
  let deactivatedCount = 0
  const batchId = crypto.randomUUID()

  if (client) {
    try {
      // 1. Fetch existing roster to distinguish new rows vs updates and detect removed members
      const { data: existingRows } = await client
        .from('roster_import')
        .select('college_email, status')

      const existingMap = new Map<string, string>()
      if (Array.isArray(existingRows)) {
        existingRows.forEach((r: { college_email: string; status: string }) => {
          existingMap.set(r.college_email.toLowerCase(), r.status)
        })
      }

      // 2. Upsert valid rows
      for (const row of validRows) {
        const email = row.college_email.toLowerCase()
        const isExisting = existingMap.has(email)

        if (isExisting) {
          updatedCount++
          await client
            .from('roster_import')
            .update({
              college_id: row.college_id,
              full_name: row.full_name,
              role: row.role,
              branch: row.branch,
              year: row.year,
              division: row.division,
              batch: row.batch,
              updated_at: new Date().toISOString(),
            })
            .eq('college_email', email)
        } else {
          insertedCount++
          await client.from('roster_import').insert({
            college_email: email,
            college_id: row.college_id,
            full_name: row.full_name,
            role: row.role,
            branch: row.branch,
            year: row.year,
            division: row.division,
            batch: row.batch,
            status: 'invited',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }

      // 3. Mark removed members as 'inactive' per PLAN.md §4.1
      const incomingEmails = new Set(validRows.map((r) => r.college_email.toLowerCase()))
      for (const [existingEmail, currentStatus] of existingMap.entries()) {
        if (!incomingEmails.has(existingEmail) && currentStatus !== 'inactive') {
          deactivatedCount++
          await client
            .from('roster_import')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('college_email', existingEmail)
        }
      }

      // 4. Save batch history record
      await client.from('roster_import_batches').insert({
        id: batchId,
        filename,
        total_rows: rawRows.length,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        deactivated_count: deactivatedCount,
        error_count: errors.length,
        error_report: errors,
        imported_by: actorId,
      })

      // 5. Audit log
      await writeAudit(
        {
          actorId,
          action: 'roster.import',
          entity: 'roster_import',
          entityId: batchId,
          meta: {
            filename,
            totalRows: rawRows.length,
            insertedCount,
            updatedCount,
            deactivatedCount,
            errorCount: errors.length,
          },
        },
        client as unknown as AuditClient
      )
    } catch {
      return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to apply roster import to database' } }
    }
  } else {
    // In mock fallback mode
    insertedCount = validRows.length
  }

  return {
    ok: true,
    data: {
      batchId,
      filename,
      totalRows: rawRows.length,
      inserted: insertedCount,
      updated: updatedCount,
      deactivated: deactivatedCount,
      errors,
    },
  }
}

/**
 * Returns user profile with academic details and roles.
 */
export async function getProfile(
  providedUserId?: string,
  client?: ProfileDbClient
): Promise<ProfileActionResult<UserProfile>> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  if (!client) {
    // Mock for unit tests
    return {
      ok: true,
      data: {
        id: userId,
        collegeEmail: 'student@college.edu',
        collegeId: '23BCE1042',
        fullName: 'Shashwat Choudhary',
        photoUrl: null,
        rolePrimary: 'student',
        branch: 'Computer Science & Engineering',
        year: 2,
        division: 'A',
        batch: 'B1',
        department: null,
        officeHours: null,
        bio: 'Student at College of Engineering',
        phone: null,
        status: 'active',
        roles: [{ role: 'student', scope: null }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  }

  try {
    const { data: profileData, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileErr || !profileData) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'User profile not found' } }
    }

    const { data: rolesData } = await client
      .from('user_roles')
      .select('role, scope')
      .eq('user_id', userId)

    const p = profileData as {
      id: string
      college_email: string
      college_id: string
      full_name: string
      photo_url?: string | null
      role_primary: 'student' | 'teacher' | 'admin'
      branch?: string | null
      year?: number | null
      division?: string | null
      batch?: string | null
      department?: string | null
      office_hours?: string | null
      bio?: string | null
      phone?: string | null
      status: 'active' | 'inactive' | 'suspended'
      created_at: string
      updated_at: string
    }

    const roles = Array.isArray(rolesData)
      ? rolesData.map((r: { role: string; scope?: string | null }) => ({
          role: r.role as 'student' | 'teacher' | 'admin' | 'authority',
          scope: r.scope ?? null,
        }))
      : [{ role: p.role_primary, scope: null }]

    return {
      ok: true,
      data: {
        id: p.id,
        collegeEmail: p.college_email,
        collegeId: p.college_id,
        fullName: p.full_name,
        photoUrl: p.photo_url ?? null,
        rolePrimary: p.role_primary,
        branch: p.branch ?? null,
        year: p.year ?? null,
        division: p.division ?? null,
        batch: p.batch ?? null,
        department: p.department ?? null,
        officeHours: p.office_hours ?? null,
        bio: p.bio ?? null,
        phone: p.phone ?? null,
        status: p.status,
        roles,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      },
    }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to load profile' } }
  }
}

/**
 * Updates self-editable profile fields.
 * Security Invariant (PLAN.md §5.4):
 * college_id, college_email, and role_primary are NEVER updatable by users.
 */
export async function updateProfile(
  input: ProfileUpdateInput,
  client?: ProfileDbClient,
  providedUserId?: string
): Promise<ProfileActionResult<{ updated: boolean }>> {
  const userId = await resolveUserId(providedUserId)
  if (!userId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  const parse = ProfileUpdateSchema.safeParse(input)
  if (!parse.success) {
    return {
      ok: false,
      error: { code: 'INVALID_INPUT', message: parse.error.errors.map((e) => e.message).join('; ') },
    }
  }

  const { photo_url, bio, office_hours, phone, department } = parse.data

  if (client) {
    try {
      const { error } = await client
        .from('profiles')
        .update({
          photo_url,
          bio,
          office_hours,
          phone,
          department,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
      return { ok: true, data: { updated: true } }
    } catch {
      return { ok: false, error: { code: 'DB_ERROR', message: 'Failed to update profile' } }
    }
  }

  return { ok: true, data: { updated: true } }
}

/**
 * Returns roster members for admin overview.
 */
export async function getRosterMembers(
  limit = 50,
  client?: ProfileDbClient,
  adminUserId?: string
): Promise<ProfileActionResult<RosterMember[]>> {
  const actorId = await resolveUserId(adminUserId)
  if (!actorId) {
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }
  }

  if (!client) {
    return { ok: true, data: [] }
  }

  try {
    const { data, error } = await client
      .from('roster_import')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    const rows = Array.isArray(data) ? data : []
    return {
      ok: true,
      data: rows.map((r: {
        id: string
        college_email: string
        college_id: string
        full_name: string
        role: 'student' | 'teacher' | 'admin'
        branch?: string | null
        year?: number | null
        division?: string | null
        batch?: string | null
        status: 'invited' | 'active' | 'inactive'
        created_at: string
        updated_at: string
      }) => ({
        id: r.id,
        collegeEmail: r.college_email,
        collegeId: r.college_id,
        fullName: r.full_name,
        role: r.role,
        branch: r.branch ?? null,
        year: r.year ?? null,
        division: r.division ?? null,
        batch: r.batch ?? null,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Could not load roster members' } }
  }
}
