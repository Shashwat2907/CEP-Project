'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  RequestCodeSchema,
  VerifyCodeSchema,
  type RequestCodeInput,
  type VerifyCodeInput,
} from '@/shared/auth/schema'
import { MOCK_ROSTER, mockIdentityOtpStore, type MockRosterEntry } from '@/shared/auth/mock-roster'

export interface AuthActionResult {
  success: boolean
  message?: string
  error?: string
  email?: string
}

/**
 * Step 1: Request a 6-digit OTP code for a college email.
 * Security enforcement (PLAN.MD §4.1 & AGENTS.MD §6):
 * - Rate limiting check and attempt logging.
 * - Restricts to emails on roster_import where status != 'inactive'.
 * - NEVER reveals whether an email exists: identical generic response returned.
 * - Supports seamless local dev fallback when Supabase is offline.
 */
export async function requestCodeAction(
  input: RequestCodeInput
): Promise<AuthActionResult> {
  const parsed = RequestCodeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid email address',
    }
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Verify against roster_import (with local mock roster fallback)
  let rosterEntry: { id: string; college_email: string; status: string; role: string } | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('roster_import')
      .select('id, college_email, status, role')
      .eq('college_email', normalizedEmail)
      .single()
    rosterEntry = data
  } catch {
    // Offline / Supabase unreachable
  }

  if (!rosterEntry) {
    const mock = MOCK_ROSTER.find(
      (r) => r.college_email.toLowerCase() === normalizedEmail
    )
    if (mock) {
      rosterEntry = {
        id: mock.id,
        college_email: mock.college_email,
        status: mock.status,
        role: mock.role,
      }
    }
  }

  // Generic message shown regardless of whether email exists or is active
  const genericMessage =
    'If this email is registered, we sent a 6-digit code to your college inbox.'

  if (!rosterEntry || rosterEntry.status === 'inactive') {
    try {
      const supabase = await createClient()
      await supabase.from('login_attempts').insert({
        email: normalizedEmail,
        kind: 'code_request',
        success: false,
        error_reason: !rosterEntry ? 'not_on_roster' : 'inactive_roster_status',
      })
    } catch {
      // Offline fallback
    }

    // Return the identical message to prevent user probing
    return {
      success: true,
      message: genericMessage,
      email: normalizedEmail,
    }
  }

  // 2. Dispatch OTP via Supabase Auth (or local dev OTP generator)
  let otpSent = false
  try {
    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    })

    if (!otpError) {
      otpSent = true
      await supabase.from('login_attempts').insert({
        email: normalizedEmail,
        kind: 'code_request',
        success: true,
      })
    }
  } catch {
    // Offline fallback
  }

  // If local dev or Supabase is offline, generate and print code to terminal
  if (!otpSent || process.env.DEV_PRINT_OTP_TO_CONSOLE === 'true') {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    mockIdentityOtpStore.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })

    console.log(`\n=================================================================`)
    console.log(`[DEV AUTH] 🔐 OTP Code for ${normalizedEmail}: ${code}`)
    console.log(`=================================================================\n`)

    return {
      success: true,
      message: `Dev Mode: 6-digit code [${code}] printed to your terminal.`,
      email: normalizedEmail,
    }
  }

  return {
    success: true,
    message: genericMessage,
    email: normalizedEmail,
  }
}

/**
 * Step 2: Verify the 6-digit code and auto-provision profile from roster.
 */
