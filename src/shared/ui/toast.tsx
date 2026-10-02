'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'danger'
  duration?: number
}

interface ToastContextType {
  toasts: ToastItem[]
  toast: (options: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastItem = { id, title, description, variant, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast container: bottom-center mobile, bottom-right desktop per DESIGN.MD §8 */}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-50 flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-md border border-border bg-surface text-ink',
              'shadow-[0_8px_24px_rgba(22,33,62,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
              'animate-in slide-in-from-bottom-5 duration-200 ease-out'
            )}
          >
            <div className="flex items-start gap-2.5">
              {t.variant === 'success' && (
                <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
              )}
              {t.variant === 'danger' && (
                <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
              )}
              {t.variant === 'default' && (
                <Info className="h-5 w-5 text-ink-muted shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-body-strong leading-tight text-ink">{t.title}</p>
                {t.description && (
                  <p className="text-small text-ink-muted mt-0.5">{t.description}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-ink-muted hover:text-ink p-1 rounded-sm focus-visible:outline-2 focus-visible:outline-ink"
              aria-label="Dismiss toast"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
