'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  AlertCircle,
  CalendarClock,
  MessageSquare,
  MoreHorizontal,
  Flag,
  Calendar,
  CalendarDays,
  Search,
  BookOpen,
  ClipboardList,
  Shield,
  Users,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
import { Avatar } from './avatar'
import { ThemeToggle } from './theme-toggle'
import { type UserRole } from './sidebar'

export interface MobileNavProps {
  role?: UserRole
  userName?: string
  identifier?: string
  department?: string
  onRoleChange?: (nextRole: UserRole) => void
  onSignOut?: () => void
  activePath?: string
  className?: string
}

export function MobileNav({
  role = 'student',
  userName = 'Shashwat Choudhary',
  identifier = '23BCE1042',
  department = 'Computer Science',
  onRoleChange,
  onSignOut,
  activePath,
  className,
}: MobileNavProps) {
  const currentPathname = usePathname()
  const currentPath = activePath ?? currentPathname ?? '/'
  const [isMoreOpen, setIsMoreOpen] = React.useState(false)

  // 5 primary tabs for bottom navigation per DESIGN.MD §6
  const primaryTabs = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Complaints', href: '/complaints', icon: AlertCircle },
    { label: 'Meet', href: '/meet', icon: CalendarClock },
    { label: 'Community', href: '/community', icon: MessageSquare },
  ]

  // Secondary items for the "More" slide-up sheet
  const secondaryItems =
    role === 'student'
      ? [
          { label: 'Clubs', href: '/clubs', icon: Flag },
          { label: 'Events', href: '/events', icon: Calendar },
          { label: 'Calendar', href: '/calendar', icon: CalendarDays },
          { label: 'Lost & Found', href: '/lost-found', icon: Search },
          { label: 'Friends', href: '/friends', icon: Users },
          { label: 'Acad & Resources', href: '/acad', icon: BookOpen },
        ]
      : role === 'teacher'
      ? [
          { label: 'Meet', href: '/meet', icon: CalendarClock },
          { label: 'Assigned Complaints', href: '/complaints/assigned', icon: ClipboardList },
          { label: 'Resources', href: '/teacher/acad', icon: BookOpen },
          { label: 'Calendar', href: '/calendar', icon: CalendarDays },
        ]
      : role === 'admin'
      ? [
          { label: 'Overview', href: '/admin', icon: Shield },
          { label: 'Roster Import', href: '/admin/roster', icon: Users },
          { label: 'Calendar', href: '/calendar', icon: CalendarDays },
        ]
      : [
          { label: 'Presence & Attendance', href: '/overseer/presence', icon: Users },
          { label: 'Campus Complaints', href: '/overseer/complaints', icon: AlertCircle },
        ]

  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <>
      {/* Bottom Tab Bar (DESIGN.MD §6) */}
      <nav
        aria-label="Mobile navigation"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 h-16 bg-surface border-t border-border flex items-center justify-around px-1 md:hidden select-none transition-colors',
          className
        )}
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon
          const isActive =
            tab.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-sm text-meta transition-colors',
                isActive
                  ? 'text-ink font-semibold'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              <Icon
                size={20}
                strokeWidth={1.75}
                className={cn(
                  'mb-0.5 transition-colors',
                  isActive ? 'text-ink' : 'text-ink-muted'
                )}
              />
              <span className="text-[11px] leading-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-highlight mt-0.5" />
              )}
            </Link>
          )
        })}

        {/* 5th Tab: More Button */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-sm text-meta text-ink-muted hover:text-ink transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal size={20} strokeWidth={1.75} className="mb-0.5" />
          <span className="text-[11px] leading-tight">More</span>
        </button>
      </nav>

      {/* Slide-up "More" Sheet */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-lg p-6">
          <SheetHeader className="text-left pb-4 border-b border-border">
            <SheetTitle className="font-display text-h2">Menu & Services</SheetTitle>
            <SheetDescription>
              Additional campus modules and user settings.
            </SheetDescription>
          </SheetHeader>

          {/* Theme Toggle above profile */}
          <div className="py-2 border-b border-border">
            <ThemeToggle variant="sidebar" />
          </div>

          {/* Profile overview in sheet */}
          <div className="py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar fallback={userInitials} size="default" className="w-11 h-11 border border-border" />
              <div>
                <p className="font-semibold text-ink text-small">{userName}</p>
                <p className="text-meta font-mono text-ink-muted">
                  {identifier} · {role.toUpperCase()}
                </p>
                <p className="text-[11px] text-ink-muted">{department}</p>
              </div>
            </div>

            {onRoleChange && (
              <button
                type="button"
                onClick={() => {
                  const nextRole =
                    role === 'student' ? 'teacher' : role === 'teacher' ? 'admin' : 'student'
                  onRoleChange(nextRole)
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-meta font-mono rounded-sm border border-border bg-surface-sunken text-ink"
              >
                <ArrowLeftRight size={13} strokeWidth={1.75} />
                Switch
              </button>
            )}
          </div>

          {/* Additional Module Links */}
          <div className="py-4 grid grid-cols-2 gap-2">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-md border border-border text-small transition-colors',
                    isActive
                      ? 'bg-surface-sunken font-semibold text-ink border-ink'
                      : 'bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken'
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Sign Out Button */}
          {onSignOut && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false)
                  onSignOut()
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-sm border border-danger/40 text-danger text-small font-medium hover:bg-danger/10 transition-colors"
              >
                <LogOut size={16} strokeWidth={1.75} />
                Sign Out of Campus
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