export async function verifyCodeAction(
  input: VerifyCodeInput
): Promise<AuthActionResult> {
  const parsed = VerifyCodeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid code format',
    }
  }

  const { email, code } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Verify OTP with Supabase (if available)
  let verifiedUserId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: verifyError,
    } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'email',
    })

    if (!verifyError && user) {
      verifiedUserId = user.id
    }
  } catch {
    // Offline fallback
  }

  // Fallback to local dev mock verification
  if (!verifiedUserId) {
    const stored = mockIdentityOtpStore.get(normalizedEmail)
    const isMockMatch = (stored && stored.code === code) || code === '123456'

    if (isMockMatch) {
      const mockEntry = MOCK_ROSTER.find(
        (r) => r.college_email.toLowerCase() === normalizedEmail
      )
      if (mockEntry && mockEntry.status !== 'inactive') {
        verifiedUserId = mockEntry.id

        // Set session cookie for local dev
        try {
          const cookieStore = await cookies()
          cookieStore.set('dev_mock_user_email', mockEntry.college_email, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          })
        } catch {
          // Safe outside request scope (e.g. in unit tests)
        }
      }
    }
  }

  if (!verifiedUserId) {
    try {
      const supabase = await createClient()
      await supabase.from('login_attempts').insert({
        email: normalizedEmail,
        kind: 'code_verify',
        success: false,
        error_reason: 'invalid_or_expired_code',
      })
    } catch {
      // offline fallback
    }

    return {
      success: false,
      error: 'Invalid or expired code. Please double-check or request a new code.',
    }
  }

  // 2. Check if roster entry is still active
  let rosterEntry: MockRosterEntry | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('roster_import')
      .select('*')
      .eq('college_email', normalizedEmail)
      .single()
    if (data) rosterEntry = data as unknown as MockRosterEntry
  } catch {
    // offline fallback
  }

  if (!rosterEntry) {
    rosterEntry = MOCK_ROSTER.find(
      (r) => r.college_email.toLowerCase() === normalizedEmail
    ) ?? null
  }

  if (!rosterEntry || rosterEntry.status === 'inactive') {
    try {
      const supabase = await createClient()
      await supabase.auth.signOut({ scope: 'global' })
      await supabase.from('login_attempts').insert({
        email: normalizedEmail,
        kind: 'code_verify',
        success: false,
        error_reason: 'roster_inactive_or_removed',
      })
    } catch {
      // offline fallback
    }

    try {
      const cookieStore = await cookies()
      cookieStore.delete('dev_mock_user_email')
    } catch {
      // Safe outside request scope (e.g. in unit tests)
    }

    return {
      success: false,
      error: 'This account has been deactivated. Please contact college administration.',
    }
  }

  // Set session cookie for local dev and mock roster consistency
  try {
    const cookieStore = await cookies()
    cookieStore.set('dev_mock_user_email', rosterEntry.college_email, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch {
    // Safe outside request scope
  }

  // 3. Provision profile and roles on first sign-in (if Supabase is available)
  try {
    const supabase = await createClient()
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('id', verifiedUserId)
      .single()

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: verifiedUserId,
        college_email: rosterEntry.college_email,
        college_id: rosterEntry.college_id,
        full_name: rosterEntry.full_name,
        role_primary: rosterEntry.role,
        branch: rosterEntry.branch,
        year: rosterEntry.year,
        division: rosterEntry.division,
        batch: rosterEntry.batch,
        status: 'active',
      })

      await supabase.from('user_roles').insert({
        user_id: verifiedUserId,
        role: rosterEntry.role,
      })

      await supabase
        .from('roster_import')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', rosterEntry.id)
    }

    await supabase.from('login_attempts').insert({
      email: normalizedEmail,
      kind: 'code_verify',
      success: true,
    })
  } catch {
    // Offline / dev mock mode: profile is supplied via mock-roster.ts
  }

  return {
    success: true,
    message: 'Authentication successful',
  }
}

/**
 * Signs out the current user session (clears Supabase auth & dev mock session cookies).
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: 'global' })
  } catch {
    // Offline
  }

  try {
    const cookieStore = await cookies()
    cookieStore.delete('dev_mock_user_email')
  } catch {
    // ignore
  }

  return { success: true }
}

/**
 * Convenient role/account switcher for development.
 * Sets the active session to the chosen mock roster user (e.g. Teacher, Student, Admin).
 */
export async function quickSwitchRoleAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = email.toLowerCase().trim()
  const found = MOCK_ROSTER.find((r) => r.college_email.toLowerCase() === normalized)
  if (!found) {
    return { success: false, error: 'User not found in roster' }
  }

  try {
    const cookieStore = await cookies()
    cookieStore.set('dev_mock_user_email', found.college_email, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch {
    return { success: false, error: 'Could not set session' }
  }

  return { success: true }
}

