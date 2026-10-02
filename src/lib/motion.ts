/**
 * Motion tokens — Campus Super-App
 * Source of truth: documents/DESIGN.MD §10
 *
 * Use these in Framer Motion `transition` props.
 * CSS equivalents live in src/styles/tokens.css as --motion-micro and --motion-panel.
 *
 * All components MUST swap to opacity-only when prefers-reduced-motion is set.
 */

/** 150ms ease-out — button press, pill dot slide, upvote fill */
export const motionMicro = {
  duration: 0.15,
  ease: 'easeOut',
} as const

/** 240ms ease-in-out — sheets, dialogs, popovers, sidebar collapse */
export const motionPanel = {
  duration: 0.24,
  ease: 'easeInOut',
} as const

/** spring(stiffness 400, damping 30) — checkbox, toggle, ID card refresh ring */
export const motionFeedback = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
} as const

/**
 * Returns the correct transition based on the user's motion preference.
 * Pass as `transition` to a Framer Motion component.
 *
 * @example
 * <motion.div animate={{ opacity: 1 }} transition={reduceMotion(motionPanel)} />
 */
export function reduceMotion<T extends object>(token: T): T | { duration: 0.01 } {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return { duration: 0.01 }
  }
  return token
}
