'use client'

import React from 'react'
import { ChatRoom, type ChatMessageItem } from '@/shared/chat'
import {
  sendMessageAction,
  voteReplyAction,
  addReactionAction,
  deleteMessageAction,
  reportMessageAction,
  joinCommunityAction,
  leaveCommunityAction,
} from '@/features/community/actions'
import type { Community, CommunityMember } from '@/features/community/schema'
import { Shield, Sparkles, Award, CheckCircle2, Info } from 'lucide-react'

interface CommunityRoomViewProps {
  community: Community
  initialMessages: ChatMessageItem[]
  members: CommunityMember[]
  currentUserId: string
  currentUserRole?: string
}

export function CommunityRoomView({
  community,
  initialMessages,
  members,
  currentUserId,
  currentUserRole,
}: CommunityRoomViewProps) {
  const handleSendMessage = async (body: string, parentId?: string) => {
    return await sendMessageAction({
      community_id: community.id,
      body,
      parent_id: parentId,
    })
  }

  const handleVoteReply = async (messageId: string) => {
    return await voteReplyAction({ message_id: messageId })
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    return await addReactionAction({ message_id: messageId, emoji })
  }

  const handleDeleteMessage = async (messageId: string) => {
    return await deleteMessageAction({ message_id: messageId })
  }

  const handleReportMessage = async (messageId: string, reason: string) => {
    return await reportMessageAction({ message_id: messageId, reason })
  }

  const handleJoin = async () => {
    return await joinCommunityAction({ community_id: community.id })
  }

  const handleLeave = async () => {
    return await leaveCommunityAction({ community_id: community.id })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Main Chat Area */}
      <div className="lg:col-span-3">
        <ChatRoom
          roomId={community.id}
          title={community.name}
          description={community.description}
          memberCount={community.member_count}
          isOfficial={community.official}
          isMember={Boolean(community.is_member)}
          userRole={community.user_role}
          currentUserId={currentUserId}
          initialMessages={initialMessages}
          onSendMessage={handleSendMessage}
          onVoteReply={handleVoteReply}
          onAddReaction={handleAddReaction}
          onDeleteMessage={handleDeleteMessage}
          onReportMessage={handleReportMessage}
          onJoin={!community.official ? handleJoin : undefined}
          onLeave={!community.official ? handleLeave : undefined}
        />
      </div>

      {/* Community Info & Reputation Sidebar */}
      <div className="space-y-4">
        {/* Reputation System Explainer */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-ink font-display flex items-center gap-1.5 mb-3">
            <Sparkles size={14} className="text-primary" />
            <span>Reputation Badges</span>
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed mb-3">
            Answer student doubts in threads! Upvoted answers automatically unlock community-specific badges:
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-sunken border border-border">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Helper</span>
                <span className="text-[10px] text-ink-muted block">10+ upvoted doubt answers</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-sunken border border-border">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex-1">
                <span className="font-semibold text-blue-700 dark:text-blue-300">Doubt Solver</span>
                <span className="text-[10px] text-ink-muted block">25+ upvoted doubt answers</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-sunken border border-border">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <div className="flex-1">
                <span className="font-semibold text-purple-700 dark:text-purple-300">Top Contributor</span>
                <span className="text-[10px] text-ink-muted block">50+ upvoted doubt answers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Room Details & Members */}
        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-ink font-display">
              Room Members ({members.length})
            </h3>
            <span className="text-[10px] text-ink-muted">Active</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-surface-sunken text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {m.user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="truncate text-ink font-medium">
                    {m.user?.full_name || 'Member'}
                  </span>
                </div>

                {m.role === 'moderator' ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-0.5 shrink-0">
                    <Shield size={9} /> Mod
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-muted shrink-0">
                    {m.user?.role_primary || 'Student'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-sunken text-xs text-ink-muted space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-ink text-[11px]">
            <Info size={13} className="text-primary" />
            <span>Community Guidelines</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Maintain academic integrity. No harassment, spam, or sharing of copyrighted test materials. Max 10 messages/minute.
          </p>
        </div>
      </div>
    </div>
  )
}
