/**
 * Fast health check for Supabase reachability.
 * In local dev without Supabase running, prevents long network timeouts
 * that cause Next.js Suspense boundary errors.
 */

let cache = { online: false, expiresAt: 0 }

export async function isSupabaseOnline(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return false

  const now = Date.now()
  if (now < cache.expiresAt) {
    return cache.online
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 400)
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      signal: controller.signal,
    }).catch(() => null)
    clearTimeout(timer)

    const online = Boolean(res && res.status !== 0)
    cache = {
      online,
      expiresAt: now + (online ? 30000 : 5000),
    }
    return online
  } catch {
    cache = { online: false, expiresAt: now + 5000 }
    return false
  }
}
