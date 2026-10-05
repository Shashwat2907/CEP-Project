'use client'

import React, { useTransition } from 'react'
import Link from 'next/link'
import { Users, Shield, ArrowRight, Sparkles, Award, CheckCircle2, Lock } from 'lucide-react'
import type { Community } from '../schema'
import { joinCommunityAction } from '../actions'

interface CommunityCardProps {
  community: Community
  onJoined?: () => void
}

export function CommunityCard({ community, onJoined }: CommunityCardProps) {
  const [isPending, startTransition] = useTransition()

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      const res = await joinCommunityAction({ community_id: community.id })
      if (res.success && onJoined) {
        onJoined()
      }
    })
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all p-5 group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {community.official ? (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Official Roster
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Student Group
              </span>
            )}

            {community.year && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-sunken text-ink-muted border border-border">
                Year {community.year}
              </span>
            )}
            {community.branch && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-sunken text-ink-muted border border-border truncate max-w-[120px]">
                {community.branch}
              </span>
            )}
            {community.batch && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-sunken text-ink-muted border border-border">
                Batch {community.batch}
              </span>
            )}
            {community.private && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-0.5">
                <Lock size={9} /> Private
              </span>
            )}
          </div>

          {community.is_member && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              Joined
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-base text-ink group-hover:text-primary transition-colors font-display line-clamp-1 mb-1.5">
          {community.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed mb-4">
          {community.description || 'Academic coordination and doubt resolution channel for college students.'}
        </p>

        {/* User's Badges in this community */}
        {community.user_tags && community.user_tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4 pt-2 border-t border-border/60">
            <span className="text-[10px] font-medium text-ink-muted">Your Badges:</span>
            {community.user_tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                {tag === 'helper' && <Sparkles size={10} />}
                {tag === 'doubt_solver' && <Award size={10} />}
                {tag === 'top_contributor' && <CheckCircle2 size={10} />}
                <span className="capitalize">{tag.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Users size={13} />
          <span>{community.member_count} {community.member_count === 1 ? 'member' : 'members'}</span>
          {community.user_role === 'moderator' && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <Shield size={10} /> Mod
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!community.is_member && !community.official && (
            <button
              onClick={handleJoin}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-ink hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {isPending ? 'Joining...' : 'Join'}
            </button>
          )}

          <Link
            href={`/community/${community.id}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-ink text-on-ink hover:opacity-90 transition-colors shadow-xs"
          >
            <span>Enter</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
