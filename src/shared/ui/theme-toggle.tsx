'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'icon' | 'sidebar'
  className?: string
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  mediaQuery?.addEventListener?.('change', callback)
  return () => {
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
      window.dispatchEvent(new Event('storage'))
    }
  } catch {
    // ignore
  }
}

export function ThemeToggle({ variant = 'icon', className, ...props }: ThemeToggleProps) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

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

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm border border-border bg-surface hover:bg-surface-sunken text-small text-ink transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink',
          className
        )}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title="Toggle dark / light appearance with circular ripple"
        {...props}
      >
        <span className="flex items-center gap-2 text-ink font-medium">
          {theme === 'dark' ? (
            <Sun size={18} strokeWidth={1.75} className="text-highlight" />
          ) : (
            <Moon size={18} strokeWidth={1.75} className="text-ink" />
          )}
          <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        </span>
        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-ink-muted">
          {theme.toUpperCase()}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'w-9 h-9 rounded-sm border border-border bg-surface text-ink-muted hover:text-ink hover:bg-surface-sunken flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-ink',
        className
      )}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      {...props}
    >
      {theme === 'dark' ? (
        <Sun size={20} strokeWidth={1.75} className="text-highlight" />
      ) : (
        <Moon size={20} strokeWidth={1.75} className="text-ink" />
      )}
    </button>
  )
}
