'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'icon' | 'sidebar'
  className?: string
}

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(callback)
    }
  }
  window.addEventListener('storage', callback)
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  mediaQuery?.addEventListener?.('change', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
    mediaQuery?.removeEventListener?.('change', callback)
  }
}

function getSnapshot(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = window.localStorage?.getItem('cep-theme')
    if (stored === 'dark' || stored === 'light') return stored
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // ignore
  }
  return 'light'
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light'
}

function applyTheme(nextTheme: 'light' | 'dark') {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('cep-theme', nextTheme)
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      listeners.forEach((listener) => {
        try {
          listener()
        } catch {
          // ignore
        }
      })
      window.dispatchEvent(new Event('storage'))
    }
  } catch {
    // ignore
  }
}

export function ThemeToggle({ variant = 'icon', className, ...props }: ThemeToggleProps) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  React.useEffect(() => {
    const current = getSnapshot()
    if (current === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'

    // Check if View Transitions API is supported and motion is not reduced
    const isTransitionSupported =
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function'

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!isTransitionSupported || prefersReducedMotion) {
      applyTheme(nextTheme)
      return
    }

    // Circular clip-path transition originating from the clicked button
    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const docWithTransition = document as Document & {
      startViewTransition: (callback: () => void) => {
        ready: Promise<void>
        finished: Promise<void>
      }
    }

    const transition = docWithTransition.startViewTransition(() => {
      applyTheme(nextTheme)
    })

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 450,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        )
      })
      .catch(() => {
        // Fallback safely if browser animation fails
        applyTheme(nextTheme)
      })
  }

  // Sidebar variant: full-width bar with smooth sliding switch above profile
  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={theme === 'dark'}
        onClick={toggleTheme}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-2 rounded-sm border border-border bg-surface hover:bg-surface-sunken text-small text-ink transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink group',
          className
        )}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title="Toggle dark / light appearance with sliding animation"
        {...props}
      >
        <span className="flex items-center gap-2 font-medium">
          {theme === 'dark' ? (
            <Moon size={16} strokeWidth={1.75} className="text-highlight" />
          ) : (
            <Sun size={16} strokeWidth={1.75} className="text-ink" />
          )}
          <span className="text-small text-ink font-semibold">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </span>

        {/* Sliding Switch Track (56px width, 28px height) */}
        <div className="relative w-14 h-7 rounded-full bg-surface-sunken border border-border p-0.5 flex items-center transition-colors shrink-0">
          {/* Static track background glyphs */}
          <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-ink-muted">
            <Sun
              size={12}
              strokeWidth={2}
              className={cn(
                'transition-opacity duration-200',
                theme === 'light' ? 'opacity-0' : 'opacity-60'
              )}
            />
            <Moon
              size={12}
              strokeWidth={2}
              className={cn(
                'transition-opacity duration-200',
                theme === 'dark' ? 'opacity-0' : 'opacity-60'
              )}
            />
          </div>

          {/* Sliding Thumb (24px, glides 28px horizontally in both directions) */}
          <div
            className={cn(
              'relative z-10 w-6 h-6 rounded-full shadow-xs flex items-center justify-center transition-transform duration-250 ease-out',
              theme === 'dark'
                ? 'translate-x-[28px] bg-ink text-highlight border border-ink'
                : 'translate-x-0 bg-surface text-ink border border-border'
            )}
          >
            {theme === 'dark' ? (
              <Moon size={13} strokeWidth={2.2} className="text-highlight" />
            ) : (
              <Sun size={13} strokeWidth={2.2} className="text-ink" />
            )}
          </div>
        </div>
      </button>
    )
  }

  // Icon / compact variant: dedicated sliding toggle switch
  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center w-14 h-7 rounded-full bg-surface-sunken border border-border p-0.5 transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink',
        className
      )}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      {...props}
    >
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-ink-muted">
        <Sun
          size={12}
          strokeWidth={2}
          className={cn(
            'transition-opacity duration-200',
            theme === 'light' ? 'opacity-0' : 'opacity-60'
          )}
        />
        <Moon
          size={12}
          strokeWidth={2}
          className={cn(
            'transition-opacity duration-200',
            theme === 'dark' ? 'opacity-0' : 'opacity-60'
          )}
        />
      </div>
      <div
        className={cn(
          'relative z-10 w-6 h-6 rounded-full shadow-xs flex items-center justify-center transition-transform duration-250 ease-out',
          theme === 'dark'
            ? 'translate-x-[28px] bg-ink text-highlight border border-ink'
            : 'translate-x-0 bg-surface text-ink border border-border'
        )}
      >
        {theme === 'dark' ? (
          <Moon size={13} strokeWidth={2.2} className="text-highlight" />
        ) : (
          <Sun size={13} strokeWidth={2.2} className="text-ink" />
        )}
      </div>
    </button>
  )
}
