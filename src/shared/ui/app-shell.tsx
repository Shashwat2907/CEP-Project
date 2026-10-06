'use client'

import * as React from 'react'
import { Sidebar, type UserRole } from './sidebar'
import { TopBar } from './top-bar'
import { MobileNav } from './mobile-nav'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
import { cn } from '@/lib/utils'
import { PresenceProvider } from '@/features/presence/presence-context'

import { signOutAction, quickSwitchRoleAction } from '@/features/identity/actions'

export interface AppShellProps {
  children: React.ReactNode
  initialRole?: UserRole
  userName?: string
  identifier?: string
  department?: string
  userEmail?: string
  activePath?: string
  isOffline?: boolean
  onSignOut?: () => void
  className?: string
}

export function AppShell({
  children,
  initialRole = 'student',
  userName = 'Shashwat Choudhary',
  identifier = '23BCE1042',
  department = 'Computer Science & Engineering',
  userEmail = 'shashwat@college.edu',
  activePath,
  isOffline = false,
  onSignOut,
  className,
}: AppShellProps) {
  const [role, setRole] = React.useState<UserRole>(initialRole)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const handleRoleChange = async (nextRole: UserRole) => {
    setRole(nextRole)
    const email =
      nextRole === 'teacher'
        ? 'sharma@campus.edu'
        : nextRole === 'admin'
        ? 'admin@campus.edu'
        : nextRole === 'overseer'
        ? 'overseer@campus.edu'
        : 'student@campus.edu'

    // Synchronously set cookie in browser so subsequent reload/navigation guarantees the role
    if (typeof document !== 'undefined') {
      document.cookie = `dev_mock_user_email=${encodeURIComponent(email)}; path=/; max-age=604800; SameSite=Lax`
    }

    try {
      await quickSwitchRoleAction(email)
    } catch {
      // Fallback
    }

    if (nextRole === 'teacher') {
      window.location.href = '/teacher/acad'
    } else if (nextRole === 'admin') {
      window.location.href = '/admin'
    } else if (nextRole === 'overseer') {
      window.location.href = '/overseer'
    } else {
      window.location.href = '/'
    }
  }

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut()
      return
    }
    await signOutAction()
    window.location.href = '/sign-in?switch=true'
  }

  return (
    <PresenceProvider initialState="in">
      <div className={cn('min-h-screen flex bg-bg text-ink font-body transition-colors', className)}>
        {/* 1. Desktop Sidebar (248px width, hidden below md) (DESIGN.MD §6) */}
        <div className="hidden md:block shrink-0 sticky top-0 h-screen">
          <Sidebar
            role={role}
            userName={userName}
            userEmail={userEmail}
            identifier={identifier}
            department={department}
            onSignOut={handleSignOut}
            activePath={activePath}
          />
        </div>

        {/* Mobile Drawer Sheet when hamburger clicked */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Mobile navigation sidebar drawer</SheetDescription>
            </SheetHeader>
            <Sidebar
              role={role}
              userName={userName}
              userEmail={userEmail}
              identifier={identifier}
              department={department}
              onSignOut={handleSignOut}
              activePath={activePath}
              className="w-full h-full border-r-0"
            />
          </SheetContent>
        </Sheet>

        {/* 2. Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top bar (56px) (DESIGN.MD §6) */}
          <TopBar
            identifier={identifier}
            userName={userName}
            department={department}
            role={role}
            isOffline={isOffline}
            onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
          />

          {/* Content Body: Left-aligned per DESIGN.MD §6 */}
          <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
            <div className="w-full max-w-[1200px]">
              {children}
            </div>
          </main>
        </div>

        {/* 3. Mobile Navigation: Bottom tab bar below md (DESIGN.MD §6) */}
        <MobileNav
          role={role}
          userName={userName}
          identifier={identifier}
          department={department}
          onSignOut={onSignOut}
          activePath={activePath}
        />
      </div>
    </PresenceProvider>
  )
}
