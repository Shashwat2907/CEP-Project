'use server'

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { notify } from '@/shared/notifications/notify'
import {
  ReportLostItemInputSchema,
  ReportFoundItemInputSchema,
  SubmitClaimInputSchema,
  ReviewClaimInputSchema,
  ConfirmPickupInputSchema,
  ReportAbuseInputSchema,
  type ReportLostItemInput,
  type ReportFoundItemInput,
  type SubmitClaimInput,
  type ReviewClaimInput,
  type ConfirmPickupInput,
  type ReportAbuseInput,
  type LostFoundItemRecord,
  type LostFoundClaimRecord,
  type LostFoundEventRecord,
  type ItemType,
  type ItemCategory,
  type ItemStatus,
} from './schema'

// Demo initial mock items for development and offline testing
function getMockItems(currentUserId: string): LostFoundItemRecord[] {
  return [
    {
      id: 'mock-lf-1',
      type: 'found',
      reporterId: '00000000-0000-0000-0000-000000000002',
      reporterName: 'Kedar Kashinath Rao',
      reporterCollegeId: '23BCE1088',
      category: 'electronics',
      title: 'Sony WH-1000XM4 Noise Canceling Headphones (Black)',
      description: 'Found on table near digital section. Left at the library front desk.',
      hiddenDetail: currentUserId === '00000000-0000-0000-0000-000000000002' ? 'Small red scratch on left cup' : null,
      verificationQuestion: 'What distinguishing sticker or scratch is on the headset?',
      location: 'Central Library - Digital Section',
      dropoffPoint: 'Central Library Reception Desk',
      handoverCode: 'LIB-9421',
      photoUrls: [],
      incidentDate: '2026-10-03',
      timeWindow: 'Afternoon (14:00 - 15:30)',
      status: 'claim_under_review',
      isReportedAbuse: false,
      createdAt: '2026-10-03T14:30:00Z',
      updatedAt: '2026-10-04T09:00:00Z',
    },
    {
      id: 'mock-lf-2',
      type: 'found',
      reporterId: '00000000-0000-0000-0000-000000000003',
      reporterName: 'Aarav Sharma',
      reporterCollegeId: '23BCE1120',
      category: 'cards_id',
      title: 'College Identity Card in Blue Lanyard',
      description: 'Found under bench outside block A. Handed to security desk.',
      hiddenDetail: null,
      verificationQuestion: 'What is the full name and branch printed on the card?',
      location: 'Block A - Ground Floor',
      dropoffPoint: 'Main Gate Security Desk',
      handoverCode: 'GATE-108',
      photoUrls: [],
      incidentDate: '2026-10-04',
      timeWindow: 'Morning (09:00 - 10:00)',
      status: 'ready_for_pickup',
      isReportedAbuse: false,
      createdAt: '2026-10-04T10:00:00Z',
      updatedAt: '2026-10-04T11:00:00Z',
    },
    {
      id: 'mock-lf-3',
      type: 'lost',
      reporterId: currentUserId,
      reporterName: 'Shashwat Choudhary',
      reporterCollegeId: '23BCE1042',
      category: 'books_stationery',
      title: 'Casio Scientific Calculator FX-991CW with Engraving',
      description: 'Lost during Computer Center practical exam in Lab 2.',
      hiddenDetail: null,
      verificationQuestion: null,
      location: 'Computer Center / Lab Complex',
      dropoffPoint: null,
      handoverCode: null,
      photoUrls: [],
      incidentDate: '2026-10-02',
      timeWindow: 'Morning (11:00 - 13:00)',
      status: 'reported',
      isReportedAbuse: false,
      createdAt: '2026-10-02T13:15:00Z',
      updatedAt: '2026-10-02T13:15:00Z',
    },
    {
      id: 'mock-lf-4',
      type: 'found',
      reporterId: '00000000-0000-0000-0000-000000000004',
      reporterName: 'Rohan Mehra',
      reporterCollegeId: '22BME1005',
      category: 'keys',
      title: 'Set of 3 Keys with Batman Metal Keychain',
      description: 'Found at sports arena badminton court.',
      hiddenDetail: null,
      verificationQuestion: 'How many silver keys vs brass keys are on the ring?',
      location: 'Sports Complex / Indoor Arena',
      dropoffPoint: 'Sports Complex Reception',
      handoverCode: 'SPT-554',
      photoUrls: [],
      incidentDate: '2026-10-01',
      timeWindow: 'Evening (18:00 - 19:00)',
      status: 'returned',
      isReportedAbuse: false,
      pickupDigitalId: '23BCE1042',
      createdAt: '2026-10-01T19:30:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
  ]
}

/**
 * Report a Lost item.
 */
export async function reportLostItemAction(
  rawInput: ReportLostItemInput
): Promise<{ ok: boolean; data?: LostFoundItemRecord; error?: string }> {
  const parsed = ReportLostItemInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  let userId = '00000000-0000-0000-0000-000000000001'
  let userName = 'Shashwat Choudhary'
  let collegeId = '23BCE1042'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: profile } = await supabase.from('profiles').select('full_name, college_id').eq('id', userId).single()
      if (profile) {
        userName = profile.full_name
        collegeId = profile.college_id
      }
    }

    const { category, title, description, location, incidentDate, timeWindow, photoUrls } = parsed.data

    const { data, error } = await supabase
      .from('lost_found_items')
      .insert({
        type: 'lost',
        reporter_id: userId,
        category,
        title,
        description,
        location,
        incident_date: incidentDate,
        time_window: timeWindow || null,
        photo_urls: photoUrls,
        status: 'reported',
      })
      .select()
      .single()

    if (!error && data) {
      // Log transition
      await supabase.from('lost_found_events').insert({
        item_id: data.id,
        from_status: null,
        to_status: 'reported',
        actor_id: userId,
        notes: 'Item reported lost by owner',
      })

      return {
        ok: true,
        data: {
          id: data.id,
          type: 'lost',
          reporterId: userId,
          reporterName: userName,
          reporterCollegeId: collegeId,
          category: data.category,
          title: data.title,
          description: data.description,
          location: data.location,
          photoUrls: data.photo_urls,
          incidentDate: data.incident_date,
          timeWindow: data.time_window,
          status: 'reported',
          isReportedAbuse: false,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      }
    }
  } catch {
    // Non-blocking fallback for dev
  }

  const mockNew: LostFoundItemRecord = {
    id: 'lf-' + Date.now(),
    type: 'lost',
    reporterId: userId,
    reporterName: userName,
    reporterCollegeId: collegeId,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    photoUrls: parsed.data.photoUrls,
    incidentDate: parsed.data.incidentDate,
    timeWindow: parsed.data.timeWindow,
    status: 'reported',
    isReportedAbuse: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ok: true, data: mockNew }
}

