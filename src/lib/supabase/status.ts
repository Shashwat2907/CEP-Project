/**
 * Fast health check for Supabase reachability.
 * In local dev without Supabase running, prevents long network timeouts
 * that cause Next.js Suspense boundary errors.
 */

let cache = { online: false, expiresAt: 0 }
let inFlightCheck: Promise<boolean> | null = null

export async function isSupabaseOnline(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fast-path: if no URL, no key, or default demo dummy key, avoid blocking fetch
  if (!url || !key || key.includes('dummy')) {
    return false
  }

  const now = Date.now()
  if (now < cache.expiresAt) {
    return cache.online
  }

  if (inFlightCheck) {
    return inFlightCheck
  }

  inFlightCheck = (async () => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 350)
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: key,
        },
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timer)

      const online = Boolean(res && res.status !== 0)
      cache = {
        online,
        expiresAt: Date.now() + (online ? 30000 : 30000),
      }
      return online
    } catch {
      cache = { online: false, expiresAt: Date.now() + 30000 }
      return false
    } finally {
      inFlightCheck = null
    }
  })()

  return inFlightCheck
}
