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

  // Fast-path: if no URL, no key, placeholder, or default demo dummy key, avoid blocking fetch
  if (!url || !key || key.includes('dummy') || url.includes('placeholder') || url.includes('demo-project')) {
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
      const timer = setTimeout(() => controller.abort(), 2000)
      // Check if profiles table exists to verify migrations are applied
      const res = await fetch(`${url}/rest/v1/profiles?limit=1`, {
        method: 'HEAD',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        },
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timer)

      // 200 OK means table exists. 404 means route not found (PGRST205 means table missing, which returns 404)
      const online = Boolean(res && res.status >= 200 && res.status < 400)
      cache = {
        online,
        expiresAt: Date.now() + (online ? 60000 : 5000),
      }
      return online
    } catch {
      cache = { online: false, expiresAt: Date.now() + 5000 }
      return false
    } finally {
      inFlightCheck = null
    }
  })()

  return inFlightCheck
}
