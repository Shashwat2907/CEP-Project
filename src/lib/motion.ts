/**
 * Motion tokens — three spring presets used across the app.
 * Reference these in Framer Motion or CSS custom properties; never hardcode durations.
 *
 * Source of truth: DESIGN.md section (motion tokens).
 */

export const motion = {
  /** Fast micro-interactions: button presses, chip toggles */
  snappy: { type: 'spring', stiffness: 500, damping: 30 },
  /** Standard transitions: modals, drawers, dropdowns */
  standard: { type: 'spring', stiffness: 350, damping: 28 },
  /** Slow reveals: page transitions, hero animations */
  gentle: { type: 'spring', stiffness: 200, damping: 24 },
} as const

export type MotionToken = keyof typeof motion
