'use client'

import * as React from 'react'
import { AppShell } from '@/shared/ui/app-shell'
import { AdminIdManagement } from '@/features/digital-id/components/admin-id-management'

export default function AdminDigitalIdPage() {
  return (
    <AppShell
      initialRole="admin"
      userName="Admin User"
      identifier="ADM-001"
      department="Campus Security & Administration"
      userEmail="admin@college.edu"
      activePath="/admin/digital-id"
    >
      <div className="w-full py-2">
        <AdminIdManagement />
      </div>
    </AppShell>
  )
}
