/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm
 * Source of truth: src/features/acad/README.md, documents/PLAN.md §5.6
 *
 * Ratings:
 * 0 - Complete blackout (failed)
 * 1 - Incorrect; familiar upon seeing answer (failed)
 * 2 - Incorrect; easy to remember upon seeing answer (failed)
 * 3 - Correct; significant difficulty (passed)
 * 4 - Correct; slight hesitation (passed)
 * 5 - Perfect recall (passed)
 */

export interface Sm2Input {
  quality: number            // 0 to 5
  currentInterval?: number   // days (default: 1)
  currentEase?: number       // factor (default: 2.5, min: 1.3)
  currentRepetitions?: number // consecutive correct (default: 0)
  now?: Date                 // reference timestamp (default: current time)
}

export interface Sm2Output {
  interval: number           // days until next review
  ease: number               // new ease factor (>= 1.3)
  repetitions: number        // new consecutive correct count
  dueAt: Date                // timestamp when card becomes due
}

export function calculateSm2(input: Sm2Input): Sm2Output {
  const quality = Math.max(0, Math.min(5, Math.round(input.quality)))
  const currentInterval = input.currentInterval && input.currentInterval > 0 ? input.currentInterval : 1
  const currentEase = input.currentEase && input.currentEase >= 1.3 ? input.currentEase : 2.5
  const currentRepetitions = input.currentRepetitions && input.currentRepetitions >= 0 ? input.currentRepetitions : 0
  const now = input.now ?? new Date()

  let repetitions: number
  let interval: number

  if (quality < 3) {
    // Failed review: reset consecutive repetitions and set review interval back to 1 day
    repetitions = 0
    interval = 1
  } else {
    // Successful review: advance repetition ladder
    if (currentRepetitions === 0) {
      interval = 1
    } else if (currentRepetitions === 1) {
      interval = 6
    } else {
      interval = Math.max(1, Math.round(currentInterval * currentEase))
    }
    repetitions = currentRepetitions + 1
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  const calculatedEase = currentEase + delta
  // Ease factor minimum floor is 1.3 per standard SM-2 specification
  const ease = Math.max(1.3, Math.round(calculatedEase * 100) / 100)

  // Compute next due date
  const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)

  return {
    interval,
    ease,
    repetitions,
    dueAt,
  }
}
