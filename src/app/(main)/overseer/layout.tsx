import * as React from 'react'
import { requireRole } from '@/shared/auth/guards'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Campus Overseer Console',
  description: 'Manage campus discipline, attendance exceptions, and priority grievances.',
}

export default async function OverseerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole(['overseer', 'admin'])
  return <>{children}</>
}
