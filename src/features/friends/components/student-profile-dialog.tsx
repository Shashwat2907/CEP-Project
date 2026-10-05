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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-surface rounded-md border border-border shadow-[var(--shadow-float)] overflow-hidden animate-in fade-in duration-150 flex flex-col">
        {/* Top Header Strip with Pencil Yellow accent strip */}
        <div className="relative h-16 bg-surface-sunken border-b border-border p-3 flex justify-between items-start">
          <div className="h-1 w-12 rounded-full bg-highlight" />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Avatar overlapping */}
        <div className="px-5 pb-5 pt-0 relative">
          <div className="relative -mt-8 mb-3 inline-block">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName}
                className="w-16 h-16 rounded-md object-cover border-2 border-surface shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-surface-sunken border-2 border-surface flex items-center justify-center text-ink font-display font-bold text-xl shadow-xs">
                {profile.fullName[0]}
              </div>
            )}

            {/* Presence dot */}
            {profile.presence.state === 'inside' && (
              <span
                title="On Campus"
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-in-campus rounded-full border-2 border-surface"
              />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-h3 font-bold text-ink">{profile.fullName}</h2>
              {isFriend && (
                <span className="px-2 py-0.5 rounded-sm text-meta font-mono font-medium bg-surface-sunken text-ink border border-border">
                  Friend
                </span>
              )}
            </div>

            <p className="text-meta text-ink-muted font-mono">{profile.collegeId}</p>
          </div>

          {/* Presence info card */}
          <div className="mt-3.5 p-3 rounded-sm bg-surface-sunken border border-border text-small">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Campus Presence:</span>
              {profile.presence.state === 'inside' ? (
                <span className="font-medium text-in-campus flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-in-campus animate-pulse" />
                  On Campus {profile.presence.zoneName ? `(${profile.presence.zoneName})` : ''}
                </span>
              ) : profile.presence.state === 'outside' ? (
                <span className="text-ink-muted">Outside Campus</span>
              ) : (
                <span className="text-ink-muted flex items-center gap-1">
                  <Lock className="w-3 h-3 opacity-60" />
                  <span>Hidden by Privacy Setting</span>
                </span>
              )}
            </div>
          </div>

          {/* Academic metadata */}
          <div className="mt-3.5 space-y-1.5 text-small text-ink-muted">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-ink shrink-0" />
              <span>
                Year {profile.year} · {profile.branch}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-ink-muted shrink-0" />
              <span>Campus Role: {profile.role}</span>
            </div>
          </div>

          {/* Shared Communities */}
          {profile.sharedCommunities.length > 0 && (
            <div className="mt-4">
              <h4 className="text-small font-bold text-ink mb-1.5 flex items-center gap-1.5 font-display">
                <Users className="w-3.5 h-3.5 text-ink-muted" />
                <span>Shared Communities ({profile.sharedCommunities.length})</span>
              </h4>
              <div className="flex flex-wrap gap-1">
                {profile.sharedCommunities.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-meta font-mono rounded-sm bg-surface-sunken text-ink-muted border border-border"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-small font-medium rounded-sm border border-border bg-surface text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              Close
            </button>

            {profile.friendshipStatus === 'none' && onSendRequest && (
              <button
                type="button"
                onClick={() => onSendRequest(profile.userId)}
                className="px-4 py-1.5 text-small font-semibold rounded-sm bg-ink text-on-ink hover:opacity-90 active:opacity-95 transition-opacity cursor-pointer"
              >
                Add Friend
              </button>
            )}

            {isPendingSent && (
              <span className="px-3 py-1.5 text-small font-medium rounded-sm bg-warning/10 text-warning border border-warning/30">
                Request Sent
              </span>
            )}

            {isFriend && onRemoveFriend && (
              <button
                type="button"
                onClick={() => onRemoveFriend(profile.userId)}
                className="px-3 py-1.5 text-small font-medium rounded-sm text-danger hover:bg-danger/10 border border-danger/30 transition-colors cursor-pointer"
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
