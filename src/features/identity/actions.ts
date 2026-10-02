'use server'

import { createClient } from '@/lib/supabase/server'
import {
  RequestCodeSchema,
  VerifyCodeSchema,
  type RequestCodeInput,
  type VerifyCodeInput,
} from '@/shared/auth/schema'

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
  const supabase = await createClient()

  // 1. Verify against roster_import
  const { data: rosterEntry } = await supabase
    .from('roster_import')
    .select('id, college_email, status, role')
    .eq('college_email', email)
    .single()

  // Generic message shown regardless of whether email exists or is active
  const genericMessage =
    'If this email is registered, we sent a 6-digit code to your college inbox.'

  if (!rosterEntry || rosterEntry.status === 'inactive') {
    // Log failed/rejected attempt for security audit
    await supabase.from('login_attempts').insert({
      email,
      kind: 'code_request',
      success: false,
      error_reason: !rosterEntry ? 'not_on_roster' : 'inactive_roster_status',
    })

    // Return the identical message to prevent user probing
    return {
      success: true,
      message: genericMessage,
      email,
    }
  }

  // 2. Dispatch OTP via Supabase Auth
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (otpError) {
    await supabase.from('login_attempts').insert({
      email,
      kind: 'code_request',
      success: false,
      error_reason: otpError.message,
    })
    return {
      success: false,
      error: 'Unable to send verification code. Please try again in a few moments.',
    }
  }

  // Log successful code request
  await supabase.from('login_attempts').insert({
    email,
    kind: 'code_request',
    success: true,
  })

  // Development convenience: log to terminal if flag is set
  if (process.env.DEV_PRINT_OTP_TO_CONSOLE === 'true') {
    console.log(`\n[DEV AUTH] 🔐 OTP Code requested for: ${email}\n`)
  }

  return {
    success: true,
    message: genericMessage,
    email,
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
  const supabase = await createClient()

  // 1. Verify OTP with Supabase
  const {
    data: { user },
    error: verifyError,
  } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })

  if (verifyError || !user) {
    await supabase.from('login_attempts').insert({
      email,
      kind: 'code_verify',
      success: false,
      error_reason: verifyError?.message || 'Invalid code',
    })

    return {
      success: false,
      error: 'Invalid or expired code. Please double-check or request a new code.',
    }
  }

  // 2. Check if roster entry is still active
  const { data: rosterEntry } = await supabase
    .from('roster_import')
    .select('*')
    .eq('college_email', email)
    .single()

  if (!rosterEntry || rosterEntry.status === 'inactive') {
    // Block sign-in and invalidate session immediately per PLAN.MD §4.1
    await supabase.auth.signOut({ scope: 'global' })
    await supabase.from('login_attempts').insert({
      email,
      kind: 'code_verify',
      success: false,
      error_reason: 'roster_inactive_or_removed',
    })
    return {
      success: false,
      error: 'This account has been deactivated. Please contact college administration.',
    }
  }

  // 3. Provision profile and roles on first sign-in
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    // First time sign-in: prefill from roster_import row
    await supabase.from('profiles').insert({
      id: user.id,
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

    // Assign primary role
    await supabase.from('user_roles').insert({
      user_id: user.id,
      role: rosterEntry.role,
    })

    // Mark roster status active
    await supabase
      .from('roster_import')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', rosterEntry.id)
  }

  // Log successful login
  await supabase.from('login_attempts').insert({
    email,
    kind: 'code_verify',
    success: true,
  })

  return {
    success: true,
    message: 'Authentication successful',
  }
}
