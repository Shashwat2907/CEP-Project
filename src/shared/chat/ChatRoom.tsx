'use client'

import React, { useState, useRef, useEffect, useTransition } from 'react'
import {
  Send,
  ThumbsUp,
  MessageSquare,
  CornerDownRight,
  Smile,
  MoreVertical,
  Flag,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  Award,
  Sparkles,
  Shield,
  GraduationCap,
  AlertCircle,
  X,
} from 'lucide-react'
import type { CommunityMessage, CommunityTagType } from '@/features/community/schema'

export interface ChatMessageItem extends CommunityMessage {
  // Can extend if needed
}

export interface ChatRoomProps {
  roomId: string
  title: string
  description?: string | null
  memberCount?: number
  isOfficial?: boolean
  isMember: boolean
  userRole?: string
  currentUserId: string
  initialMessages: ChatMessageItem[]
  onSendMessage: (body: string, parentId?: string) => Promise<{ success: boolean; message?: CommunityMessage; error?: string }>
  onVoteReply?: (messageId: string) => Promise<{ success: boolean; upvoted?: boolean; upvote_count?: number; error?: string }>
  onAddReaction?: (messageId: string, emoji: string) => Promise<{ success: boolean; error?: string }>
  onDeleteMessage?: (messageId: string) => Promise<{ success: boolean; error?: string }>
  onReportMessage?: (messageId: string, reason: string) => Promise<{ success: boolean; error?: string }>
  onJoin?: () => Promise<{ success: boolean; error?: string }>
  onLeave?: () => Promise<{ success: boolean; error?: string }>
  returnUrl?: string
}

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '💡', '🚀', '👏']

