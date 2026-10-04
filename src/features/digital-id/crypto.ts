import crypto from 'crypto'
import {
  DigitalIdPayload,
  DigitalIdPayloadSchema,
  VerificationStatus,
} from './schema'

export const DIGITAL_ID_TTL_SECONDS = 30
export const DIGITAL_ID_DRIFT_TOLERANCE_SECONDS = 5

function getSecretKey(): string {
  return process.env.DIGITAL_ID_SECRET || 'cep-campus-digital-id-secret-salt-2026-production'
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromBase64Url(str: string): Buffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64')
}

/**
 * Creates a signed compact token string for a Digital ID payload.
 * Validity is strictly 30 seconds per PLAN.md §5.4 and DESIGN.MD §8.
 */
export function signDigitalIdPayload(
  payloadData: Omit<DigitalIdPayload, 'iat' | 'exp' | 'nonce'>,
  options?: { customTtlSeconds?: number; customIat?: number }
): { token: string; payload: DigitalIdPayload; expiresAt: Date } {
  const iat = options?.customIat ?? Math.floor(Date.now() / 1000)
  const ttl = options?.customTtlSeconds ?? DIGITAL_ID_TTL_SECONDS
  const exp = iat + ttl
  const nonce = crypto.randomBytes(6).toString('hex')

  const fullPayload: DigitalIdPayload = {
    ...payloadData,
    iat,
    exp,
    nonce,
  }

  const payloadBuffer = Buffer.from(JSON.stringify(fullPayload), 'utf8')
  const payloadB64 = toBase64Url(payloadBuffer)

  const hmac = crypto.createHmac('sha256', getSecretKey())
  hmac.update(payloadB64)
  const signatureB64 = toBase64Url(hmac.digest())

  const token = `${payloadB64}.${signatureB64}`

  return {
    token,
    payload: fullPayload,
    expiresAt: new Date(exp * 1000),
  }
}

export interface VerifyCryptoResult {
  valid: boolean
  status: VerificationStatus
  message: string
  payload?: DigitalIdPayload
  secondsRemaining?: number
  expiredSecondsAgo?: number
}

/**
 * Verifies the cryptographic signature, structure, and expiration of a digital ID token string.
 */
export function verifyDigitalIdSignature(
  token: string,
  options?: { currentTimeSeconds?: number; toleranceSeconds?: number }
): VerifyCryptoResult {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      status: 'tampered',
      message: 'Empty or invalid token format.',
    }
  }

  const parts = token.trim().split('.')
  if (parts.length !== 2) {
    return {
      valid: false,
      status: 'tampered',
      message: 'Malformed token structure. Expected two segments.',
    }
  }

  const [payloadB64, receivedSigB64] = parts

  // 1. Verify HMAC-SHA256 signature with timing-safe comparison
  const hmac = crypto.createHmac('sha256', getSecretKey())
  hmac.update(payloadB64)
  const expectedSigBuffer = hmac.digest()
  const receivedSigBuffer = fromBase64Url(receivedSigB64)

  if (
    expectedSigBuffer.length !== receivedSigBuffer.length ||
    !crypto.timingSafeEqual(expectedSigBuffer, receivedSigBuffer)
  ) {
    return {
      valid: false,
      status: 'tampered',
      message: 'Cryptographic signature mismatch. Token is counterfeit or modified.',
    }
  }

  // 2. Decode and parse payload JSON
  let rawParsed: unknown
  try {
    const jsonStr = fromBase64Url(payloadB64).toString('utf8')
    rawParsed = JSON.parse(jsonStr)
  } catch {
    return {
      valid: false,
      status: 'tampered',
      message: 'Token payload contains invalid JSON data.',
    }
  }

  const schemaResult = DigitalIdPayloadSchema.safeParse(rawParsed)
  if (!schemaResult.success) {
    return {
      valid: false,
      status: 'tampered',
      message: 'Token payload does not conform to digital ID schema.',
    }
  }

  const payload = schemaResult.data
  const now = options?.currentTimeSeconds ?? Math.floor(Date.now() / 1000)
  const tolerance = options?.toleranceSeconds ?? DIGITAL_ID_DRIFT_TOLERANCE_SECONDS

  // 3. Expiration verification (strictly 30s window + tolerance)
  if (now > payload.exp + tolerance) {
    const expiredAgo = now - payload.exp
    return {
      valid: false,
      status: 'expired',
      message: `Token expired ${expiredAgo}s ago. Please ask student to refresh their digital ID.`,
      payload,
      expiredSecondsAgo: expiredAgo,
    }
  }

  // 4. Token payload status checks
  if (payload.digitalIdStatus === 'revoked') {
    return {
      valid: false,
      status: 'revoked',
      message: 'Digital ID is marked as revoked.',
      payload,
      secondsRemaining: Math.max(0, payload.exp - now),
    }
  }

  if (payload.digitalIdStatus === 'suspended') {
    return {
      valid: false,
      status: 'suspended',
      message: 'Digital ID is currently suspended.',
      payload,
      secondsRemaining: Math.max(0, payload.exp - now),
    }
  }

  return {
    valid: true,
    status: 'valid',
    message: 'Valid digital ID token verified.',
    payload,
    secondsRemaining: Math.max(0, payload.exp - now),
  }
}
