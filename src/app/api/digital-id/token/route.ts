import { NextResponse } from 'next/server'
import { getDigitalIdTokenAction } from '@/features/digital-id/actions'

export async function GET() {
  const result = await getDigitalIdTokenAction()
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Failed to issue token' }, { status: 400 })
  }
  return NextResponse.json(result.data)
}
