'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseOnline } from '@/lib/supabase/status'
import { requireAuth } from '@/shared/auth/guards'
import type { Complaint, ComplaintDomain, DomainAssignee, SimilarComplaint, TrackerFilter } from './schema'
import {
  MOCK_COMPLAINT_DOMAINS,
  MOCK_DOMAIN_ASSIGNEES,
  mockComplaintsStore,
  mockUpvotesStore,
} from './mock-complaints-data'

/**
 * Read-side queries for the Complaints feature.
 * All queries run server-side and enforce RLS, anonymity rules, and offline dev fallback.
 * Source of truth: src/features/complaints/README.md §6
 */

// ---------------------------------------------------------------------------
// 1. Domains & Routing
// ---------------------------------------------------------------------------

/** Fetch all active complaint domains and hierarchy for the submission form. */
export async function getComplaintDomains(): Promise<ComplaintDomain[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('complaint_domains')
        .select('*')
        .order('name', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        // Nest subcategories under their parents
        const rootDomains: ComplaintDomain[] = []
        const subMap = new Map<string, ComplaintDomain[]>()

        for (const item of data as ComplaintDomain[]) {
          if (item.parent_id) {
            const existing = subMap.get(item.parent_id) || []
            existing.push(item)
            subMap.set(item.parent_id, existing)
          } else {
            rootDomains.push(item)
          }
        }

        for (const root of rootDomains) {
          root.subcategories = subMap.get(root.id) || []
        }

        return rootDomains
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return MOCK_COMPLAINT_DOMAINS
}

/** Fetch SLA and routing chain for a specific domain. */
export async function getDomainAssignees(domainId: string): Promise<DomainAssignee[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('domain_assignees')
        .select('*')
        .eq('domain_id', domainId)
        .order('level', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as DomainAssignee[]
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return MOCK_DOMAIN_ASSIGNEES.filter((a) => a.domain_id === domainId)
}

// ---------------------------------------------------------------------------
// 2. Student Complaints (My Complaints)
// ---------------------------------------------------------------------------

/** Fetch complaints created by the logged-in student. */
export async function getMyComplaints(): Promise<Complaint[]> {
  const { user } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          domain:complaint_domains(id, name, sensitive, visibility),
          assignee:profiles!complaints_assigned_to_fkey(full_name, role_primary),
          attachments:complaint_attachments(*)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as Complaint[]
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return mockComplaintsStore.filter(
    (c) => c.author_id === user.id || c.author?.role_primary === 'student'
  )
}

// ---------------------------------------------------------------------------
// 3. Authority / Handler Queue
// ---------------------------------------------------------------------------

/** Fetch complaints assigned to the logged-in authority handler or admin. */
export async function getAssignedComplaints(): Promise<Complaint[]> {
  const { user, profile } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('complaints')
        .select(`
          *,
          domain:complaint_domains(id, name, sensitive, visibility),
          author:profiles!complaints_author_id_fkey(full_name, role_primary),
          attachments:complaint_attachments(*)
        `)

      if (profile.role_primary !== 'admin') {
        query = query.eq('assigned_to', user.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        const isAdmin = profile.role_primary === 'admin'
        return (data as Complaint[]).map((c) => {
          if (c.anonymous && !isAdmin) {
            return {
              ...c,
              author: { full_name: 'Anonymous Student', role_primary: 'student' },
            }
          }
          return c
        })
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return mockComplaintsStore
}

// ---------------------------------------------------------------------------
// 4. Single Complaint Detail View
// ---------------------------------------------------------------------------

/** Fetch complete details of a single complaint with timeline events. */
export async function getComplaintById(complaintId: string): Promise<Complaint | null> {
  const { user, profile } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          domain:complaint_domains(id, name, sensitive, visibility),
          author:profiles!complaints_author_id_fkey(full_name, role_primary),
          assignee:profiles!complaints_assigned_to_fkey(full_name, role_primary),
          events:complaint_events(
            *,
            actor:profiles!complaint_events_actor_id_fkey(full_name, role_primary)
          ),
          attachments:complaint_attachments(*)
        `)
        .eq('id', complaintId)
        .single()

      if (!error && data) {
        const complaint = data as Complaint
        const isAuthor = complaint.author_id === user.id
        const isAdmin = profile.role_primary === 'admin'

        if (complaint.anonymous && !isAuthor && !isAdmin) {
          complaint.author = { full_name: 'Anonymous Student', role_primary: 'student' }
        }

        if (!complaint.domain?.sensitive) {
          const { data: upvoteRow } = await supabase
            .from('complaint_upvotes')
            .select('user_id')
            .eq('complaint_id', complaintId)
            .eq('user_id', user.id)
            .maybeSingle()

          complaint.has_upvoted = !!upvoteRow
        }

        return complaint
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  const found = mockComplaintsStore.find((c) => c.id === complaintId)
  if (!found) return null
  const key = `${complaintId}:${user.id}`
  return {
    ...found,
    has_upvoted: mockUpvotesStore.has(key),
  }
}

// ---------------------------------------------------------------------------
// 5. Public / Community Tracker
// ---------------------------------------------------------------------------

/**
 * Fetch non-sensitive, public complaints for community transparency.
 * Never includes sensitive categories (e.g. Harassment & Ragging).
 */
export async function getPublicTrackerComplaints(): Promise<Complaint[]> {
  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          domain:complaint_domains!inner(id, name, sensitive, visibility),
          author:profiles!complaints_author_id_fkey(full_name, role_primary)
        `)
        .eq('domain.sensitive', false)
        .eq('domain.visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && Array.isArray(data)) {
        return (data as Complaint[]).map((c) => {
          if (c.anonymous) {
            return {
              ...c,
              author: { full_name: 'Anonymous Student', role_primary: 'student' },
            }
          }
          return c
        })
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return mockComplaintsStore.filter((c) => !c.domain?.sensitive)
}

// ---------------------------------------------------------------------------
// 6. Admin Attention Complaints
// ---------------------------------------------------------------------------

/** Fetch complaints flagged as "Needs Admin Attention" (accessible by admins). */
export async function getNeedsAdminAttentionComplaints(): Promise<Complaint[]> {
  const { profile } = await requireAuth()
  if (profile.role_primary !== 'admin') {
    return []
  }

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          domain:complaint_domains(id, name, sensitive, visibility),
          author:profiles!complaints_author_id_fkey(full_name, role_primary),
          assignee:profiles!complaints_assigned_to_fkey(full_name, role_primary),
          attachments:complaint_attachments(*)
        `)
        .eq('needs_admin_attention', true)
        .order('updated_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as Complaint[]
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return mockComplaintsStore.filter((c) => c.needs_admin_attention)
}

// ---------------------------------------------------------------------------
// 7. Duplicate Search & Community Tracker
// ---------------------------------------------------------------------------

/**
 * Real-time similarity search for open complaints while typing.
 * Excludes sensitive domains, matches title/body, and returns upvote counts.
 */
export async function searchSimilarComplaints(
  queryText: string,
  domainId?: string
): Promise<SimilarComplaint[]> {
  if (!queryText || queryText.trim().length < 3) {
    return []
  }
  const cleanQuery = queryText.trim().toLowerCase()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('complaints')
        .select(`
          id,
          title,
          body,
          status,
          upvotes_count,
          created_at,
          domain:complaint_domains!inner(name, sensitive)
        `)
        .not('status', 'in', '("resolved","closed")')
        .eq('domain.sensitive', false)
        .or(`title.ilike.%${cleanQuery}%,body.ilike.%${cleanQuery}%`)

      if (domainId) {
        query = query.eq('domain_id', domainId)
      }

      const { data, error } = await query
        .order('upvotes_count', { ascending: false })
        .limit(5)

      if (!error && Array.isArray(data)) {
        return (data as unknown as SimilarComplaint[]) ?? []
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  return mockComplaintsStore
    .filter(
      (c) =>
        !c.domain?.sensitive &&
        c.status !== 'resolved' &&
        c.status !== 'closed' &&
        (!domainId || c.domain_id === domainId) &&
        (c.title.toLowerCase().includes(cleanQuery) || c.body.toLowerCase().includes(cleanQuery))
    )
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      status: c.status,
      upvotes_count: c.upvotes_count ?? 0,
      created_at: c.created_at,
      domain: c.domain ? { name: c.domain.name, sensitive: Boolean(c.domain.sensitive) } : undefined,
    }))
}

/**
 * Public Community Tracker query with upvote statuses, sorting, and filters.
 * Excludes sensitive categories strictly.
 */
export async function getTrackerComplaintsWithUpvotes(
  filter?: TrackerFilter
): Promise<Complaint[]> {
  const { user, profile } = await requireAuth()

  if (await isSupabaseOnline()) {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('complaints')
        .select(`
          *,
          domain:complaint_domains!inner(id, name, sensitive, visibility),
          author:profiles!complaints_author_id_fkey(full_name, role_primary),
          upvotes:complaint_upvotes(user_id)
        `)
        .eq('domain.sensitive', false)
        .eq('domain.visibility', 'public')

      if (filter?.domain_id) {
        query = query.eq('domain_id', filter.domain_id)
      }

      if (filter?.status) {
        query = query.eq('status', filter.status)
      }

      const sortMode = filter?.sort ?? 'longest_pending'
      if (sortMode === 'most_upvoted') {
        query = query.order('upvotes_count', { ascending: false })
      } else if (sortMode === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: true })
      }

      const { data, error } = await query.limit(50)

      if (!error && Array.isArray(data)) {
        const isAdmin = profile.role_primary === 'admin'
        return ((data as unknown[]) ?? []).map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const hasUpvoted = Array.isArray(row.upvotes)
            ? row.upvotes.some((u: { user_id: string }) => u.user_id === user.id)
            : false

          const complaint: Complaint = {
            ...row,
            has_upvoted: hasUpvoted,
            upvotes_count: row.upvotes_count ?? (Array.isArray(row.upvotes) ? row.upvotes.length : 0),
          }

          if (complaint.anonymous && !isAdmin && complaint.author_id !== user.id) {
            complaint.author = { full_name: 'Anonymous Student', role_primary: 'student' }
          }

          return complaint
        })
      }
    } catch {
      // Offline / Supabase error fallback
    }
  }

  // Fallback to mock store
  let list = mockComplaintsStore.filter((c) => !c.domain?.sensitive)
  if (filter?.domain_id) {
    list = list.filter((c) => c.domain_id === filter.domain_id)
  }
  if (filter?.status) {
    list = list.filter((c) => c.status === filter.status)
  }

  return list.map((c) => {
    const key = `${c.id}:${user.id}`
    return {
      ...c,
      has_upvoted: mockUpvotesStore.has(key),
    }
  })
}
