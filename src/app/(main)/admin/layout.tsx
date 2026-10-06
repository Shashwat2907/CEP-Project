import * as React from 'react'
import { requireRole } from '@/shared/auth/guards'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Governance Console',
  description: 'Campus Governance, Roster Management, Perimeter Zones, and Security Logs.',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole(['admin'])
  return <>{children}</>
}
