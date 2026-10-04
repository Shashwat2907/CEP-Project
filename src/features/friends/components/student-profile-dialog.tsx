'use client'

import React from 'react'
import {
  X,
  User,
  MapPin,
  Users,
  ShieldCheck,
  Building,
  GraduationCap,
  Sparkles,
  Lock,
} from 'lucide-react'
import type { PublicStudentProfile } from '../schema'

interface StudentProfileDialogProps {
  profile: PublicStudentProfile | null
  isOpen: boolean
  onClose: () => void
  onSendRequest?: (userId: string) => void
  onRemoveFriend?: (userId: string) => void
}

export function StudentProfileDialog({
  profile,
  isOpen,
  onClose,
  onSendRequest,
  onRemoveFriend,
}: StudentProfileDialogProps) {
  if (!isOpen || !profile) return null

  const isFriend = profile.friendshipStatus === 'friends'
  const isPendingSent = profile.friendshipStatus === 'pending_sent'
  const isPendingReceived = profile.friendshipStatus === 'pending_received'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[var(--surface-paper)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in fade-in duration-200 flex flex-col">
        {/* Top Header Card */}
        <div className="relative h-28 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Avatar overlapping */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="relative -mt-12 mb-3 inline-block">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-[var(--surface-paper)] shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[var(--surface-sunken)] border-4 border-[var(--surface-paper)] flex items-center justify-center text-[var(--primary)] font-bold text-2xl shadow-md">
                {profile.fullName[0]}
              </div>
            )}

            {/* Presence dot */}
            {profile.presence.state === 'inside' && (
              <span
                title="On Campus"
                className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[var(--surface-paper)] shadow-xs"
              />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{profile.fullName}</h2>
              {isFriend && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                  Friend
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] font-mono">{profile.collegeId}</p>
          </div>

          {/* Presence info card */}
          <div className="mt-4 p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Campus Presence:</span>
              {profile.presence.state === 'inside' ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  On Campus {profile.presence.zoneName ? `(${profile.presence.zoneName})` : ''}
                </span>
              ) : profile.presence.state === 'outside' ? (
                <span className="text-[var(--text-secondary)]">Outside Campus</span>
              ) : (
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Lock className="w-3 h-3 opacity-60" />
                  <span>Hidden by Privacy Setting</span>
                </span>
              )}
            </div>
          </div>

          {/* Academic metadata */}
          <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <span>
                Year {profile.year} · {profile.branch}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Campus Role: {profile.role}</span>
            </div>
          </div>

          {/* Shared Communities */}
          {profile.sharedCommunities.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Shared Communities ({profile.sharedCommunities.length})</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.sharedCommunities.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            >
              Close
            </button>

            {profile.friendshipStatus === 'none' && onSendRequest && (
              <button
                type="button"
                onClick={() => onSendRequest(profile.userId)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Add Friend
              </button>
            )}

            {isPendingSent && (
              <span className="px-3 py-1.5 text-xs font-medium rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                Request Sent
              </span>
            )}

            {isFriend && onRemoveFriend && (
              <button
                type="button"
                onClick={() => onRemoveFriend(profile.userId)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-500/10 transition-colors"
              >
                Unfriend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
