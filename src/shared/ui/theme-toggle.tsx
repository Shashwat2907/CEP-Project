'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
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
