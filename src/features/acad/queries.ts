'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/shared/auth/guards'
import type { ResourceFilterInput, Subject, Resource } from './schema'

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
  const supabase = await createClient()
  let query = supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })

  if (opts?.year)   query = query.eq('year', opts.year)
  if (opts?.branch) query = query.eq('branch', opts.branch)

  const { data, error } = await query
  if (error) {
    console.error('[acad/queries] getSubjects error:', error.message)
    return []
  }
  return data as Subject[]
}

// ---------------------------------------------------------------------------
// Resources — student browse
// ---------------------------------------------------------------------------

/** Fetch the set of resource IDs saved by the current user. */
export async function getSavedResourceIds(): Promise<string[]> {
  try {
    const { user } = await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('saved_resources')
      .select('resource_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('[acad/queries] getSavedResourceIds error:', error.message)
      return []
    }

    return (data ?? []).map((row) => row.resource_id)
  } catch {
    return []
  }
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
  const supabase = await createClient()
  const savedList = await getSavedResourceIds()
  const savedIds = new Set(savedList)

  // If filtered specifically by saved bookmarks and user has none, return empty list early
  if (filter.saved && savedList.length === 0) {
    return []
  }

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
  if (error) {
    console.error('[acad/queries] getApprovedResources error:', error.message)
    return []
  }
  return (data as Resource[]).map((r) => ({
    ...r,
    is_saved: savedIds.has(r.id),
  }))
}


/** Returns the student's own pending uploads (visible only to the uploader). */
export async function getMyPendingUploads(): Promise<Resource[]> {
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

  if (error) {
    console.error('[acad/queries] getMyPendingUploads error:', error.message)
    return []
  }
  return data as Resource[]
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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('resources')
    .select(`
      *,
      subject:subjects(id, name, code, year, branch),
      uploader:profiles!resources_uploader_id_fkey(full_name, role_primary)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[acad/queries] getResourcesForTeacher error:', error.message)
    return []
  }
  return data as Resource[]
}

/** Returns only pending resources for the teacher's approval queue. */
export async function getPendingApprovals(): Promise<Resource[]> {
  await requireRole(['teacher', 'admin'])
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

  if (error) {
    console.error('[acad/queries] getPendingApprovals error:', error.message)
    return []
  }
  return data as Resource[]
}

// ---------------------------------------------------------------------------
// Resource detail
// ---------------------------------------------------------------------------

/** Single resource by ID. Also returns a short-lived signed URL for download. */
export async function getResourceWithSignedUrl(
  resourceId: string
): Promise<{ resource: Resource; signedUrl: string } | null> {
  await requireAuth()
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

  if (error || !resource) {
    console.error('[acad/queries] getResourceWithSignedUrl error:', error?.message)
    return null
  }

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

  if (urlError || !urlData?.signedUrl) {
    console.error('[acad/queries] signedUrl error:', urlError?.message)
    return null
  }

  const savedList = await getSavedResourceIds()
  const isSaved = savedList.includes(resource.id)

  return {
    resource: { ...(resource as Resource), is_saved: isSaved },
    signedUrl: urlData.signedUrl,
  }
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch configurable max file size from app_config (returns number in MB). */
export async function getMaxFileSizeMb(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'resource_max_file_size_mb')
    .single()
  return data?.value ? parseInt(data.value, 10) : 50
}
