'use client'

import * as React from 'react'
import { Bell, CheckCheck, ExternalLink, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog'

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  link?: string | null
  read: boolean
  createdAt: string
}

export interface NotificationPopoverProps {
  notifications?: NotificationItem[]
  unreadCount?: number
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onSelectNotification?: (notification: NotificationItem) => void
  onBellClick?: () => void
  className?: string
}

export const INITIAL_MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    type: 'meet.accepted',
    title: 'Faculty Session Accepted',
    body: 'Dr. Priya Patel confirmed your office hours session for Monday at 11:30 AM.',
    link: '/meet/requests/1',
    read: false,
    createdAt: '12m ago',
  },
  {
    id: 'n-2',
    type: 'complaint.escalated',
    title: 'Complaint Escalation Alert',
    body: 'Complaint #104 "Library AC malfunction" exceeded Level 1 SLA and was moved to Level 2.',
    link: '/complaints/104',
    read: false,
    createdAt: '1h ago',
  },
  {
    id: 'n-3',
    type: 'event.reminder',
    title: 'Upcoming Hackathon',
    body: 'Annual Smart Campus Hackathon starts tomorrow at 9:00 AM in Tech Block Auditorium.',
    link: '/events/2',
    read: false,
    createdAt: '4h ago',
  },
  {
    id: 'n-4',
    type: 'lostfound.matched',
    title: 'Potential Lost Item Match',
    body: 'A calculator matching your lost report was handed in at Main Reception.',
    link: '/lost-found/3',
    read: true,
    createdAt: 'Yesterday',
  },
]

export function NotificationPopover({
  notifications: initialNotifications = INITIAL_MOCK_NOTIFICATIONS,
  unreadCount: unreadCountProp,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
  onBellClick,
  className,
}: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [items, setItems] = React.useState<NotificationItem[]>(initialNotifications)

  const unreadCount = unreadCountProp ?? items.filter((n) => !n.read).length

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      onBellClick?.()
    }
  }

  const handleMarkItemRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
    onMarkAsRead?.(id)
  }

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })))
    onMarkAllAsRead?.()
  }

  const handleClickItem = (item: NotificationItem) => {
    handleMarkItemRead(item.id)
    onSelectNotification?.(item)
    if (item.link && typeof window !== 'undefined') {
      window.location.assign(item.link)
    }
  }

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          'relative w-9 h-9 rounded-sm border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-ink',
          className
        )}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications. Click to view.`
            : 'Notifications'
        }
        title="Notifications"
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-highlight text-ink text-[11px] font-bold font-mono rounded-full border border-surface flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Modal / Sheet Panel */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[420px] p-0 overflow-hidden border border-border bg-surface rounded-lg shadow-xl">
          <DialogHeader className="p-4 border-b border-border bg-surface-sunken/40 flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="font-display text-h3 flex items-center gap-2">
                <Bell size={18} strokeWidth={1.75} />
                Notifications
                {unreadCount > 0 && (
                  <span className="font-mono text-meta font-bold px-1.5 py-0.5 rounded bg-highlight text-ink">
                    {unreadCount} new
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="sr-only">
                List of real-time notifications and campus alerts
              </DialogDescription>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-meta text-ink-muted hover:text-ink font-medium transition-colors"
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} strokeWidth={1.75} />
                Mark all read
              </button>
            )}
          </DialogHeader>

          {/* List of items */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-ink-muted">
                <Inbox size={32} strokeWidth={1.5} className="opacity-50" />
                <p className="text-small font-medium text-ink">No notifications yet</p>
                <p className="text-meta">You are completely caught up!</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={cn(
                    'p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left',
                    item.read
                      ? 'bg-surface hover:bg-surface-sunken/50 opacity-80'
                      : 'bg-surface-sunken/30 hover:bg-surface-sunken font-medium'
                  )}
                >
                  {/* Unread indicator */}
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0 mt-1.5 transition-colors',
                      item.read ? 'bg-transparent' : 'bg-highlight'
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-ink-muted uppercase">
                        {item.type}
                      </span>
                      <span className="text-meta font-mono text-ink-muted shrink-0">
                        {item.createdAt}
                      </span>
                    </div>

                    <h4 className="text-small font-semibold text-ink mt-0.5 leading-snug truncate">
                      {item.title}
                    </h4>
                    <p className="text-meta text-ink-muted line-clamp-2 mt-0.5 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {item.link && (
                    <ExternalLink
                      size={14}
                      strokeWidth={1.75}
                      className="text-ink-muted shrink-0 mt-1"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