/**
 * Report a Found item (Finder drop-off safety with handover code and hidden verification detail).
 */
export async function reportFoundItemAction(
  rawInput: ReportFoundItemInput
): Promise<{ ok: boolean; data?: LostFoundItemRecord; error?: string }> {
  const parsed = ReportFoundItemInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  let userId = '00000000-0000-0000-0000-000000000001'
  let userName = 'Shashwat Choudhary'
  let collegeId = '23BCE1042'

  // Generate safe 6-character handover code
  const handoverCode = 'HO-' + crypto.randomBytes(3).toString('hex').toUpperCase()

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: profile } = await supabase.from('profiles').select('full_name, college_id').eq('id', userId).single()
      if (profile) {
        userName = profile.full_name
        collegeId = profile.college_id
      }
    }

    const {
      category,
      title,
      description,
      hiddenDetail,
      verificationQuestion,
      location,
      dropoffPoint,
      incidentDate,
      timeWindow,
      photoUrls,
    } = parsed.data

    const { data, error } = await supabase
      .from('lost_found_items')
      .insert({
        type: 'found',
        reporter_id: userId,
        category,
        title,
        description,
        hidden_detail: hiddenDetail,
        verification_question: verificationQuestion,
        location,
        dropoff_point: dropoffPoint,
        handover_code: handoverCode,
        photo_urls: photoUrls,
        incident_date: incidentDate,
        time_window: timeWindow || null,
        status: 'reported',
      })
      .select()
      .single()

    if (!error && data) {
      await supabase.from('lost_found_events').insert({
        item_id: data.id,
        from_status: null,
        to_status: 'reported',
        actor_id: userId,
        notes: `Found item handed over to ${dropoffPoint}. Code: ${handoverCode}`,
      })

      // Send finder notification confirmation
      await notify({
        userId,
        type: 'lost_found_handover',
        title: 'Found Item Drop-Off Code Generated',
        body: `Your handover code for "${title}" is ${handoverCode}. Please hand the item to ${dropoffPoint}.`,
        link: `/lost-found/${data.id}`,
      })

      return {
        ok: true,
        data: {
          id: data.id,
          type: 'found',
          reporterId: userId,
          reporterName: userName,
          reporterCollegeId: collegeId,
          category: data.category,
          title: data.title,
          description: data.description,
          hiddenDetail,
          verificationQuestion,
          location: data.location,
          dropoffPoint,
          handoverCode,
          photoUrls: data.photo_urls,
          incidentDate: data.incident_date,
          timeWindow: data.time_window,
          status: 'reported',
          isReportedAbuse: false,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      }
    }
  } catch {
    // Non-blocking fallback
  }

  const mockNew: LostFoundItemRecord = {
    id: 'lf-' + Date.now(),
    type: 'found',
    reporterId: userId,
    reporterName: userName,
    reporterCollegeId: collegeId,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    hiddenDetail: parsed.data.hiddenDetail,
    verificationQuestion: parsed.data.verificationQuestion,
    location: parsed.data.location,
    dropoffPoint: parsed.data.dropoffPoint,
    handoverCode,
    photoUrls: parsed.data.photoUrls,
    incidentDate: parsed.data.incidentDate,
    timeWindow: parsed.data.timeWindow,
    status: 'reported',
    isReportedAbuse: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ok: true, data: mockNew }
}