export function ChatRoom({
  title,
  description,
  memberCount = 1,
  isOfficial = false,
  isMember,
  userRole,
  currentUserId,
  initialMessages,
  onSendMessage,
  onVoteReply,
  onAddReaction,
  onDeleteMessage,
  onReportMessage,
  onJoin,
  onLeave,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [activeReplyParent, setActiveReplyParent] = useState<ChatMessageItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null)
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep state synced with props
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  // Scroll to bottom on load and new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  // Dismiss feedback banner after 4 seconds
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMsg])

  const handleSend = () => {
    if (!inputText.trim() || isPending) return
    const textToSend = inputText.trim()
    const parentId = activeReplyParent?.id

    startTransition(async () => {
      const res = await onSendMessage(textToSend, parentId)
      if (res.success) {
        setInputText('')
        setActiveReplyParent(null)
        if (res.message) {
          const sent = res.message as ChatMessageItem
          setMessages((prev) => {
            if (prev.some((m) => m.id === sent.id)) return prev
            return [...prev, sent]
          })
        }
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to send message' })
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVote = (msg: ChatMessageItem) => {
    if (!onVoteReply || isPending) return
    startTransition(async () => {
      const res = await onVoteReply(msg.id)
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  is_upvoted: res.upvoted,
                  upvote_count: res.upvote_count ?? (m.upvote_count + (res.upvoted ? 1 : -1)),
                }
              : m
          )
        )
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to upvote' })
      }
    })
  }

  const handleReaction = (msgId: string, emoji: string) => {
    if (!onAddReaction) return
    setShowEmojiPickerFor(null)
    startTransition(async () => {
      await onAddReaction(msgId, emoji)
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m
          const reactions = { ...(m.reactions || {}) }
          const userList = [...(reactions[emoji] || [])]
          const idx = userList.indexOf(currentUserId)
          if (idx === -1) {
            userList.push(currentUserId)
          } else {
            userList.splice(idx, 1)
          }
          reactions[emoji] = userList
          return { ...m, reactions }
        })
      )
    })
  }

  const handleDelete = (msgId: string) => {
    if (!onDeleteMessage || !window.confirm('Delete this message?')) return
    startTransition(async () => {
      const res = await onDeleteMessage(msgId)
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), body: '[Message deleted]' } : m
          )
        )
        setFeedbackMsg({ type: 'success', text: 'Message deleted.' })
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Could not delete message' })
      }
    })
  }

  const handleReport = () => {
    if (!reportingMessageId || !reportReason.trim() || !onReportMessage) return
    startTransition(async () => {
      const res = await onReportMessage(reportingMessageId, reportReason.trim())
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: 'Message reported to moderators.' })
        setReportingMessageId(null)
        setReportReason('')
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Could not report message' })
      }
    })
  }

  // Filter messages by search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.body.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  // Group messages into top-level and their direct replies
  const topLevelMessages = filteredMessages.filter((m) => !m.parent_id)
  const repliesByParent = filteredMessages
    .filter((m) => m.parent_id)
    .reduce<Record<string, ChatMessageItem[]>>((acc, m) => {
      if (m.parent_id) {
        if (!acc[m.parent_id]) acc[m.parent_id] = []
        acc[m.parent_id].push(m)
      }
      return acc
    }, {})

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* 1. Chat Header */}
      <div className="p-4 border-b border-border bg-surface-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
            #
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base md:text-lg text-ink font-display">{title}</h2>
              {isOfficial && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Official
                </span>
              )}
              {userRole === 'moderator' && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  <Shield size={10} /> Mod
                </span>
              )}
            </div>
            {description && <p className="text-xs text-ink-muted line-clamp-1">{description}</p>}
          </div>
        </div>

        {/* Member Count & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-ink-muted bg-surface rounded-md border border-border">
            <Users size={13} />
            <span>{memberCount} members</span>
          </div>

          {/* Search Bar toggle */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 sm:w-44 px-2.5 py-1 text-xs bg-surface border border-border rounded-md text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-xs"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Join / Leave Buttons for unofficial groups */}
          {!isOfficial && (
            <>
              {!isMember && onJoin && (
                <button
                  onClick={() => startTransition(async () => { await onJoin() })}
                  disabled={isPending}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-primary text-white hover:bg-primary-hover transition-colors"
                >
                  Join Room
                </button>
              )}
              {isMember && onLeave && userRole !== 'moderator' && (
                <button
                  onClick={() => {
                    if (window.confirm('Leave this community?')) {
                      startTransition(async () => { await onLeave() })
                    }
                  }}
                  disabled={isPending}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-border text-ink-muted hover:text-red-500 hover:border-red-500/30 transition-colors"
                >
                  Leave
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Banner Alerts */}
      {feedbackMsg && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            feedbackMsg.type === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-current hover:opacity-75">
            <X size={12} />
          </button>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-sunken/40">
        {topLevelMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-muted">
            <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-primary/70" />
            </div>
            <p className="font-medium text-ink text-sm">No messages in this room yet</p>
            <p className="text-xs max-w-sm mt-1">
              Start the discussion! Ask a question, share notes, or post an academic doubt.
            </p>
          </div>
        ) : (
          topLevelMessages.map((msg) => {
            const replies = repliesByParent[msg.id] || []
            const isAuthor = msg.author_id === currentUserId
            const canDelete = isAuthor || userRole === 'moderator'

            return (
              <div key={msg.id} className="group relative rounded-xl border border-border bg-surface p-4 transition-all">
                {/* Message Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-semibold text-xs md:text-sm text-ink">
                      {msg.author?.full_name || 'Campus Student'}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      ({msg.author?.college_id || 'ID'})
                    </span>

                    {/* Primary Role Chip */}
                    {msg.author?.role_primary === 'teacher' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        <GraduationCap size={10} /> Faculty
                      </span>
                    )}

                    {/* Reputation Badges */}
                    {msg.author?.tags?.map((tag) => renderTagBadge(tag))}

                    <span className="text-[10px] text-ink-muted">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Actions Dropdown / Tools */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setActiveReplyParent(msg)}
                      title="Reply in thread"
                      className="p-1 rounded text-ink-muted hover:text-primary hover:bg-surface-elevated transition-colors text-xs flex items-center gap-1"
                    >
                      <CornerDownRight size={13} />
                      <span className="hidden sm:inline">Reply</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)}
                        className="p-1 rounded text-ink-muted hover:text-amber-500 hover:bg-surface-elevated transition-colors"
                        title="React"
                      >
                        <Smile size={13} />
                      </button>
                      {showEmojiPickerFor === msg.id && (
                        <div className="absolute right-0 top-6 z-20 flex gap-1 p-1 bg-surface-elevated border border-border rounded-lg shadow-lg">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="w-7 h-7 flex items-center justify-center hover:bg-surface rounded text-sm transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {canDelete && !msg.deleted_at && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        title="Delete message"
                        className="p-1 rounded text-ink-muted hover:text-red-500 hover:bg-surface-elevated transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {!isAuthor && !msg.deleted_at && (
                      <button
                        onClick={() => setReportingMessageId(msg.id)}
                        title="Report message"
                        className="p-1 rounded text-ink-muted hover:text-amber-600 hover:bg-surface-elevated transition-colors"
                      >
                        <Flag size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <p className={`text-xs md:text-sm text-ink leading-relaxed break-words whitespace-pre-wrap ${msg.deleted_at ? 'italic text-ink-muted' : ''}`}>
                  {msg.body}
                </p>

                {/* Reaction Chips */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                      if (!userIds || userIds.length === 0) return null
                      const hasReacted = userIds.includes(currentUserId)
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            hasReacted
                              ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                              : 'bg-surface border-border text-ink hover:bg-surface-elevated'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{userIds.length}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Threaded Replies Section */}
                {replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/70 space-y-2.5 pl-3 border-l-2 border-l-primary/30">
                    <div className="text-[11px] font-semibold text-ink-muted flex items-center gap-1 mb-1">
                      <CornerDownRight size={12} />
                      <span>{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</span>
                    </div>

                    {replies.map((reply) => {
                      const isReplyAuthor = reply.author_id === currentUserId
                      const canDeleteReply = isReplyAuthor || userRole === 'moderator'

                      return (
                        <div
                          key={reply.id}
                          className="bg-surface-elevated/70 rounded-lg p-2.5 border border-border/80 text-xs transition-colors hover:border-primary/20"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="font-semibold text-ink">
                                {reply.author?.full_name || 'Student'}
                              </span>
                              <span className="text-[10px] text-ink-muted">
                                ({reply.author?.college_id || 'ID'})
                              </span>

                              {/* Author Tags on replies */}
                              {reply.author?.tags?.map((tag) => renderTagBadge(tag))}

                              <span className="text-[10px] text-ink-muted">
                                {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Reply Action Icons */}
                            <div className="flex items-center gap-1.5">
                              {/* UPVOTE BUTTON (Feeds the tag/badge system) */}
                              <button
                                onClick={() => handleVote(reply)}
                                disabled={isReplyAuthor || isPending}
                                title={isReplyAuthor ? 'Cannot upvote own reply' : 'Upvote helpful doubt resolution'}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                  reply.is_upvoted
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-surface border-border text-ink-muted hover:text-emerald-600 hover:border-emerald-500/30'
                                } ${isReplyAuthor ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <ThumbsUp size={11} className={reply.is_upvoted ? 'fill-current' : ''} />
                                <span>{reply.upvote_count || 0}</span>
                              </button>

                              {canDeleteReply && !reply.deleted_at && (
                                <button
                                  onClick={() => handleDelete(reply.id)}
                                  className="text-ink-muted hover:text-red-500 p-0.5 rounded"
                                  title="Delete reply"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className={`text-ink leading-relaxed break-words whitespace-pre-wrap ${reply.deleted_at ? 'italic text-ink-muted' : ''}`}>
                            {reply.body}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 4. Active Reply Banner */}
      {activeReplyParent && (
        <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2 truncate pr-2">
            <CornerDownRight size={13} className="text-primary shrink-0" />
            <span className="font-semibold text-primary">Replying to {activeReplyParent.author?.full_name}:</span>
            <span className="text-ink-muted truncate italic">"{activeReplyParent.body}"</span>
          </div>
          <button
            onClick={() => setActiveReplyParent(null)}
            className="text-ink-muted hover:text-ink shrink-0 p-1 rounded"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 5. Message Input Bar */}
      <div className="p-3 border-t border-border bg-surface-elevated">
        {isMember ? (
          <div className="flex items-end gap-2">
            <div className="flex-1 relative bg-surface border border-border rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeReplyParent
                    ? `Reply to ${activeReplyParent.author?.full_name}... (Enter to send)`
                    : 'Type your message or doubt... (Enter to send, Shift+Enter for new line)'
                }
                rows={2}
                maxLength={2000}
                className="w-full px-3 py-2 text-xs md:text-sm bg-transparent text-ink placeholder:text-ink-muted resize-none focus:outline-none"
              />
              <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                <span>{inputText.length} / 2000</span>
                <span>Press Enter ↵ to send</span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isPending}
              className="h-10 px-4 rounded-lg bg-ink text-on-ink font-medium text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm cursor-pointer"
            >
              <Send size={14} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-ink-muted flex items-center justify-center gap-3">
            <span>You are currently previewing this room in read-only mode.</span>
            {onJoin && (
              <button
                onClick={() => startTransition(async () => { await onJoin() })}
                disabled={isPending}
                className="px-3 py-1 font-semibold rounded-md bg-ink text-on-ink hover:opacity-90 transition-colors cursor-pointer"
              >
                Join to Participate
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. Report Message Modal */}
      {reportingMessageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                <Flag size={15} className="text-red-500" /> Report Message to Moderators
              </h3>
              <button onClick={() => setReportingMessageId(null)} className="text-ink-muted hover:text-ink">
                <X size={15} />
              </button>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Help keep our campus community safe and academic. Reports are forwarded to community moderators and admins.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explain why this message violates guidelines (e.g. spam, harassment, off-topic)..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-surface-elevated border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-primary mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setReportingMessageId(null)}
                className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink border border-border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim() || isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-40"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function renderTagBadge(tag: CommunityTagType) {
  switch (tag) {
    case 'helper':
      return (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
          title="Helper Badge (10+ upvoted doubt answers)"
        >
          <Sparkles size={9} /> Helper
        </span>
      )
    case 'doubt_solver':
      return (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
          title="Doubt Solver Badge (25+ upvoted doubt answers)"
        >
          <Award size={9} /> Doubt Solver
        </span>
      )
    case 'top_contributor':
      return (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
          title="Top Contributor Badge (50+ upvoted doubt answers)"
        >
          <CheckCircle2 size={9} /> Top Contributor
        </span>
      )
    default:
      return null
  }
}
