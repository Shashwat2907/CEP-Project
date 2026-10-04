'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { requireAuth, requireRole } from '@/shared/auth/guards'
import type {
  ResourceFilterInput,
  Subject,
  Resource,
  ResourceChunk,
  AiQuotaStatus,
  FlashcardDeck,
  FlashcardWithReview,
  FlashcardReview,
  DoubtThread,
  DoubtMessage,
} from './schema'
import type { MatchedChunk } from './lib/doubt-gen'
import {
  MOCK_SUBJECTS,
  MOCK_RESOURCES,
  MOCK_CHUNKS,
  MOCK_FLASHCARD_DECK,
  MOCK_FLASHCARDS,
  DEV_MOCK_SAVED_IDS,
} from './mock-acad-data'

/**
 * Read-side data fetching for the Academic Resources feature.
 * All queries run server-side only.
 * Source of truth: src/features/acad/README.md §6, §7
 */

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

/** Fetch all subjects, optionally filtered by year and branch. */
export async function getSubjects(opts?: {
  year?: number
  branch?: string
}): Promise<Subject[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true })

      if (opts?.year)   query = query.eq('year', opts.year)
      if (opts?.branch) query = query.eq('branch', opts.branch)

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as Subject[]
      }
    } catch {
      // Offline / Supabase unreachable
    }
  }

  // Fallback to mock subjects
  let filtered = [...MOCK_SUBJECTS]
  if (opts?.year)   filtered = filtered.filter((s) => s.year === opts.year)
  if (opts?.branch) filtered = filtered.filter((s) => s.branch === opts.branch)
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------------------
// Resources — student browse
// ---------------------------------------------------------------------------

/** Fetch the set of resource IDs saved by the current user. */
export async function getSavedResourceIds(): Promise<string[]> {
  if (await isSupabaseOnline()) {
    try {
      const { user } = await requireAuth()
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('saved_resources')
        .select('resource_id')
        .eq('user_id', user.id)

      if (!error && data) {
        return data.map((row) => row.resource_id)
      }
    } catch {
      // Offline
    }
  }

  return Array.from(DEV_MOCK_SAVED_IDS)
}

/**
 * Returns approved resources. Students see only approved resources.
 * Default view is pre-filtered to the student's own year and branch (PLAN.md §5.6).
 * Annotates each resource with is_saved boolean.
 */
