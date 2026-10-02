'use client'

import * as React from 'react'
import { Sidebar, type UserRole } from './sidebar'
import { TopBar } from './top-bar'
import { MobileNav } from './mobile-nav'
import { type PresenceState } from './status-cluster'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
import { cn } from '@/lib/utils'

export interface AppShellProps {
  children: React.ReactNode
  initialRole?: UserRole
  userName?: string
  identifier?: string
  department?: string
  userEmail?: string
  activePath?: string
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
  onSignOut,
  className,
}: AppShellProps) {
  const [role, setRole] = React.useState<UserRole>(initialRole)
  const [presenceState, setPresenceState] = React.useState<PresenceState>('in')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  return (
    <div className={cn('min-h-screen flex bg-bg text-ink font-body transition-colors', className)}>
      {/* 1. Desktop Sidebar (248px width, hidden below md) (DESIGN.MD §6) */}
      <div className="hidden md:block shrink-0 sticky top-0 h-screen">
        <Sidebar
          role={role}
          userName={userName}
          userEmail={userEmail}
          identifier={identifier}
          department={department}
          onRoleChange={setRole}
          onSignOut={onSignOut}
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
            onRoleChange={setRole}
            onSignOut={onSignOut}
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
          presenceState={presenceState}
          onPresenceToggle={setPresenceState}
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        />

        {/* Content Body: Left-aligned per DESIGN.MD §6 */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation: Bottom tab bar below md (DESIGN.MD §6) */}
      <MobileNav
        role={role}
        userName={userName}
        identifier={identifier}
        department={department}
        onRoleChange={setRole}
        onSignOut={onSignOut}
        activePath={activePath}
      />
    </div>
  )
}
