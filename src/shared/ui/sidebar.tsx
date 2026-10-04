'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  AlertCircle,
  CalendarClock,
  GraduationCap,
  MessageSquare,
  Flag,
  Calendar,
  CalendarDays,
  Search,
  BookOpen,
  ClipboardList,
  Shield,
  ShieldAlert,
  Users,
  MapPin,
  FileText,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './avatar'
import { ThemeToggle } from './theme-toggle'

export type UserRole = 'student' | 'teacher' | 'admin'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  badge?: string | number
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Complaints', href: '/complaints', icon: AlertCircle },
  { label: 'Meet', href: '/meet', icon: CalendarClock },
  { label: 'Acad', href: '/acad', icon: GraduationCap },
  { label: 'Community', href: '/community', icon: MessageSquare },
  { label: 'Clubs', href: '/clubs', icon: Flag },
  { label: 'Events', href: '/events', icon: Calendar },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Lost & Found', href: '/lost-found', icon: Search },
  { label: 'Friends', href: '/friends', icon: Users },
]

export const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: 'Sessions', href: '/sessions', icon: CalendarClock },
  { label: 'Assigned Complaints', href: '/complaints/assigned', icon: ClipboardList },
  { label: 'Resources', href: '/resources', icon: BookOpen },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Community', href: '/community', icon: MessageSquare },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: Shield },
  { label: 'Digital ID & Access', href: '/admin/digital-id', icon: ShieldAlert },
  { label: 'Roster Import', href: '/admin/roster', icon: Users },
  { label: 'Zone Management', href: '/admin/zones', icon: MapPin },
  { label: 'Audit Log', href: '/admin/audit', icon: FileText },
]

export interface SidebarProps {
  role?: UserRole
  userName?: string
  userEmail?: string
  identifier?: string // roll number or staff ID
  department?: string
  onRoleChange?: (nextRole: UserRole) => void
  onSignOut?: () => void
  activePath?: string
  className?: string
}

export function Sidebar({
  role = 'student',
  userName = 'Shashwat Choudhary',
  userEmail = 'shashwat@college.edu',
  identifier = '23BCE1042',
  department = 'Computer Science',
  onRoleChange,
  onSignOut,
  activePath,
  className,
}: SidebarProps) {
  // Use passed activePath or hook into Next pathname
  const currentPathname = usePathname()
  const currentPath = activePath ?? currentPathname ?? '/'

  const navItems =
    role === 'teacher'
      ? TEACHER_NAV_ITEMS
      : role === 'admin'
      ? ADMIN_NAV_ITEMS
      : STUDENT_NAV_ITEMS

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <aside
      className={cn(
        'w-[248px] h-screen bg-surface border-r border-border flex flex-col justify-between select-none shrink-0 transition-colors',
        className
      )}
    >
      {/* 1. Header: University Logo & Wordmark (DESIGN.MD §6) */}
      <div className="h-14 px-5 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-ink text-on-ink flex items-center justify-center font-display font-black text-lg tracking-wider border border-border">
          C
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-ink text-base leading-tight">
            Campus
          </span>
          <span className="text-[11px] font-mono text-ink-muted leading-none capitalize">
            {role} portal
          </span>
        </div>
      </div>

      {/* 2. Middle: Role-based Navigation Links (DESIGN.MD §6) */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between px-4 py-2.5 text-small transition-colors text-left border-l-[3px]',
                isActive
                  ? 'border-highlight bg-surface-sunken/40 font-semibold text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-sunken/20 font-medium'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={20}
                  strokeWidth={1.75}
                  className={cn(
                    'transition-colors shrink-0',
                    isActive ? 'text-ink' : 'text-ink-muted group-hover:text-ink'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="font-mono text-meta px-1.5 py-0.5 rounded-sm bg-surface border border-border text-ink-muted">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle (above profile card with circular transformation animation) */}
      <div className="px-3 py-2 border-t border-border bg-surface">
        <ThemeToggle variant="sidebar" />
      </div>

      {/* 3. Bottom: Pinned Profile Card (DESIGN.MD §6) */}
      <div className="p-3 border-t border-border bg-surface space-y-2">
        {/* Role Switcher for preview & testing */}
        {onRoleChange && (
          <button
            type="button"
            onClick={() => {
              const nextRole =
                role === 'student' ? 'teacher' : role === 'teacher' ? 'admin' : 'student'
              onRoleChange(nextRole)
            }}
            className="w-full flex items-center justify-between px-2.5 py-1 text-meta font-mono rounded-sm border border-border bg-surface-sunken text-ink hover:border-ink transition-colors cursor-pointer"
            title="Toggle between Student, Teacher and Admin roles"
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeftRight size={14} strokeWidth={1.75} />
              Role:
            </span>
            <span className="font-semibold underline capitalize">{role}</span>
          </button>
        )}

        <div className="flex items-center gap-2.5 p-1.5 rounded-sm hover:bg-surface-sunken transition-colors">
          <Avatar fallback={userInitials} size="sm" className="w-9 h-9 border border-border" />
          <div className="flex-1 min-w-0" title={userEmail}>
            <p className="text-small font-semibold text-ink truncate leading-tight">
              {userName}
            </p>
            <p className="text-[11px] text-ink-muted truncate">
              {department}
            </p>
            <p className="text-[11px] font-mono text-ink-muted truncate">
              {identifier}
            </p>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-ink-muted hover:text-danger p-1 rounded-sm transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