export async function getApprovedResources(
  filter: ResourceFilterInput
): Promise<Resource[]> {
  await requireAuth()
  const savedList = await getSavedResourceIds()
  const savedIds = new Set(savedList)

  // If filtered specifically by saved bookmarks and user has none, return empty list early
  if (filter.saved && savedList.length === 0) {
    return []
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('resources')
        .select(`
          *,
          subject:subjects(id, name, code, year, branch),
          uploader:profiles!resources_uploader_id_fkey(full_name, role_primary)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (filter.year)       query = query.eq('year', filter.year)
      if (filter.branch)     query = query.eq('branch', filter.branch)
      if (filter.subject_id) query = query.eq('subject_id', filter.subject_id)
      if (filter.type)       query = query.eq('type', filter.type)
      if (filter.saved)      query = query.in('id', savedList)
      if (filter.query && filter.query.trim().length > 0) {
        query = query.ilike('title', `%${filter.query.trim()}%`)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return (data as Resource[]).map((r) => ({
          ...r,
          is_saved: savedIds.has(r.id),
        }))
      }
    } catch {
      // Offline
    }
  }

  // Fallback to MOCK_RESOURCES
  let resources = MOCK_RESOURCES.filter((r) => r.status === 'approved')

  if (filter.year)       resources = resources.filter((r) => r.year === filter.year)
  if (filter.branch)     resources = resources.filter((r) => r.branch === filter.branch)
  if (filter.subject_id) resources = resources.filter((r) => r.subject_id === filter.subject_id)
  if (filter.type)       resources = resources.filter((r) => r.type === filter.type)
  if (filter.saved)      resources = resources.filter((r) => savedIds.has(r.id))
  if (filter.query && filter.query.trim().length > 0) {
    const q = filter.query.trim().toLowerCase()
    resources = resources.filter((r) => r.title.toLowerCase().includes(q))
  }

  return resources.map((r) => ({
    ...r,
    is_saved: savedIds.has(r.id),
  }))
}

/** Returns the student's own pending uploads (visible only to the uploader). */
export async function getMyPendingUploads(): Promise<Resource[]> {
  if (await isSupabaseOnline()) {
    try {
      const { user } = await requireAuth()
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          subject:subjects(id, name, code, year, branch)
        `)
        .eq('uploader_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as Resource[]
      }
    } catch {
      // Offline
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Resources — teacher approval queue
// ---------------------------------------------------------------------------

/**
 * Returns ALL resources (pending + approved + rejected) for the subjects
 * this teacher teaches. RLS enforces the subject restriction.
 */
export async function getResourcesForTeacher(): Promise<Resource[]> {
  await requireRole(['teacher', 'admin'])
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        subject:subjects(id, name, code, year, branch),
        uploader:profiles!resources_uploader_id_fkey(full_name, role_primary)
      `)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data as Resource[]
    }
  } catch {
    // Offline
  }
  return MOCK_RESOURCES
}

/** Returns only pending resources for the teacher's approval queue. */
export async function getPendingApprovals(): Promise<Resource[]> {
  await requireRole(['teacher', 'admin'])
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        subject:subjects(id, name, code, year, branch),
        uploader:profiles!resources_uploader_id_fkey(full_name, role_primary)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }) // oldest first for fairness

    if (!error && data && data.length > 0) {
      return data as Resource[]
    }
  } catch {
    // Offline
  }
  return MOCK_RESOURCES.filter((r) => r.status === 'pending')
}

// ---------------------------------------------------------------------------
// Resource detail
// ---------------------------------------------------------------------------

/** Single resource by ID. Also returns a short-lived signed URL for download. */
export async function getResourceWithSignedUrl(
  resourceId: string
): Promise<{ resource: Resource; signedUrl: string } | null> {
  await requireAuth()
  try {
    const supabase = await createClient()

    const { data: resource, error } = await supabase
      .from('resources')
      .select(`
        *,
        subject:subjects(id, name, code, year, branch),
        uploader:profiles!resources_uploader_id_fkey(full_name, role_primary)
      `)
      .eq('id', resourceId)
      .single()

    if (!error && resource) {
      // Fetch configurable expiry from app_config (default 3600s if missing)
      const { data: config } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'resource_signed_url_expiry')
        .single()

      const expirySeconds = config?.value ? parseInt(config.value, 10) : 3600

      const { data: urlData, error: urlError } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.storage_path, expirySeconds)

      if (!urlError && urlData?.signedUrl) {
        const savedList = await getSavedResourceIds()
        const isSaved = savedList.includes(resource.id)

        return {
          resource: { ...(resource as Resource), is_saved: isSaved },
          signedUrl: urlData.signedUrl,
        }
      }
    }
  } catch {
    // Offline
  }

  // Fallback to MOCK_RESOURCES
  const mock = MOCK_RESOURCES.find((r) => r.id === resourceId)
  if (mock) {
    const savedList = await getSavedResourceIds()
    return {
      resource: { ...mock, is_saved: savedList.includes(mock.id) },
      signedUrl: '#',
    }
  }

  return null
}


// ---------------------------------------------------------------------------
// Helpers & AI Quota
// ---------------------------------------------------------------------------

/** Fetch configurable max file size from app_config (returns number in MB). */
export async function getMaxFileSizeMb(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'resource_max_file_size_mb')
      .single()
    if (data?.value) return parseInt(data.value, 10)
  } catch {
    // Offline
  }
  return 50
}

/** Fetch configurable daily AI limit per user from app_config. */
export async function getAiDailyLimit(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'ai_daily_limit_per_user')
      .single()
    if (data?.value) return parseInt(data.value, 10)
  } catch {
    // Offline
  }
  return 20
}

/** Fetch current user's AI quota status for today. */
export async function getUserAiUsage(): Promise<AiQuotaStatus> {
  const limit = await getAiDailyLimit()
  try {
    const { user } = await requireAuth()
    const supabase = await createClient()

    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('ai_usage')
      .select('call_count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle()

    if (!error && data) {
      const callCount = data.call_count ?? 0
      return {
        allowed: callCount < limit,
        call_count: callCount,
        limit,
        remaining: Math.max(0, limit - callCount),
      }
    }
  } catch {
    // Offline
  }

  return {
    allowed: true,
    call_count: 0,
    limit,
    remaining: limit,
  }
}

/** Fetch chunks for an approved resource. */
export async function getResourceChunks(resourceId: string): Promise<ResourceChunk[]> {
  await requireAuth()
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resource_chunks')
      .select('id, resource_id, chunk_index, page_number, content, token_count, created_at')
      .eq('resource_id', resourceId)
      .order('chunk_index', { ascending: true })

    if (!error && data && data.length > 0) {
      return data
    }
  } catch {
    // Offline
  }

  return MOCK_CHUNKS.filter((c) => c.resource_id === resourceId)
}

/** Fetch chunk count for a resource. */
export async function getResourceChunkCount(resourceId: string): Promise<number> {
  await requireAuth()
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('resource_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)

    if (!error && count !== null) {
      return count
    }
  } catch {
    // Offline
  }

  const chunks = MOCK_CHUNKS.filter((c) => c.resource_id === resourceId)
  return chunks.length
}

// ---------------------------------------------------------------------------
// Flashcards (feat/flashcards)
// ---------------------------------------------------------------------------

/**
 * Fetches the flashcard deck owned by current user for a resource.
 * Includes cards and their SM-2 review progress.
 */
export async function getFlashcardDeck(
  resourceId: string
): Promise<{ deck: FlashcardDeck | null; cards: FlashcardWithReview[] }> {
  try {
    const { user } = await requireAuth()
    const supabase = await createClient()

    // 1. Fetch deck
    const { data: deck, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!deckError && deck) {
      // 2. Fetch cards in deck
      const { data: cards } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deck.id)
        .order('position', { ascending: true })

      if (cards && cards.length > 0) {
        // 3. Fetch reviews for these cards
        const cardIds = cards.map((c) => c.id)
        let reviewsMap = new Map<string, FlashcardReview>()

        const { data: reviews } = await supabase
          .from('flashcard_reviews')
          .select('*')
          .in('card_id', cardIds)
          .eq('user_id', user.id)

        if (reviews) {
          reviewsMap = new Map(reviews.map((r) => [r.card_id, r]))
        }

        const cardsWithReviews: FlashcardWithReview[] = cards.map((c) => ({
          ...c,
          review: reviewsMap.get(c.id) ?? null,
        }))

        return {
          deck: deck as FlashcardDeck,
          cards: cardsWithReviews,
        }
      }
      return { deck: deck as FlashcardDeck, cards: [] }
    }
  } catch {
    // Offline
  }

  if (resourceId === '00000000-0000-0000-0010-000000000001') {
    return {
      deck: MOCK_FLASHCARD_DECK,
      cards: MOCK_FLASHCARDS,
    }
  }

  return { deck: null, cards: [] }
}

/**
 * Returns review and due summary for a resource's deck.
 */
export async function getDeckDueStatus(resourceId: string): Promise<{
  hasDeck: boolean
  totalCards: number
  dueCards: number
  deckId: string | null
}> {
  try {
    const { deck, cards } = await getFlashcardDeck(resourceId)
    if (!deck) {
      return { hasDeck: false, totalCards: 0, dueCards: 0, deckId: null }
    }

    const now = new Date()
    const dueCards = cards.filter((c) => {
      if (!c.review || !c.review.due_at) return true
      return new Date(c.review.due_at) <= now
    }).length

    return {
      hasDeck: true,
      totalCards: cards.length,
      dueCards,
      deckId: deck.id,
    }
  } catch {
    return { hasDeck: false, totalCards: 0, dueCards: 0, deckId: null }
  }
}

// ---------------------------------------------------------------------------
// Doubt AI Chat (feat/doubt-chat)
// ---------------------------------------------------------------------------

/**
 * Fetches an existing doubt chat thread and its messages.
 */
export async function getDoubtThread(
  threadId: string
): Promise<{ thread: DoubtThread | null; messages: DoubtMessage[] }> {
  if (await isSupabaseOnline()) {
    try {
      const { user } = await requireAuth()
      const supabase = await createClient()

      const { data: thread, error: threadError } = await supabase
        .from('doubt_threads')
        .select('*')
        .eq('id', threadId)
        .single()

      if (!threadError && thread && thread.user_id === user.id) {
        const { data: messages } = await supabase
          .from('doubt_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })

        return {
          thread: thread as DoubtThread,
          messages: (messages || []) as DoubtMessage[],
        }
      }
    } catch {
      // Offline
    }
  }

  const isValidUuid =
    typeof threadId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)

  return {
    thread: {
      id: isValidUuid ? threadId : '00000000-0000-0000-0040-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      resource_id: '00000000-0000-0000-0010-000000000001',
      subject_id: null,
      title: 'Doubt Clearing Session',
      created_at: '2026-10-04T10:00:00Z',
      updated_at: '2026-10-04T10:00:00Z',
    },
    messages: [],
  }
}

/**
 * Gets or initializes a doubt chat thread for the current user scoped to a resource or subject.
 */
export async function getOrCreateDoubtThread(
  resourceId?: string,
  subjectId?: string
): Promise<{ thread: DoubtThread | null; messages: DoubtMessage[] }> {
  if (await isSupabaseOnline()) {
    try {
      const { user } = await requireAuth()
      const supabase = await createClient()

      let query = supabase
        .from('doubt_threads')
        .select('*')
        .eq('user_id', user.id)

      if (resourceId) {
        query = query.eq('resource_id', resourceId)
      } else if (subjectId) {
        query = query.eq('subject_id', subjectId)
      }

      const { data: existing } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

      if (existing) {
        return getDoubtThread(existing.id)
      }

      // Create new thread
      let title = 'Doubt Clearing Session'
      if (resourceId) {
        const { data: res } = await supabase.from('resources').select('title').eq('id', resourceId).single()
        if (res?.title) title = `Doubts: ${res.title}`
      } else if (subjectId) {
        const { data: sub } = await supabase.from('subjects').select('name').eq('id', subjectId).single()
        if (sub?.name) title = `Doubts: ${sub.name}`
      }

      const { data: newThread, error: createError } = await supabase
        .from('doubt_threads')
        .insert({
          user_id: user.id,
          resource_id: resourceId ?? null,
          subject_id: subjectId ?? null,
          title,
        })
        .select('*')
        .single()

      if (!createError && newThread) {
        return {
          thread: newThread as DoubtThread,
          messages: [],
        }
      }
    } catch {
      // Offline
    }
  }

  const mockRes = MOCK_RESOURCES.find((r) => r.id === resourceId)
  const idSuffix = (resourceId || subjectId || '000000000001').replace(/-/g, '').slice(-12).padStart(12, '0')
  const mockThreadId = `00000000-0000-0000-0040-${idSuffix}`

  return {
    thread: {
      id: mockThreadId,
      user_id: '00000000-0000-0000-0000-000000000001',
      resource_id: resourceId ?? null,
      subject_id: subjectId ?? null,
      title: mockRes ? `Doubts: ${mockRes.title}` : 'Doubt Clearing Session',
      created_at: '2026-10-04T10:00:00Z',
      updated_at: '2026-10-04T10:00:00Z',
    },
    messages: [],
  }
}

/**
 * Searches for similar chunks using vector similarity (RPC match_resource_chunks)
 * with robust fallback to resource_chunks text query.
 */
export async function searchSimilarChunks(
  embedding: number[],
  options?: {
    resourceId?: string
    subjectId?: string
    threshold?: number
    count?: number
  }
): Promise<MatchedChunk[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('match_resource_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: options?.threshold ?? 0.25,
      match_count: options?.count ?? 5,
      filter_resource_id: options?.resourceId ?? null,
      filter_subject_id: options?.subjectId ?? null,
    })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: { id: string; resource_id: string; chunk_index?: number; page_number: number | null; content: string; similarity?: number }) => ({
        id: row.id,
        resource_id: row.resource_id,
        chunk_index: row.chunk_index,
        page_number: row.page_number,
        content: row.content,
        similarity: row.similarity ?? 0.8,
      }))
    }

    let chunkQuery = supabase
      .from('resource_chunks')
      .select('id, resource_id, chunk_index, page_number, content')

    if (options?.resourceId) {
      chunkQuery = chunkQuery.eq('resource_id', options.resourceId)
    }

    const { data: fallbackChunks } = await chunkQuery.limit(options?.count ?? 5)
    if (fallbackChunks && fallbackChunks.length > 0) {
      return fallbackChunks.map((c: { id: string; resource_id: string; chunk_index?: number; page_number: number | null; content: string }, i: number) => ({
        id: c.id,
        resource_id: c.resource_id,
        chunk_index: c.chunk_index,
        page_number: c.page_number,
        content: c.content,
        similarity: Math.max(0.3, 0.85 - i * 0.1),
      }))
    }
  } catch {
    // Offline
  }

  // Fallback to MOCK_CHUNKS
  let mockChunks = MOCK_CHUNKS
  if (options?.resourceId) {
    const filtered = mockChunks.filter((c) => c.resource_id === options.resourceId)
    if (filtered.length > 0) {
      mockChunks = filtered
    }
  }
  return mockChunks.slice(0, options?.count ?? 5).map((c, i) => ({
    id: c.id,
    resource_id: c.resource_id,
    chunk_index: c.chunk_index,
    page_number: c.page_number ?? null,
    content: c.content,
    similarity: Math.max(0.3, 0.85 - i * 0.1),
  }))
}



