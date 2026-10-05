const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Deterministic date formatter across Node.js SSR and client browsers
 * preventing Next.js / React hydration mismatches.
 */
export function formatDeterministicDate(
  dateInput: string | Date | number,
  format: 'short' | 'long' | 'date-only' | 'short-no-year' = 'short'
): string {
  const dt = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(dt.getTime())) return ''

  const dayShort = WEEKDAYS_SHORT[dt.getDay()]
  const dayLong = WEEKDAYS_LONG[dt.getDay()]
  const monthShort = MONTHS_SHORT[dt.getMonth()]
  const date = dt.getDate()
  const year = dt.getFullYear()

  if (format === 'long') {
    return `${dayLong}, ${monthShort} ${date}, ${year}`
  }
  if (format === 'date-only') {
    return `${monthShort} ${date}, ${year}`
  }
  if (format === 'short-no-year') {
    return `${dayShort}, ${monthShort} ${date}`
  }
  return `${dayShort}, ${monthShort} ${date}, ${year}`
}

/**
 * Deterministic 12-hour time formatter (e.g. 10:00 AM)
 */
export function formatDeterministicTime(dateInput: string | Date | number): string {
  const dt = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(dt.getTime())) return ''

  const hours = dt.getHours()
  const minutes = dt.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`
}

export function formatSessionDateTime(startsAt: string): { dateStr: string; timeStr: string } {
  return {
    dateStr: formatDeterministicDate(startsAt, 'short'),
    timeStr: formatDeterministicTime(startsAt),
  }
}
