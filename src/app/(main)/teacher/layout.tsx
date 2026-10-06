import * as React from 'react'
import { requireRole } from '@/shared/auth/guards'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Faculty Portal',
  description: 'Manage academic resources, approve student uploads, and organize classes.',
}

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole(['teacher', 'admin'])
  return <>{children}</>
}
