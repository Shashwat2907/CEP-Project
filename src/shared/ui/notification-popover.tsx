'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ExternalLink, Inbox, X } from 'lucide-react'
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
    body: 'Prof. Rajesh Sharma confirmed your office hours appointment for tomorrow at 2:00 PM.',
    link: '/meet',
    read: false,
    createdAt: '12m ago',
  },
  {
    id: 'n-2',
    type: 'complaint.escalated',
    title: 'Complaint Escalation Alert',
    body: 'Complaint "Central Library 3rd Floor Quiet Zone AC" has been assigned to Estate Officer.',
    link: '/complaints',
    read: false,
    createdAt: '1h ago',
  },
  {
    id: 'n-3',
    type: 'event.reminder',
    title: 'Upcoming Campus Hackathon',
    body: 'Annual Smart Campus Hackathon starts tomorrow at 9:00 AM in Tech Block Auditorium.',
    link: '/events',
    read: false,
    createdAt: '4h ago',
  },
  {
    id: 'n-4',
    type: 'lostfound.matched',
    title: 'Potential Lost Item Match',
    body: 'A scientific calculator matching your report was handed in at Main Reception.',
    link: '/lost-found',
    read: true,
    createdAt: 'Yesterday',
  },
]

const STORAGE_KEY = 'cep_read_notifications_v1'

export function NotificationPopover({
  notifications: initialNotifications = INITIAL_MOCK_NOTIFICATIONS,
  unreadCount: controlledUnreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
  onBellClick,
  className,
}: NotificationPopoverProps) {
  let router: { push: (href: string) => void } | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    // App router not mounted (e.g. In unit tests)
  }

  const [isOpen, setIsOpen] = React.useState(false)
  const [items, setItems] = React.useState<NotificationItem[]>(initialNotifications)
  const [userModified, setUserModified] = React.useState(false)

  // Sync when initialNotifications prop changes
  React.useEffect(() => {
    setItems(initialNotifications)
  }, [initialNotifications])

  // Load read status from localStorage on mount (for default mock notifications)
  React.useEffect(() => {
    try {
      if (initialNotifications === INITIAL_MOCK_NOTIFICATIONS) {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const readIds: string[] = JSON.parse(stored)
          setItems((prev) =>
            prev.map((item) =>
              readIds.includes(item.id) ? { ...item, read: true } : item
            )
          )
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [initialNotifications])

  // Dynamic unread count derived directly from current item states
  const dynamicUnreadCount = items.filter((n) => !n.read).length
  const unreadCount =
    userModified || controlledUnreadCount === undefined
      ? dynamicUnreadCount
      : controlledUnreadCount

  const persistReadIds = (newItems: NotificationItem[]) => {
    try {
      const readIds = newItems.filter((i) => i.read).map((i) => i.id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds))
    } catch {
      // Ignore
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      onBellClick?.()
    }
  }

  const handleMarkItemRead = (id: string) => {
    setUserModified(true)
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      persistReadIds(next)
      return next
    })
    onMarkAsRead?.(id)
  }

  const handleMarkAllRead = () => {
    setUserModified(true)
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }))
      persistReadIds(next)
      return next
    })
    onMarkAllAsRead?.()
  }

  const handleClickItem = (item: NotificationItem) => {
    handleMarkItemRead(item.id)
    onSelectNotification?.(item)
    setIsOpen(false)

    if (item.link) {
      if (router) {
        router.push(item.link)
      } else if (typeof window !== 'undefined') {
        window.location.assign(item.link)
      }
    }
  }

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          'relative w-9 h-9 rounded-sm border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-ink cursor-pointer',
          className
        )}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications. Click to view.`
            : 'Notifications'
        }
        title="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-highlight text-ink text-[11px] font-bold font-mono rounded-full border border-surface flex items-center justify-center pointer-events-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Modal / Sheet Panel */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent showClose={false} className="max-w-[420px] p-0 overflow-hidden border border-border bg-surface rounded-lg shadow-xl">
          <DialogHeader className="p-4 border-b border-border bg-surface-sunken/40 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} strokeWidth={1.75} className="text-ink shrink-0" />
              <DialogTitle className="font-display text-h3 font-semibold text-ink leading-none m-0">
                Notifications
              </DialogTitle>
              <DialogDescription className="sr-only">
                List of real-time notifications and campus alerts
              </DialogDescription>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center font-mono text-meta font-semibold leading-none px-2 py-0.5 rounded-sm bg-highlight text-ink shrink-0 self-center">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-meta text-ink-muted hover:text-ink font-medium px-2 py-1 rounded-sm hover:bg-surface-sunken transition-colors cursor-pointer"
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={14} strokeWidth={1.75} />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-sm p-1.5 text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors focus-visible:outline-2 focus-visible:outline-ink cursor-pointer"
                aria-label="Close notifications"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
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
