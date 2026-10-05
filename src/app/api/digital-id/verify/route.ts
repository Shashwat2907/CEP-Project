import { NextResponse } from 'next/server'
import { verifyDigitalIdTokenAction } from '@/features/digital-id/actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await verifyDigitalIdTokenAction(body)
    return NextResponse.json(result, { status: result.valid ? 200 : 400 })
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, status: 'tampered', message: err?.message || 'Invalid request body' },
      { status: 400 }
    )
  }
}