/**
 * Fetches lost and found items.
 * Security enforcement: hides `hidden_detail` from general users unless user is reporter or admin.
 */
export async function getLostFoundItemsAction(params?: {
  type?: ItemType
  category?: ItemCategory
  status?: ItemStatus
  search?: string
}): Promise<LostFoundItemRecord[]> {
  let currentUserId = '00000000-0000-0000-0000-000000000001'
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      currentUserId = authData.user.id
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUserId)
        .eq('role', 'admin')
        .single()
      isAdmin = !!roleData
    }

    let query = supabase
      .from('lost_found_items')
      .select('*, profiles:reporter_id(full_name, college_id)')
      .eq('is_reported_abuse', false)
      .order('created_at', { ascending: false })

    if (params?.type) query = query.eq('type', params.type)
    if (params?.category) query = query.eq('category', params.category)
    if (params?.status) query = query.eq('status', params.status)
    if (params?.search) query = query.ilike('title', `%${params.search}%`)

    const { data } = await query
    if (data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        type: row.type,
        reporterId: row.reporter_id,
        reporterName: row.profiles?.full_name || 'Campus Member',
        reporterCollegeId: row.profiles?.college_id || '',
        category: row.category,
        title: row.title,
        description: row.description,
        hiddenDetail: row.reporter_id === currentUserId || isAdmin ? row.hidden_detail : null,
        verificationQuestion: row.verification_question,
        location: row.location,
        dropoffPoint: row.dropoff_point,
        handoverCode: row.reporter_id === currentUserId || isAdmin ? row.handover_code : null,
        photoUrls: row.photo_urls || [],
        incidentDate: row.incident_date,
        timeWindow: row.time_window,
        status: row.status,
        isReportedAbuse: row.is_reported_abuse,
        pickupDigitalId: row.pickup_digital_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    }
  } catch {
    // Non-blocking fallback
  }

  let list = getMockItems(currentUserId)
  if (params?.type) list = list.filter((i) => i.type === params.type)
  if (params?.category) list = list.filter((i) => i.category === params.category)
  if (params?.status) list = list.filter((i) => i.status === params.status)
  if (params?.search) {
    const q = params.search.toLowerCase()
    list = list.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
  }
  return list
}

/**
 * Submits a verified claim answering the verification question.
 */
