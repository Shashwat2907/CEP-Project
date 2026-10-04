'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Registered service worker
        })
        .catch(() => {
          // Registration non-blocking
        })
    }
  }, [])

  return null
}
