import { describe, it, expect } from 'vitest'
import {
  signDigitalIdPayload,
  verifyDigitalIdSignature,
  DIGITAL_ID_TTL_SECONDS,
} from '@/features/digital-id/crypto'
import {
  VerifyTokenInputSchema,
  ManualLookupInputSchema,
  UpdateDigitalIdStatusSchema,
  DigitalIdPayloadSchema,
  CHECKPOINTS,
} from '@/features/digital-id/schema'

describe('Digital ID Cryptographic Token System (PLAN.MD §5.4, DESIGN.MD §8)', () => {
  const mockSubject = {
    sub: '11111111-2222-3333-4444-555555555555',
    collegeId: '23BCE1042',
    fullName: 'Shashwat Choudhary',
    photoUrl: null,
    role: 'student' as const,
    branch: 'Computer Science & Engineering',
    year: 3,
    division: 'A',
    batch: 'B1',
    digitalIdStatus: 'active' as const,
  }

  it('generates a signed compact token with strictly 30s TTL', () => {
    const startEpoch = 1700000000
    const { token, payload, expiresAt } = signDigitalIdPayload(mockSubject, {
      customIat: startEpoch,
    })

    expect(token).toBeDefined()
    expect(token.split('.')).toHaveLength(2)
    expect(payload.iat).toBe(startEpoch)
    expect(payload.exp).toBe(startEpoch + DIGITAL_ID_TTL_SECONDS)
    expect(payload.exp - payload.iat).toBe(30)
    expect(expiresAt.getTime()).toBe((startEpoch + 30) * 1000)
    expect(payload.collegeId).toBe('23BCE1042')
    expect(payload.nonce).toBeDefined()
    expect(payload.nonce.length).toBeGreaterThan(0)
  })

  it('verifies a valid token within the 30-second window', () => {
    const startEpoch = 1700000000
    const { token } = signDigitalIdPayload(mockSubject, { customIat: startEpoch })

    // Verify 10 seconds into the 30-second window
    const verifyEpoch = startEpoch + 10
    const result = verifyDigitalIdSignature(token, {
      currentTimeSeconds: verifyEpoch,
      toleranceSeconds: 0,
    })

    expect(result.valid).toBe(true)
    expect(result.status).toBe('valid')
    expect(result.payload?.collegeId).toBe('23BCE1042')
    expect(result.payload?.fullName).toBe('Shashwat Choudhary')
    expect(result.secondsRemaining).toBe(20)
  })

  it('rejects an expired token to enforce screenshot resistance', () => {
    const startEpoch = 1700000000
    const { token } = signDigitalIdPayload(mockSubject, { customIat: startEpoch })

    // Verify 36 seconds after issue (beyond 30s TTL + 5s default tolerance)
    const verifyEpoch = startEpoch + 36
    const result = verifyDigitalIdSignature(token, {
      currentTimeSeconds: verifyEpoch,
      toleranceSeconds: 5,
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe('expired')
    expect(result.message).toContain('expired')
    expect(result.expiredSecondsAgo).toBe(6)
  })

  it('detects payload tampering and signature mismatch', () => {
    const { token } = signDigitalIdPayload(mockSubject)
    const [payloadB64, sigB64] = token.split('.')

    // Decode, alter roll number, re-encode
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'))
    decoded.collegeId = '23BCE9999' // Forged roll number
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decoded))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    const forgedToken = `${tamperedPayloadB64}.${sigB64}`

    const result = verifyDigitalIdSignature(forgedToken)
    expect(result.valid).toBe(false)
    expect(result.status).toBe('tampered')
    expect(result.message).toContain('signature mismatch')
  })

  it('rejects malformed token strings gracefully', () => {
    expect(verifyDigitalIdSignature('').status).toBe('tampered')
    expect(verifyDigitalIdSignature('badtokenwithoutperiod').status).toBe('tampered')
    expect(verifyDigitalIdSignature('segment1.segment2.segment3').status).toBe('tampered')
    expect(verifyDigitalIdSignature('notbase64.fakeSig').status).toBe('tampered')
  })

  it('identifies revoked digital ID status in payload', () => {
    const startEpoch = 1700000000
    const { token } = signDigitalIdPayload(
      { ...mockSubject, digitalIdStatus: 'revoked' },
      { customIat: startEpoch }
    )

    const result = verifyDigitalIdSignature(token, {
      currentTimeSeconds: startEpoch + 5,
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe('revoked')
    expect(result.message).toContain('revoked')
  })

  it('identifies suspended digital ID status in payload', () => {
    const startEpoch = 1700000000
    const { token } = signDigitalIdPayload(
      { ...mockSubject, digitalIdStatus: 'suspended' },
      { customIat: startEpoch }
    )

    const result = verifyDigitalIdSignature(token, {
      currentTimeSeconds: startEpoch + 5,
    })

    expect(result.valid).toBe(false)
    expect(result.status).toBe('suspended')
    expect(result.message).toContain('suspended')
  })
})

describe('Digital ID Schema Validations', () => {
  it('validates checkpoints for verification desks', () => {
    expect(CHECKPOINTS).toContain('Main Gate')
    expect(CHECKPOINTS).toContain('Library')
    expect(CHECKPOINTS).toContain('Lost & Found Desk')

    const parsed = VerifyTokenInputSchema.safeParse({
      token: 'some.token',
      checkpoint: 'Exam Hall',
    })
    expect(parsed.success).toBe(true)

    const invalid = VerifyTokenInputSchema.safeParse({
      token: 'some.token',
      checkpoint: 'NonExistentGate',
    })
    expect(invalid.success).toBe(false)
  })

  it('validates manual lookup input with roll number', () => {
    const valid = ManualLookupInputSchema.safeParse({
      collegeId: '23BCE1042',
      checkpoint: 'Library',
    })
    expect(valid.success).toBe(true)

    const empty = ManualLookupInputSchema.safeParse({
      collegeId: '',
    })
    expect(empty.success).toBe(false)
  })

  it('validates status update input for admin instant revocation', () => {
    const validRevoke = UpdateDigitalIdStatusSchema.safeParse({
      userId: '11111111-2222-3333-4444-555555555555',
      status: 'revoked',
      reason: 'Disciplinary action',
    })
    expect(validRevoke.success).toBe(true)

    const invalidId = UpdateDigitalIdStatusSchema.safeParse({
      userId: 'not-a-uuid',
      status: 'revoked',
    })
    expect(invalidId.success).toBe(false)

    const invalidStatus = UpdateDigitalIdStatusSchema.safeParse({
      userId: '11111111-2222-3333-4444-555555555555',
      status: 'pending',
    })
    expect(invalidStatus.success).toBe(false)
  })

  it('enforces schema contract on DigitalIdPayload', () => {
    const validPayload = {
      sub: '11111111-2222-3333-4444-555555555555',
      collegeId: '23BCE1042',
      fullName: 'Shashwat Choudhary',
      photoUrl: null,
      role: 'student',
      branch: 'CSE',
      year: 3,
      division: 'A',
      batch: 'B1',
      digitalIdStatus: 'active',
      iat: 1700000000,
      exp: 1700000030,
      nonce: 'a1b2c3',
    }
    expect(DigitalIdPayloadSchema.safeParse(validPayload).success).toBe(true)
  })
})