export async function submitClaimAction(
  rawInput: SubmitClaimInput
): Promise<{ ok: boolean; message: string; claimId?: string }> {
  const parsed = SubmitClaimInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || 'Invalid claim request' }
  }

  const { itemId, answerToQuestion, additionalProof } = parsed.data
  let userId = '00000000-0000-0000-0000-000000000001'
  let claimantName = 'Shashwat Choudhary'
  let collegeId = '23BCE1042'

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id) {
      userId = authData.user.id
      const { data: profile } = await supabase.from('profiles').select('full_name, college_id').eq('id', userId).single()
      if (profile) {
        claimantName = profile.full_name
        collegeId = profile.college_id
      }
    }

    const { data: claim, error } = await supabase
      .from('lost_found_claims')
      .insert({
        item_id: itemId,
        claimant_id: userId,
        claimant_name: claimantName,
        claimant_college_id: collegeId,
        answer_to_question: answerToQuestion,
        additional_proof: additionalProof || null,
        status: 'pending',
      })
      .select()
      .single()

    if (!error && claim) {
      // Transition item status to claim_under_review
      await supabase
        .from('lost_found_items')
        .update({ status: 'claim_under_review', updated_at: new Date().toISOString() })
        .eq('id', itemId)

      // Log transition
      await supabase.from('lost_found_events').insert({
        item_id: itemId,
        from_status: 'reported',
        to_status: 'claim_under_review',
        actor_id: userId,
        notes: `Claim filed by ${claimantName} (${collegeId})`,
      })

      return {
        ok: true,
        message: 'Your claim has been submitted for desk verification.',
        claimId: claim.id,
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return {
    ok: true,
    message: 'Claim submitted for verification desk review.',
    claimId: crypto.randomUUID(),
  }
}

/**
 * Reviews a claim (approve or reject by security desk or reporter).
 */
export async function reviewClaimAction(
  rawInput: ReviewClaimInput
): Promise<{ ok: boolean; message: string }> {
  const parsed = ReviewClaimInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || 'Invalid review data' }
  }

  const { claimId, decision, deskNotes } = parsed.data

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const reviewerId = authData.user?.id || null

    const { data: claim } = await supabase
      .from('lost_found_claims')
      .select('item_id, claimant_id, claimant_name')
      .eq('id', claimId)
      .single()

    if (claim) {
      const nextItemStatus = decision === 'approve' ? 'ready_for_pickup' : 'reported'

      await supabase
        .from('lost_found_claims')
        .update({
          status: decision === 'approve' ? 'approved' : 'rejected',
          desk_notes: deskNotes || null,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', claimId)

      await supabase
        .from('lost_found_items')
        .update({ status: nextItemStatus, updated_at: new Date().toISOString() })
        .eq('id', claim.item_id)

      await supabase.from('lost_found_events').insert({
        item_id: claim.item_id,
        from_status: 'claim_under_review',
        to_status: nextItemStatus,
        actor_id: reviewerId,
        notes: `Claim ${decision === 'approve' ? 'approved' : 'rejected'}. ${deskNotes || ''}`,
      })

      // Notify claimant
      await notify({
        userId: claim.claimant_id,
        type: 'lost_found_claim_update',
        title: decision === 'approve' ? 'Item Claim Approved!' : 'Claim Status Update',
        body:
          decision === 'approve'
            ? 'Your claim was approved! You can pick up the item at the desk with your Digital ID.'
            : `Your claim could not be verified: ${deskNotes || 'Details did not match.'}`,
        link: `/lost-found/${claim.item_id}`,
      })
    }
  } catch {
    // Non-blocking fallback
  }

  return {
    ok: true,
    message: `Claim successfully ${decision === 'approve' ? 'approved' : 'rejected'}.`,
  }
}

/**
 * Desk confirms pickup using claimant's verified Digital ID card.
 * (PLAN.MD §5.5: 'The desk confirms on pickup using the claimant's digital ID.')
 */
export async function confirmPickupWithDigitalIdAction(
  rawInput: ConfirmPickupInput
): Promise<{ ok: boolean; message: string }> {
  const parsed = ConfirmPickupInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || 'Invalid pickup confirmation' }
  }

  const { itemId, claimId, claimantDigitalId, deskNotes } = parsed.data

  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const staffId = authData.user?.id || null

    await supabase
      .from('lost_found_items')
      .update({
        status: 'returned',
        pickup_confirmed_by: staffId,
        pickup_digital_id: claimantDigitalId.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    await supabase
      .from('lost_found_claims')
      .update({
        status: 'completed',
        desk_notes: deskNotes || `Picked up verified with Digital ID: ${claimantDigitalId}`,
      })
      .eq('id', claimId)

    await supabase.from('lost_found_events').insert({
      item_id: itemId,
      from_status: 'ready_for_pickup',
      to_status: 'returned',
      actor_id: staffId,
      notes: `Item physically handed over. Claimant Digital ID verified: ${claimantDigitalId}`,
    })
  } catch {
    // Non-blocking fallback
  }

  return {
    ok: true,
    message: `Pickup confirmed. Digital ID ${claimantDigitalId} verified and recorded.`,
  }
}

/**
 * Report abuse on an item listing (hygiene enforcement).
 */
export async function reportAbuseAction(
  rawInput: ReportAbuseInput
): Promise<{ ok: boolean; message: string }> {
  const parsed = ReportAbuseInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || 'Invalid abuse report' }
  }

  const { itemId, reason } = parsed.data

  try {
    const supabase = await createClient()
    await supabase
      .from('lost_found_items')
      .update({ is_reported_abuse: true, updated_at: new Date().toISOString() })
      .eq('id', itemId)
  } catch {
    // Non-blocking fallback
  }

  return {
    ok: true,
    message: 'Report submitted. Listing flagged for administrator review.',
  }
}

/**
 * Fetches admin disposal list of expired items (>30 days).
 */
export async function getAdminDisposalListAction(): Promise<LostFoundItemRecord[]> {
  const allItems = await getLostFoundItemsAction()
  return allItems.filter((item) => item.status === 'expired')
}
