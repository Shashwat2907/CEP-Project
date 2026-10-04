'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Never run or cache service worker in development mode (prevents stale HMR / chunk conflicts)
    if (process.env.NODE_ENV !== 'production' || window.location.hostname === 'localhost') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name)
          }
        })
      }
      return
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        // Registered service worker in production
      })
      .catch(() => {
        // Registration non-blocking
      })
  }, [])

  return null
}
