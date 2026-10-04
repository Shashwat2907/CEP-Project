import { describe, it, expect } from 'vitest'
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ReportLostItemInputSchema,
  ReportFoundItemInputSchema,
  SubmitClaimInputSchema,
  ConfirmPickupInputSchema,
  LOST_FOUND_STATUS_METAS,
  type LostFoundItemRecord,
} from '@/features/lostfound/schema'
import {
  reportLostItemAction,
  reportFoundItemAction,
  getLostFoundItemsAction,
  submitClaimAction,
  reviewClaimAction,
  confirmPickupWithDigitalIdAction,
  reportAbuseAction,
  getAdminDisposalListAction,
} from '@/features/lostfound/actions'
import { LostFoundDashboard } from '@/features/lostfound/components/lost-found-dashboard'

describe('Lost & Found Schema & Status Vocabulary (DESIGN.MD §9, PLAN.MD §5.5)', () => {
  it('strictly adheres to DESIGN.MD §9 status vocabulary', () => {
    expect(LOST_FOUND_STATUS_METAS.reported.label).toBe('Reported')
    expect(LOST_FOUND_STATUS_METAS.matched.label).toBe('Matched')
    expect(LOST_FOUND_STATUS_METAS.claim_under_review.label).toBe('Claim under review')
    expect(LOST_FOUND_STATUS_METAS.ready_for_pickup.label).toBe('Ready for pickup')
    expect(LOST_FOUND_STATUS_METAS.returned.label).toBe('Returned')
    expect(LOST_FOUND_STATUS_METAS.expired.label).toBe('Expired')
  })

  it('validates report found item schema requiring secret detail and question', () => {
    const valid = ReportFoundItemInputSchema.safeParse({
      category: 'electronics',
      title: 'Sony Headphones',
      description: 'Found on table near digital section',
      hiddenDetail: 'Red scratch on left ear cup',
      verificationQuestion: 'What color scratch is on the headphone?',
      location: 'Central Library - Digital Section',
      dropoffPoint: 'Central Library Reception Desk',
      incidentDate: '2026-10-04',
      timeWindow: 'Afternoon',
      photoUrls: [],
    })
    expect(valid.success).toBe(true)

    // Missing hidden detail
    const missingHidden = ReportFoundItemInputSchema.safeParse({
      category: 'electronics',
      title: 'Sony Headphones',
      description: 'Found on table',
      hiddenDetail: '',
      verificationQuestion: 'What color?',
      location: 'Central Library - Digital Section',
      dropoffPoint: 'Central Library Reception Desk',
      incidentDate: '2026-10-04',
    })
    expect(missingHidden.success).toBe(false)
  })

  it('validates pickup confirmation requiring claimant digital ID', () => {
    const valid = ConfirmPickupInputSchema.safeParse({
      itemId: '11111111-2222-3333-4444-555555555555',
      claimId: '22222222-3333-4444-5555-666666666666',
      claimantDigitalId: '23BCE1042',
      deskNotes: 'Verified against rotating QR card',
    })
    expect(valid.success).toBe(true)

    const missingId = ConfirmPickupInputSchema.safeParse({
      itemId: '11111111-2222-3333-4444-555555555555',
      claimId: '22222222-3333-4444-5555-666666666666',
      claimantDigitalId: '',
    })
    expect(missingId.success).toBe(false)
  })
})

