// Rate limiting store for community messages: 10 messages / minute per user per community
const messageTimestamps = new Map<string, number[]>()

export function checkRateLimit(userId: string, communityId: string, limit = 10, windowMs = 60000): boolean {
  const key = `${userId}:${communityId}`
  const now = Date.now()
  const timestamps = (messageTimestamps.get(key) || []).filter((ts) => now - ts < windowMs)

  if (timestamps.length >= limit) {
    messageTimestamps.set(key, timestamps)
    return false
  }

  timestamps.push(now)
  messageTimestamps.set(key, timestamps)
  return true
}

export function resetRateLimitsForTesting(): void {
  messageTimestamps.clear()
}
