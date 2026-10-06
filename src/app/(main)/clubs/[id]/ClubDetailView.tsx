'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Flag, Users, IndianRupee, Pin, Trash2, Plus, CheckCircle2,
  Clock, XCircle, CreditCard, Loader2, AlertCircle, MessageSquare,
  ChevronDown, ChevronUp, LogOut, ShieldCheck, X,
} from 'lucide-react'
import {
  joinClubAction,
  leaveClubAction,
  approveClubMemberAction,
  rejectClubMemberAction,
  postClubNoticeAction,
  deleteClubNoticeAction,
  initiateClubPaymentAction,
  simulatePaymentWebhookAction,
} from '@/features/clubs/actions'
import type { Club, ClubMember, ClubNotice } from '@/features/clubs/schema'

interface ClubDetailViewProps {
  club: Club
  notices: ClubNotice[]
  pendingRequests: ClubMember[]
  currentUserId: string
  isLead: boolean
}

const STATUS_CONFIG = {
  member: {
    label: 'Member',
    icon: CheckCircle2,
    cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  requested: {
    label: 'Request Pending',
    icon: Clock,
    cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  payment_pending: {
    label: 'Payment Pending',
    icon: CreditCard,
    cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  rejected: {
    label: 'Not Accepted',
    icon: XCircle,
    cls: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  },
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ClubDetailView({
  club,
  notices: initNotices,
  pendingRequests: initPending,
  currentUserId,
  isLead,
}: ClubDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [userStatus, setUserStatus] = useState(club.user_status)
  const [notices, setNotices] = useState(initNotices)
  const [pending, setPending] = useState(initPending)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [noticeBody, setNoticeBody] = useState('')
  const [noticePinned, setNoticePinned] = useState(false)
  const [showPending, setShowPending] = useState(true)

  // Payment checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState<{
    order_id: string
    amount: number
    currency: string
  } | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const statusConfig = userStatus
    ? STATUS_CONFIG[userStatus as keyof typeof STATUS_CONFIG]
    : null
  const StatusIcon = statusConfig?.icon

  const handleJoin = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const res = await joinClubAction({ club_id: club.id })
      if (res.success && res.data) {
        setUserStatus(res.data.status as 'requested' | 'payment_pending')
        if (res.data.needs_payment) {
          setSuccessMsg(
            `Request registered for ${club.name}. Complete payment of ₹${club.fee} to activate your membership.`
          )
          // Open payment checkout modal directly
          setPaymentOrder({
            order_id: res.data.order_id || `order_${club.id.slice(0, 8)}_${Date.now()}`,
            amount: club.fee,
            currency: club.currency || 'INR',
          })
          setShowPaymentModal(true)
        } else {
          setSuccessMsg(
            `Request sent to ${club.name}. Waiting for club lead approval.`
          )
        }
        router.refresh()
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
    })
  }

  const handleOpenPayment = async () => {
    setErrorMsg(null)
    setPaymentLoading(true)
    const res = await initiateClubPaymentAction({ club_id: club.id })
    setPaymentLoading(false)
    if (res.success && res.data) {
      setPaymentOrder({
        order_id: res.data.order_id,
        amount: res.data.amount,
        currency: res.data.currency,
      })
      setShowPaymentModal(true)
    } else if (!res.success) {
      setErrorMsg(res.error)
    }
  }

  const handleSimulatePayment = (status: 'success' | 'failure') => {
    setPaymentLoading(true)
    setErrorMsg(null)
    startTransition(async () => {
      const res = await simulatePaymentWebhookAction({
        club_id: club.id,
        order_id: paymentOrder?.order_id,
        status,
      })
      setPaymentLoading(false)
      setShowPaymentModal(false)

      if (res.success) {
        if (status === 'success') {
          setUserStatus('member')
          setSuccessMsg(
            `🎉 Payment verified via server-side webhook! You are now an active member of ${club.name}.`
          )
          club.member_count += 1
        } else {
          setErrorMsg(
            'Payment simulation failed or was cancelled. Your membership remains payment pending.'
          )
        }
        router.refresh()
      } else {
        setErrorMsg(res.error)
      }
    })
  }

  const handleLeave = () => {
    if (!confirm('Are you sure you want to leave this club?')) return
    setErrorMsg(null)
    startTransition(async () => {
      const res = await leaveClubAction({ club_id: club.id })
      if (res.success) {
        setUserStatus(null)
        setSuccessMsg(`You have left ${club.name}.`)
        router.refresh()
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
    })
  }

  const handleApprove = (userId: string) => {
    startTransition(async () => {
      const res = await approveClubMemberAction({ club_id: club.id, user_id: userId })
      if (res.success) {
        setPending((prev) => prev.filter((m) => m.user_id !== userId))
        setSuccessMsg('Membership request approved.')
        router.refresh()
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
    })
  }

  const handleReject = (userId: string) => {
    startTransition(async () => {
      const res = await rejectClubMemberAction({ club_id: club.id, user_id: userId })
      if (res.success) {
        setPending((prev) => prev.filter((m) => m.user_id !== userId))
        setSuccessMsg('Request rejected.')
        router.refresh()
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
    })
  }

  const handlePostNotice = () => {
    if (!noticeBody.trim()) return
    setErrorMsg(null)
    startTransition(async () => {
      const res = await postClubNoticeAction({
        club_id: club.id,
        body: noticeBody.trim(),
        pinned: noticePinned,
      })
      if (res.success) {
        const newNotice: ClubNotice = {
          id: res.data?.notice_id ?? crypto.randomUUID(),
          club_id: club.id,
          author_id: currentUserId,
          body: noticeBody.trim(),
          pinned: noticePinned,
          created_at: new Date().toISOString(),
        }
        setNotices((prev) => (noticePinned ? [newNotice, ...prev] : [...prev, newNotice]))
        setNoticeBody('')
        setNoticePinned(false)
        setShowNoticeForm(false)
        setSuccessMsg('Notice posted.')
        router.refresh()
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
    })
  }

  const handleDeleteNotice = (noticeId: string) => {
    if (!confirm('Delete this notice?')) return
    startTransition(async () => {
      const res = await deleteClubNoticeAction({ notice_id: noticeId })
      if (res.success) {
        setNotices((prev) => prev.filter((n) => n.id !== noticeId))
        setSuccessMsg('Notice deleted.')
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Cover banner */}
        <div className="h-36 bg-gradient-to-r from-primary/20 via-primary/10 to-surface-sunken flex items-center justify-center">
          <span className="text-7xl select-none">🎯</span>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold font-display text-ink">{club.name}</h1>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                    club.fee > 0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {club.fee > 0 ? `₹${club.fee} / year` : 'Free to Join'}
                </span>
                {isLead && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                    Club Lead
                  </span>
                )}
              </div>

              {club.tagline && (
                <p className="text-ink-muted italic text-sm mb-2">{club.tagline}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-ink-muted mb-3">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {club.member_count} members
                </span>
                {club.lead && (
                  <span>
                    Lead: <strong>{club.lead.full_name}</strong>
                  </span>
                )}
              </div>

              <p className="text-sm text-ink leading-relaxed">
                {club.description || 'No description provided.'}
              </p>
            </div>

            {/* Join / Status / Leave */}
            <div className="shrink-0 flex flex-col gap-2 min-w-[170px]">
              {isLead ? null : statusConfig ? (
                <>
                  <div
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-sm border text-xs font-semibold ${statusConfig.cls}`}
                  >
                    {StatusIcon && <StatusIcon size={13} />}
                    {statusConfig.label}
                  </div>

                  {userStatus === 'payment_pending' && (
                    <button
                      type="button"
                      onClick={handleOpenPayment}
                      disabled={paymentLoading || isPending}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors shadow-xs"
                    >
                      {paymentLoading ? (
                        <><Loader2 size={12} className="animate-spin" /> Preparing...</>
                      ) : (
                        <><CreditCard size={12} /> Pay Membership Fee (₹{club.fee})</>
                      )}
                    </button>
                  )}

                  {userStatus === 'member' && (
                    <button
                      type="button"
                      onClick={handleLeave}
                      disabled={isPending}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-ink-muted hover:text-red-500 hover:border-red-500/30 text-xs transition-colors disabled:opacity-50"
                    >
                      <LogOut size={12} />
                      Leave Club
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-sm bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                >
                  {isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Processing...</>
                  ) : club.fee > 0 ? (
                    <><IndianRupee size={14} /> Join (₹{club.fee})</>
                  ) : (
                    <><Flag size={14} /> Request to Join</>
                  )}
                </button>
              )}

              {/* Community room link */}
              {club.community_id && (
                <Link
                  href={`/community/${club.community_id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-border text-ink-muted hover:text-primary hover:border-primary/30 text-xs transition-colors"
                >
                  <MessageSquare size={13} />
                  Club Chat Room
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-sm border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 p-3 rounded-sm border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          {successMsg}
        </div>
      )}

      {/* Main Grid: Notices & Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Notices */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-ink text-lg flex items-center gap-2">
              <Pin size={16} className="text-primary" />
              Notices
            </h2>
            {isLead && (
              <button
                type="button"
                onClick={() => setShowNoticeForm((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-primary/30 bg-primary/10 text-primary rounded-sm hover:bg-primary/20 transition-colors"
              >
                <Plus size={12} />
                Post Notice
              </button>
            )}
          </div>

          {/* Notice Form */}
          {showNoticeForm && (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <textarea
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Write your notice (markdown supported)..."
                rows={4}
                className="w-full text-sm rounded-sm border border-border bg-surface-sunken p-2.5 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noticePinned}
                    onChange={(e) => setNoticePinned(e.target.checked)}
                    className="rounded-xs border-border text-primary focus:ring-primary/30"
                  />
                  <Pin size={12} />
                  Pin this notice
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoticeForm(false)}
                    className="px-3 py-1.5 text-xs border border-border rounded-sm text-ink-muted hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePostNotice}
                    disabled={!noticeBody.trim() || isPending}
                    className="px-3 py-1.5 text-xs bg-primary text-white rounded-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {isPending ? 'Posting...' : 'Post Notice'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notice List */}
          {notices.length === 0 ? (
            <div className="text-center py-10 text-ink-muted border border-dashed border-border rounded-lg">
              <Pin size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notices yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`rounded-lg border p-4 relative ${
                    notice.pinned
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-surface'
                  }`}
                >
                  {notice.pinned && (
                    <div className="flex items-center gap-1 text-[10px] text-primary font-semibold uppercase tracking-wider mb-2">
                      <Pin size={10} />
                      Pinned
                    </div>
                  )}
                  <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{notice.body}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-ink-muted">
                      {notice.author?.full_name || 'Club Lead'} · {formatDate(notice.created_at)}
                    </span>
                    {isLead && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="text-ink-muted hover:text-red-500 transition-colors p-1"
                        title="Delete notice"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Lead Dashboard / Club Info */}
        <div className="space-y-4">
          {/* Club meta */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
            <h3 className="font-semibold text-ink text-sm mb-3">Club Info</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-muted">Members</span>
                <span className="font-semibold text-ink">{club.member_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Joining Fee</span>
                <span className={`font-semibold ${club.fee > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {club.fee > 0 ? `₹${club.fee} / year` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Lead</span>
                <span className="font-semibold text-ink">{club.lead?.full_name || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Lead: Pending Requests */}
          {isLead && pending.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <button
                type="button"
                className="flex items-center justify-between w-full text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3"
                onClick={() => setShowPending((p) => !p)}
              >
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Pending Requests ({pending.length})
                </span>
                {showPending ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showPending && (
                <div className="space-y-3">
                  {pending.map((member) => (
                    <div
                      key={member.id}
                      className="p-2.5 rounded-sm border border-border bg-surface flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-xs font-semibold text-ink">
                            {member.user?.full_name || 'Student'}
                          </p>
                          <p className="text-[11px] text-ink-muted">{member.user?.college_id}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${
                            member.status === 'payment_pending'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {member.status === 'payment_pending'
                            ? `Payment Pending (₹${club.fee})`
                            : 'Free Join Request'}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApprove(member.user_id)}
                          disabled={isPending}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-60 transition-colors"
                        >
                          <CheckCircle2 size={11} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(member.user_id)}
                          disabled={isPending}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-sm bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-60 transition-colors"
                        >
                          <XCircle size={11} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Checkout Modal Dialog */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-ink text-lg flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" />
                  Membership Fee Checkout
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">{club.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="rounded-lg border border-border bg-surface-sunken p-4 space-y-2 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Annual Membership</span>
                <span className="font-medium text-ink">₹{club.fee}.00</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Campus Convenience Fee</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">₹0.00 (Waived)</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-ink">
                <span>Total Payable</span>
                <span className="text-primary font-mono">₹{club.fee}.00</span>
              </div>
            </div>

            {/* Security Guarantee Notice */}
            <div className="flex items-start gap-2 p-2.5 rounded-sm bg-primary/5 border border-primary/20 text-ink text-xs leading-relaxed">
              <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="block text-primary">Secure Webhook Verification:</strong>
                Per security policy, club membership activates only via verified server-side payment
                webhook, never from client-side redirects.
              </div>
            </div>

            {/* Payment Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSimulatePayment('success')}
                disabled={paymentLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
              >
                {paymentLoading ? (
                  <><Loader2 size={15} className="animate-spin" /> Verifying Webhook...</>
                ) : (
                  <><CheckCircle2 size={15} /> Complete Test Payment (Verified Webhook)</>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSimulatePayment('failure')}
                disabled={paymentLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-sm border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-500/20 disabled:opacity-60 transition-colors cursor-pointer"
              >
                Simulate Payment Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
