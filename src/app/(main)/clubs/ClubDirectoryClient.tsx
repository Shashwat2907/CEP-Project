'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Flag, Users, IndianRupee, Search, Filter,
  CheckCircle2, Clock, XCircle, CreditCard, Loader2,
} from 'lucide-react'
import { joinClubAction } from '@/features/clubs/actions'
import type { Club } from '@/features/clubs/schema'

interface ClubDirectoryClientProps {
  clubs: Club[]
  currentUserId: string
}

const STATUS_CONFIG = {
  member: {
    label: 'Member',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  requested: {
    label: 'Request Pending',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  payment_pending: {
    label: 'Payment Pending',
    icon: CreditCard,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  rejected: {
    label: 'Not Accepted',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
} as const

const CLUB_ICONS = ['🎯', '📷', '🤖', '📚', '💡', '🎸', '🏆', '🌱']

export function ClubDirectoryClient({ clubs, currentUserId }: ClubDirectoryClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'joined'>('all')
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = clubs.filter((c) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(q) ||
      (c.tagline && c.tagline.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))

    const status = localStatuses[c.id] ?? c.user_status
    if (filter === 'free' && c.fee > 0) return false
    if (filter === 'paid' && c.fee === 0) return false
    if (filter === 'joined' && status !== 'member') return false

    return matchesSearch
  })

  const handleJoin = (clubId: string) => {
    setErrorMsg(null)
    setJoiningId(clubId)
    startTransition(async () => {
      const res = await joinClubAction({ club_id: clubId })
      if (res.success && res.data) {
        setLocalStatuses((prev) => ({ ...prev, [clubId]: res.data!.status }))
        router.refresh()
      } else if (!res.success) {
        setErrorMsg(res.error)
      }
      setJoiningId(null)
    })
  }

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-sm border border-border bg-surface text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-ink-muted shrink-0" />
          {(['all', 'free', 'paid', 'joined'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                filter === f
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-ink-muted hover:text-ink hover:border-ink-muted'
              }`}
            >
              {f === 'all' ? 'All Clubs' : f === 'free' ? 'Free' : f === 'paid' ? 'Paid' : 'My Clubs'}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-sm bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Club Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-muted">
          <Flag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-ink">No clubs found</p>
          <p className="text-sm mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((club, idx) => {
            const status = localStatuses[club.id] ?? club.user_status
            const statusConfig = status ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null
            const StatusIcon = statusConfig?.icon
            const isJoining = joiningId === club.id && isPending
            const emoji = CLUB_ICONS[idx % CLUB_ICONS.length]

            return (
              <div
                key={club.id}
                className="group relative flex flex-col rounded-lg border border-border bg-surface hover:border-primary/30 hover:shadow-md transition-all overflow-hidden"
              >
                {/* Cover / Emoji header */}
                <div className="h-28 bg-gradient-to-br from-primary/10 via-primary/5 to-surface-sunken flex items-center justify-center text-5xl select-none">
                  {emoji}
                </div>

                <div className="flex flex-col gap-2 p-4 flex-1">
                  {/* Name & fee */}
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/clubs/${club.id}`}
                      className="font-display font-bold text-ink text-base leading-tight hover:text-primary transition-colors line-clamp-1"
                    >
                      {club.name}
                    </Link>
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${
                        club.fee > 0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {club.fee > 0 ? `₹${club.fee}` : 'Free'}
                    </span>
                  </div>

                  {/* Tagline */}
                  {club.tagline && (
                    <p className="text-xs text-ink-muted italic line-clamp-1">{club.tagline}</p>
                  )}

                  {/* Description */}
                  <p className="text-xs text-ink-muted line-clamp-2 flex-1 leading-relaxed">
                    {club.description || 'No description available.'}
                  </p>

                  {/* Members & Lead */}
                  <div className="flex items-center gap-3 text-[11px] text-ink-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {club.member_count} members
                    </span>
                    {club.lead && (
                      <span className="truncate">Lead: {club.lead.full_name}</span>
                    )}
                  </div>

                  {/* Status chip or Join button */}
                  {statusConfig ? (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-semibold ${statusConfig.className}`}>
                      {StatusIcon && <StatusIcon size={12} />}
                      {statusConfig.label}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(club.id)}
                      disabled={isJoining}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isJoining ? (
                        <><Loader2 size={12} className="animate-spin" /> Requesting...</>
                      ) : club.fee > 0 ? (
                        <><IndianRupee size={12} /> Join (₹{club.fee})</>
                      ) : (
                        <><Flag size={12} /> Request to Join</>
                      )}
                    </button>
                  )}

                  {/* View details */}
                  <Link
                    href={`/clubs/${club.id}`}
                    className="text-xs text-ink-muted hover:text-primary text-center transition-colors"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
