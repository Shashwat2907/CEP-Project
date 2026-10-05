'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Menu,
  ArrowLeftRight,
  ChevronDown,
  Check,
  GraduationCap,
  Users,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusCluster, type PresenceState } from './status-cluster'

export interface TopBarProps {
  identifier?: string
  userName?: string
  department?: string
  role?: 'student' | 'teacher' | 'admin'
  onRoleChange?: (nextRole: 'student' | 'teacher' | 'admin') => void
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
  onRoleChange,
  presenceState = 'in',
  onPresenceToggle,
  unreadNotifications = 3,
  onBellClick,
  onMobileMenuOpen,
  className,
}: TopBarProps) {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = React.useState(false)
  const roleMenuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const homeHref = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher/acad' : '/'

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
          href={homeHref}
          className="md:hidden font-display font-bold text-ink text-base tracking-tight hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <span className="w-6 h-6 rounded-sm bg-ink text-on-ink text-xs font-bold flex items-center justify-center">C</span>
          <span>Campus</span>
        </Link>
      </div>

      {/* Right side: Role switcher & Signature status cluster (DESIGN.MD §6 & §7) */}
      <div className="flex items-center gap-2">
        {onRoleChange && (
          <div className="relative" ref={roleMenuRef}>
            <button
              type="button"
              onClick={() => setIsRoleMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-border rounded-sm text-xs font-mono text-ink hover:bg-surface-sunken hover:border-ink transition-colors cursor-pointer select-none"
              title={`Active role: ${role}. Click to switch role.`}
              aria-label={`Role switcher. Current role is ${role}.`}
              aria-expanded={isRoleMenuOpen}
            >
              <ArrowLeftRight size={13} className="text-ink-muted shrink-0" />
              <span className="hidden sm:inline text-ink-muted">Role:</span>
              <span
                className={cn(
                  'font-bold uppercase tracking-wider text-[11px] px-1 py-0.2 rounded-xs',
                  role === 'admin'
                    ? 'bg-danger/10 text-danger'
                    : role === 'teacher'
                    ? 'bg-warning/20 text-ink'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {role}
              </span>
              <ChevronDown size={12} className="text-ink-muted shrink-0" />
            </button>

            {isRoleMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-sm shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-ink-muted border-b border-border">
                  Switch Active Role
                </div>
                {(
                  [
                    { key: 'student', label: 'Student', icon: GraduationCap },
                    { key: 'teacher', label: 'Faculty / Teacher', icon: Users },
                    { key: 'admin', label: 'Administrator', icon: Shield },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setIsRoleMenuOpen(false)
                      onRoleChange(key)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-surface-sunken transition-colors cursor-pointer',
                      role === key ? 'font-bold text-ink bg-surface-sunken' : 'text-ink-muted'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={14} className="shrink-0" />
                      <span>{label}</span>
                    </span>
                    {role === key && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
