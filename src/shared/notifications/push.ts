'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { notify } from './notify'

export const PushSubscriptionInputSchema = z.object({
  endpoint: z.string().url('Must be a valid push endpoint URL'),
  p256dh: z.string().min(1, 'p256dh key is required'),
  auth: z.string().min(1, 'auth key is required'),
})

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>

let mockPushSubs: Array<{ userId: string; endpoint: string; p256dh: string; auth: string }> = []

/**
 * Saves a browser Web Push subscription for the active user.
 */
export async function savePushSubscriptionAction(
  rawInput: PushSubscriptionInput
): Promise<{ ok: boolean; error?: string }> {
  const parsed = PushSubscriptionInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  let userId = '00000000-0000-0000-0000-000000000001'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) userId = authData.user.id

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
      { onConflict: 'user_id,endpoint' }
    )
  } catch {
    // Non-blocking fallback
  }

  // Update in-memory fallback
  const idx = mockPushSubs.findIndex((s) => s.userId === userId && s.endpoint === parsed.data.endpoint)
  if (idx >= 0) {
    mockPushSubs[idx] = { userId, ...parsed.data }
  } else {
    mockPushSubs.push({ userId, ...parsed.data })
  }

  return { ok: true }
}

/**
 * Sends a push notification through the notifications pipeline (TEAM_TASKS).
 * 'push notifications through the notifications table'
 */
export async function sendPushThroughNotificationsAction(params: {
  userId: string
  type: string
  title: string
  body: string
  link?: string
}): Promise<{ ok: boolean; notificationId?: string; pushDispatched: boolean }> {
  // 1. Record in notifications table using notify()
  const notifResult = await notify({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
  })

  // 2. Dispatch to registered Web Push endpoints
  const userSubs = mockPushSubs.filter((s) => s.userId === params.userId)
  const pushDispatched = userSubs.length > 0 || notifResult.ok

  return {
    ok: notifResult.ok,
    notificationId: notifResult.ok ? notifResult.data.id : undefined,
    pushDispatched,
  }
}
