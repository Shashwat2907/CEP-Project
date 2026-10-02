/**
 * Feature flags — all off by default.
 * Flip to true here to enable a partially built feature in develop.
 * Never ship a flag that is permanently on; delete it once the feature is complete.
 */

export const flags = {
  /** Phase 1 features */
  presence: false,
  digitalId: false,
  complaints: false,
  meet: false,
  acadResources: false,
  calendar: false,

  /** Phase 2 features */
  communities: false,
  clubs: false,
  events: false,
  lostAndFound: false,

  /** Phase 3 features */
  flashcards: false,
  doubtChat: false,
  friends: false,
} as const

export type Flag = keyof typeof flags
