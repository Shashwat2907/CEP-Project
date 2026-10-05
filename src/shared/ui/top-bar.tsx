'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusCluster, type PresenceState } from './status-cluster'

export interface TopBarProps {
  identifier?: string
  userName?: string
  department?: string
  role?: 'student' | 'teacher' | 'admin'
  presenceState?: PresenceState
  onPresenceToggle?: (state: PresenceState) => void
  unreadNotifications?: number
  onBellClick?: () => void
  onMobileMenuOpen?: () => void
  className?: string
}

export function TopBar({
  identifier = '23BCE1042',
  userName = 'Shashwat Choudhary',
  department = 'Computer Science & Engineering',
  role = 'student',
  presenceState = 'in',
  onPresenceToggle,
  unreadNotifications = 3,
  onBellClick,
  onMobileMenuOpen,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 h-14 w-full bg-surface border-b border-border px-4 md:px-6 flex items-center justify-between transition-colors',
        className
      )}
    >
      {/* Left side: mobile toggle or empty per DESIGN.MD §6 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="md:hidden w-9 h-9 rounded-sm border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken flex items-center justify-center transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>

        {/* Mobile brand monogram */}
        <Link
          href="/"
          className="md:hidden font-display font-bold text-ink text-base tracking-tight hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <span className="w-6 h-6 rounded-sm bg-ink text-on-ink text-xs font-bold flex items-center justify-center">C</span>
          <span>Campus</span>
        </Link>
      </div>

      {/* Right side: Signature status cluster (DESIGN.MD §6 & §7) */}
      <div className="flex items-center gap-2">
        <StatusCluster
          identifier={identifier}
          userName={userName}
          department={department}
          role={role}
          presenceState={presenceState}
          onPresenceToggle={onPresenceToggle}
          unreadNotifications={unreadNotifications}
          onBellClick={onBellClick}
        />
      </div>
    </header>
  )
}