describe('Lost & Found Server Actions Lifecycle (PLAN.MD §5.5)', () => {
  it('reports a found item and generates a finder handover code', async () => {
    const res = await reportFoundItemAction({
      category: 'keys',
      title: 'Bunch of 3 Keys with Batman Lanyard',
      description: 'Found on bench outside block A',
      hiddenDetail: 'One key has a green plastic tag',
      verificationQuestion: 'What color tag is on one of the keys?',
      location: 'Block A - Ground Floor',
      dropoffPoint: 'Main Gate Security Desk',
      incidentDate: '2026-10-04',
      photoUrls: [],
    })

    expect(res.ok).toBe(true)
    expect(res.data?.handoverCode).toBeDefined()
    expect(res.data?.handoverCode).toContain('HO-')
    expect(res.data?.status).toBe('reported')
  })

  it('reports a lost item', async () => {
    const res = await reportLostItemAction({
      category: 'books_stationery',
      title: 'Operating Systems Silberschatz 10th Edition',
      description: 'Hardcover book left in reading hall',
      location: 'Central Library - Reading Hall',
      incidentDate: '2026-10-04',
      photoUrls: [],
    })

    expect(res.ok).toBe(true)
    expect(res.data?.title).toContain('Operating Systems')
    expect(res.data?.status).toBe('reported')
  })

  it('conceals hidden detail from general queries', async () => {
    const items = await getLostFoundItemsAction()
    expect(items.length).toBeGreaterThan(0)

    // Items reported by others should NOT reveal hiddenDetail
    const otherFound = items.find(
      (i) => i.type === 'found' && i.reporterId !== '00000000-0000-0000-0000-000000000001'
    )
    if (otherFound) {
      expect(otherFound.hiddenDetail).toBeNull()
    }
  })

  it('completes the full claim -> desk review -> digital ID pickup lifecycle', async () => {
    const dummyItemId = '11111111-2222-3333-4444-555555555555'

    // 1. Submit Claim
    const claimRes = await submitClaimAction({
      itemId: dummyItemId,
      answerToQuestion: 'The keychain has a Batman metal symbol',
      additionalProof: 'Purchased on Amazon in 2025',
    })
    expect(claimRes.ok).toBe(true)

    // 2. Desk Reviews Claim (Approve)
    const reviewRes = await reviewClaimAction({
      claimId: claimRes.claimId || 'claim-1',
      decision: 'approve',
      deskNotes: 'Answers matched secret detail',
    })
    expect(reviewRes.ok).toBe(true)

    // 3. Confirm Pickup with Claimant's Digital ID
    const pickupRes = await confirmPickupWithDigitalIdAction({
      itemId: dummyItemId,
      claimId: claimRes.claimId || 'claim-1',
      claimantDigitalId: '23BCE1042',
      deskNotes: 'Handover complete at Main Gate Desk',
    })
    expect(pickupRes.ok).toBe(true)
    expect(pickupRes.message).toContain('23BCE1042')
  })

  it('supports reporting abuse on a suspicious listing', async () => {
    const res = await reportAbuseAction({
      itemId: '11111111-2222-3333-4444-555555555555',
      reason: 'Prank post containing offensive text',
    })
    expect(res.ok).toBe(true)
  })
})

describe('Lost & Found UI Dashboard (DESIGN.MD §8, §9)', () => {
  const sampleItems: LostFoundItemRecord[] = [
    {
      id: 'i1',
      type: 'found',
      reporterId: 'u2',
      category: 'electronics',
      title: 'Sony WH-1000XM4 Headphones',
      description: 'Found in digital section reading area.',
      verificationQuestion: 'What sticker is on the side?',
      location: 'Central Library - Digital Section',
      dropoffPoint: 'Central Library Reception Desk',
      photoUrls: [],
      incidentDate: '2026-10-04',
      status: 'reported',
      isReportedAbuse: false,
      createdAt: '2026-10-04T10:00:00Z',
      updatedAt: '2026-10-04T10:00:00Z',
    },
    {
      id: 'i2',
      type: 'found',
      reporterId: 'u3',
      category: 'cards_id',
      title: 'Student ID Card: Aarav Sharma',
      description: 'Found near cafeteria entrance.',
      verificationQuestion: 'What is the roll number?',
      location: 'Main Canteen / Food Court',
      dropoffPoint: 'Main Gate Security Desk',
      photoUrls: [],
      incidentDate: '2026-10-04',
      status: 'ready_for_pickup',
      isReportedAbuse: false,
      createdAt: '2026-10-04T11:00:00Z',
      updatedAt: '2026-10-04T11:30:00Z',
    },
  ]

  it('renders dashboard with items and status vocabulary chips', () => {
    render(<LostFoundDashboard initialItems={sampleItems} />)

    expect(screen.getByText('Campus Lost & Found')).toBeInTheDocument()
    expect(screen.getByText('Sony WH-1000XM4 Headphones')).toBeInTheDocument()
    expect(screen.getByText('Student ID Card: Aarav Sharma')).toBeInTheDocument()

    // Status chips from DESIGN.MD §9
    expect(screen.getAllByText('Reported').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ready for pickup').length).toBeGreaterThan(0)
  })

  it('opens Claim dialog when clicking Claim Item button', () => {
    render(<LostFoundDashboard initialItems={sampleItems} />)

    const claimBtn = screen.getByRole('button', { name: /Claim Item/i })
    fireEvent.click(claimBtn)

    expect(screen.getByText('Claim Found Item')).toBeInTheDocument()
    expect(screen.getByText(/"What sticker is on the side\?"/i)).toBeInTheDocument()
  })

  it('opens Confirm Pickup with Digital ID dialog for ready_for_pickup items', () => {
    render(<LostFoundDashboard initialItems={sampleItems} />)

    const pickupBtn = screen.getByRole('button', { name: /Confirm Pickup/i })
    fireEvent.click(pickupBtn)

    expect(screen.getByText('Confirm Pickup with Digital ID')).toBeInTheDocument()
    expect(screen.getByText(/Claimant Digital ID \/ Roll Number/i)).toBeInTheDocument()
  })
})
