import type { Metadata } from 'next'
import {
  Bricolage_Grotesque,
  Instrument_Sans,
  JetBrains_Mono,
} from 'next/font/google'
import './globals.css'
import { PwaRegister } from '@/shared/ui/pwa-register'

/**
 * Display / heading font — Bricolage Grotesque (weights 600, 700)
 * Exposed as CSS var --font-display
 */
const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
})

/**
 * Body / UI font — Instrument Sans (weights 400, 500, 600)
 * Exposed as CSS var --font-body
 */
const body = Instrument_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

/**
 * Monospace — JetBrains Mono (weight 500)
 * Used for student ID, QR fallback codes, booking references
 * Exposed as CSS var --font-mono
 */
const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Campus App',
    template: '%s — Campus App',
  },
  description:
    'One platform for students and teachers — presence, complaints, meets, ID, resources, communities, clubs and events.',
  robots: { index: false }, // flip to true before public launch
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      // dark class toggled here by theme switcher (next-themes, added in app-shell slice)
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var r of regs) { r.unregister(); }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var n of names) { caches.delete(n); }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
