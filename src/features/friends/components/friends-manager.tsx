'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Check,
  X,
  MapPin,
  Clock,
  Send,
  Calendar,
  Lock,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Building,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  PhoneCall,
  Video,
  Info,
} from 'lucide-react'
import type { FriendItem, PublicStudentProfile } from '../schema'
import {
  getFriendsAction,
  getFriendRequestsAction,
  searchStudentsAction,
  sendFriendRequestAction,
  respondFriendRequestAction,
  removeFriendAction,
  getStudentProfileByIdAction,
} from '../actions'
import { StudentProfileDialog } from './student-profile-dialog'

interface ChatMessage {
  id: string
  senderId: string // 'me' or friend's userId
  senderName: string
  content: string
  timestamp: string
  type: 'text' | 'location' | 'study_meet'
  locationData?: {
    zoneName: string
    building: string
    timestamp: string
  }
  studyMeetData?: {
    subject: string
    time: string
    location: string
  }
}

// Seed mock conversations for known mock students
const INITIAL_CONVERSATIONS: Record<string, ChatMessage[]> = {
  '00000000-0000-0000-0000-000000000002': [
    {
      id: 'm-1',
      senderId: '00000000-0000-0000-0000-000000000002',
      senderName: 'Priya Sharma',
      content: 'Hey Shashwat! Are you attending the CS302 Distributed Systems lecture in Block A Room 402?',
      timestamp: '10:15 AM',
      type: 'text',
    },
    {
      id: 'm-2',
      senderId: 'me',
      senderName: 'Shashwat Choudhary',
      content: 'Yes! Already here on the 3rd row. Saved you a seat next to the projector.',
      timestamp: '10:18 AM',
      type: 'text',
    },
    {
      id: 'm-3',
      senderId: '00000000-0000-0000-0000-000000000002',
      senderName: 'Priya Sharma',
      content: 'Awesome, thanks! Coming up from Computer Lab 3 right now.',
      timestamp: '10:20 AM',
      type: 'text',
    },
    {
      id: 'm-4',
      senderId: '00000000-0000-0000-0000-000000000002',
      senderName: 'Priya Sharma',
      content: 'Live Campus Location',
      timestamp: '10:21 AM',
      type: 'location',
      locationData: {
        zoneName: 'Computer Lab 3',
        building: 'Academic Block A, Ground Floor',
        timestamp: '10:21 AM',
      },
    },
  ],
}

export function FriendsManager() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [incoming, setIncoming] = useState<FriendItem[]>([])
  const [outgoing, setOutgoing] = useState<FriendItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PublicStudentProfile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // WhatsApp active conversation state
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(INITIAL_CONVERSATIONS)
  const [draftMessage, setDraftMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Profile Dialog State
  const [selectedProfile, setSelectedProfile] = useState<PublicStudentProfile | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const loadData = async () => {
    try {
      const [fList, reqs] = await Promise.all([
        getFriendsAction(),
        getFriendRequestsAction(),
      ])
      setFriends(fList)
      setIncoming(reqs.incoming)
      setOutgoing(reqs.outgoing)

      // Set default active friend if none selected
      if (!activeFriendId && fList.length > 0) {
        setActiveFriendId(fList[0].userId)
      }
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, activeFriendId])

  // Live search directory
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (activeTab === 'search') {
        setIsSearching(true)
        try {
          const results = await searchStudentsAction(searchQuery)
          setSearchResults(results)
        } catch {
          // Non-fatal
        } finally {
          setIsSearching(false)
        }
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, activeTab])

  const handleSendRequest = async (targetUserId: string) => {
    setIsProcessing(true)
    setFeedback(null)
    try {
      const res = await sendFriendRequestAction(targetUserId)
      if (res.ok) {
        setFeedback(res.message || 'Friend request sent!')
        loadData()
        if (searchQuery) {
          const results = await searchStudentsAction(searchQuery)
          setSearchResults(results)
        }
        if (selectedProfile?.userId === targetUserId) {
          setSelectedProfile({
            ...selectedProfile,
            friendshipStatus: 'pending_sent',
          })
        }
      } else {
        setFeedback(res.error || 'Failed to send friend request')
      }
    } catch {
      setFeedback('Error sending friend request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRespond = async (friendshipId: string, action: 'accept' | 'decline') => {
    setIsProcessing(true)
    try {
      const res = await respondFriendRequestAction(friendshipId, action)
      if (res.ok) {
        setFeedback(action === 'accept' ? 'Friend request accepted!' : 'Request declined.')
        loadData()
      } else {
        setFeedback(res.error || 'Failed to update request')
      }
    } catch {
      setFeedback('Error responding to request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFriend = async (targetUserId: string) => {
    setIsProcessing(true)
    try {
      const res = await removeFriendAction(targetUserId)
      if (res.ok) {
        setFeedback('Removed from friends.')
        setIsProfileOpen(false)
        if (activeFriendId === targetUserId) {
          setActiveFriendId(null)
        }
        loadData()
      } else {
        setFeedback(res.error || 'Failed to unfriend')
      }
    } catch {
      setFeedback('Error removing friend')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenProfile = async (targetUserId: string) => {
    const prof = await getStudentProfileByIdAction(targetUserId)
    if (prof) {
      setSelectedProfile(prof)
      setIsProfileOpen(true)
    }
  }

  const activeFriend = friends.find((f) => f.userId === activeFriendId) || null
  const activeMessages = activeFriendId ? conversations[activeFriendId] || [] : []

  // Send message in WhatsApp thread
  const handleSendMessage = (content: string, type: 'text' | 'location' | 'study_meet' = 'text') => {
    if (!activeFriendId || (!content.trim() && type === 'text')) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      senderId: 'me',
      senderName: 'Shashwat Choudhary',
      content: content.trim(),
      timestamp: timeStr,
      type,
      locationData:
        type === 'location'
          ? {
              zoneName: 'Block A, Room 402',
              building: 'CS Academic Block, 4th Floor',
              timestamp: timeStr,
            }
          : undefined,
      studyMeetData:
        type === 'study_meet'
          ? {
              subject: 'CS302: Distributed Systems & Lab',
              time: 'Today · 15:00 – 16:30',
              location: 'Central Library Quiet Reading Room',
            }
          : undefined,
    }

    setConversations((prev) => ({
      ...prev,
      [activeFriendId]: [...(prev[activeFriendId] || []), newMessage],
    }))

    setDraftMessage('')
  }

  // Filtered friends in search
  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim() || activeTab !== 'friends') return true
    const q = searchQuery.toLowerCase()
    return (
      f.fullName.toLowerCase().includes(q) ||
      f.collegeId.toLowerCase().includes(q) ||
      f.branch.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* Top Banner per DESIGN.MD §6 & PLAN.MD §5.10 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="font-display text-h1 font-bold text-ink flex items-center gap-2.5">
            <Users className="w-6 h-6 text-ink" />
            Campus Friends & Network
          </h1>
          <p className="text-small text-ink-muted mt-0.5">
            Connect with peers, view shared student communities, and see verified live presence on campus.
          </p>
        </div>

        {feedback && (
          <div className="p-2 px-3 rounded-sm bg-surface-sunken border border-border text-meta text-ink font-medium flex items-center gap-1.5 self-start sm:self-center">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* WhatsApp 2-Pane Container */}
      <div className="h-[calc(100vh-165px)] min-h-[620px] max-h-[780px] bg-surface rounded-md border border-border shadow-xs flex flex-col md:flex-row overflow-hidden">
        {/* ─── LEFT PANE: WhatsApp Contacts, Presence & Tabs (Width ~380px) ─── */}
        <div
          className={cn(
            'w-full md:w-[380px] lg:w-[410px] shrink-0 border-r border-border flex flex-col bg-surface',
            activeFriendId && 'hidden md:flex'
          )}
        >
          {/* 1. Left Header: Current Student Profile + Presence Dot */}
          <div className="p-3.5 border-b border-border bg-surface-sunken/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-sm bg-ink text-on-ink font-display font-bold flex items-center justify-center text-sm border border-border">
                  SC
                </div>
                <span
                  title="Inside Campus"
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-in-campus rounded-full border-2 border-surface animate-pulse"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-small font-bold text-ink truncate leading-tight">
                  Shashwat Choudhary
                </p>
                <div className="flex items-center gap-1 text-[11px] font-mono text-in-campus font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-in-campus" />
                  <span>On Campus · 23BCE1042</span>
                </div>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-in-campus/10 text-in-campus border border-in-campus/20 font-bold shrink-0">
              IN
            </span>
          </div>

          {/* 2. Navigation Tabs (Exact labels preserved for tests) */}
          <div className="p-2 border-b border-border bg-surface flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('friends')}
              className={cn(
                'px-3 py-1.5 rounded-sm text-small font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'friends'
                  ? 'bg-ink text-on-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
              )}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Friends ({friends.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={cn(
                'px-3 py-1.5 rounded-sm text-small font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'requests'
                  ? 'bg-ink text-on-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Requests</span>
              {incoming.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-mono font-bold bg-highlight text-ink">
                  {incoming.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={cn(
                'px-3 py-1.5 rounded-sm text-small font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeTab === 'search'
                  ? 'bg-ink text-on-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
              )}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Campus Students</span>
            </button>
          </div>

          {/* 3. Search Bar */}
          <div className="p-2.5 border-b border-border bg-surface-sunken/20">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeTab === 'search'
                    ? 'Search all campus students...'
                    : 'Search friends, roll number, or lab...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-small pl-9 pr-7 py-1.5 rounded-sm bg-surface border border-border text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 4. List Content based on Active Tab */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {/* TAB 1: FRIENDS LIST (WhatsApp contact list style) */}
            {activeTab === 'friends' && (
              <div>
                {filteredFriends.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <Users className="w-8 h-8 mx-auto text-ink-muted opacity-40" />
                    <p className="font-display text-small font-bold text-ink">No friends found</p>
                    <p className="text-meta text-ink-muted">
                      {searchQuery
                        ? 'No match for your search term.'
                        : 'Connect with peers from your classes and labs.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      className="px-3 py-1.5 rounded-sm bg-ink text-on-ink text-meta font-semibold cursor-pointer"
                    >
                      Find Students
                    </button>
                  </div>
                ) : (
                  filteredFriends.map((f) => {
                    const isSelected = activeFriendId === f.userId
                    const conv = conversations[f.userId] || []
                    const lastMsg = conv[conv.length - 1]

                    return (
                      <div
                        key={f.userId}
                        onClick={() => setActiveFriendId(f.userId)}
                        className={cn(
                          'p-3 flex items-start gap-3 transition-colors cursor-pointer group hover:bg-surface-sunken/60',
                          isSelected && 'bg-surface-sunken border-l-4 border-l-highlight'
                        )}
                      >
                        {/* Avatar + Live presence status dot */}
                        <div className="relative shrink-0">
                          {f.photoUrl ? (
                            <img
                              src={f.photoUrl}
                              alt={f.fullName}
                              className="w-11 h-11 rounded-sm object-cover border border-border"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-sm text-ink">
                              {f.fullName[0]}
                            </div>
                          )}

                          {/* Verified Presence Indicator */}
                          {f.presence.state === 'inside' ? (
                            <span
                              title={`On Campus: ${f.presence.zoneName || 'Main Campus'}`}
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-in-campus rounded-full border-2 border-surface animate-pulse"
                            />
                          ) : f.presence.state === 'outside' ? (
                            <span
                              title="Outside Campus"
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-ink-muted rounded-full border-2 border-surface"
                            />
                          ) : (
                            <span
                              title="Presence Private"
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-surface border border-border rounded-full flex items-center justify-center"
                            >
                              <Lock size={8} className="text-ink-muted" />
                            </span>
                          )}
                        </div>

                        {/* Middle info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-display text-small font-bold text-ink truncate leading-tight">
                              {f.fullName}
                            </h4>
                            <span className="text-[11px] font-mono text-ink-muted shrink-0">
                              {lastMsg ? lastMsg.timestamp : 'Active'}
                            </span>
                          </div>

                          <p className="text-[11px] font-mono text-ink-muted truncate">
                            Year {f.year} · {f.branch} ({f.collegeId})
                          </p>

                          {/* Last message or live presence snippet */}
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-[12px] text-ink-muted truncate leading-snug">
                              {lastMsg ? (
                                <span>
                                  {lastMsg.senderId === 'me' ? 'You: ' : ''}
                                  {lastMsg.type === 'location'
                                    ? `📍 Shared location: ${lastMsg.locationData?.zoneName}`
                                    : lastMsg.type === 'study_meet'
                                    ? `📅 Study invite: ${lastMsg.studyMeetData?.subject}`
                                    : lastMsg.content}
                                </span>
                              ) : f.presence.state === 'inside' ? (
                                <span className="text-in-campus font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-in-campus" />
                                  <span>On Campus · {f.presence.zoneName || 'Verified'}</span>
                                </span>
                              ) : (
                                <span>Tap to chat and share location</span>
                              )}
                            </p>

                            {/* Profile button (preserved for tests and quick inspection) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenProfile(f.userId)
                              }}
                              className="px-2 py-0.5 rounded-xs border border-border bg-surface text-[11px] font-mono font-semibold text-ink hover:bg-surface-sunken transition-colors shrink-0 cursor-pointer"
                            >
                              Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* TAB 2: REQUESTS (Incoming & Outgoing) */}
            {activeTab === 'requests' && (
              <div className="p-3 space-y-4">
                <div>
                  <h3 className="font-display text-small font-bold text-ink mb-2">
                    Incoming Requests ({incoming.length})
                  </h3>
                  {incoming.length === 0 ? (
                    <p className="text-[12px] text-ink-muted p-3 rounded-sm border border-border bg-surface-sunken/30">
                      No pending incoming friend requests.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {incoming.map((req) => (
                        <div
                          key={req.friendshipId}
                          className="p-3 rounded-md border border-border bg-surface space-y-2 text-small shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-xs text-ink">
                              {req.fullName[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-bold text-ink truncate leading-tight">
                                {req.fullName}
                              </p>
                              <p className="text-[11px] font-mono text-ink-muted">
                                Year {req.year} · {req.branch} ({req.collegeId})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-border">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleRespond(req.friendshipId, 'accept')}
                              className="flex-1 py-1 rounded-sm bg-ink text-on-ink text-meta font-semibold hover:opacity-90 active:opacity-95 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleRespond(req.friendshipId, 'decline')}
                              className="px-3 py-1 rounded-sm border border-border text-meta font-medium text-ink-muted hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-colors cursor-pointer"
                              aria-label="Decline request"
                            >
                              <X className="w-3.5 h-3.5 inline mr-1" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-display text-small font-bold text-ink mb-2">
                    Sent Requests ({outgoing.length})
                  </h3>
                  {outgoing.length === 0 ? (
                    <p className="text-[12px] text-ink-muted p-3 rounded-sm border border-border bg-surface-sunken/30">
                      No active sent requests.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {outgoing.map((req) => (
                        <div
                          key={req.friendshipId}
                          className="p-3 rounded-md border border-border bg-surface flex items-center justify-between gap-2 text-small"
                        >
                          <div className="min-w-0">
                            <p className="font-display font-bold text-ink truncate">{req.fullName}</p>
                            <p className="text-[11px] font-mono text-ink-muted">
                              Year {req.year} · {req.branch}
                            </p>
                          </div>

                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-warning/10 text-warning border border-warning/30 font-bold shrink-0">
                            Pending Response
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SEARCH DIRECTORY */}
            {activeTab === 'search' && (
              <div className="p-3 space-y-2.5">
                {isSearching ? (
                  <p className="text-small text-ink-muted text-center py-6">Searching student directory...</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-small text-ink-muted text-center py-6">
                    {searchQuery ? 'No matching students found.' : 'Search above by name, roll number, or department.'}
                  </p>
                ) : (
                  searchResults.map((stu) => (
                    <div
                      key={stu.userId}
                      className="p-3 rounded-md border border-border bg-surface flex items-center justify-between gap-2 text-small"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-xs text-ink shrink-0">
                          {stu.fullName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-ink truncate leading-tight">
                            {stu.fullName}
                          </p>
                          <p className="text-[11px] font-mono text-ink-muted">
                            Year {stu.year} · {stu.branch} ({stu.collegeId})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProfile(stu.userId)}
                          className="px-2 py-1 rounded-sm border border-border text-meta font-medium text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                        >
                          View
                        </button>

                        {stu.friendshipStatus === 'none' && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleSendRequest(stu.userId)}
                            className="px-2.5 py-1 rounded-sm bg-ink text-on-ink text-meta font-semibold hover:opacity-90 active:opacity-95 flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Add Friend</span>
                          </button>
                        )}

                        {stu.friendshipStatus === 'pending_sent' && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-warning/10 text-warning border border-warning/30">
                            Request Sent
                          </span>
                        )}

                        {stu.friendshipStatus === 'pending_received' && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('requests')}
                            className="px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-ink text-on-ink cursor-pointer"
                          >
                            Respond
                          </button>
                        )}

                        {stu.friendshipStatus === 'friends' && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-success/10 text-success border border-success/30 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Friends</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANE: Active Conversation & Collegiate Actions (flex-1) ─── */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-surface-sunken/20 dark:bg-[#0B101A] relative min-w-0',
            !activeFriendId && 'hidden md:flex'
          )}
        >
          {activeFriend ? (
            <>
              {/* WhatsApp Active Header */}
              <div className="p-3 px-4 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setActiveFriendId(null)}
                    className="md:hidden p-1 rounded-sm text-ink-muted hover:text-ink cursor-pointer"
                    aria-label="Back to contacts"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="relative shrink-0">
                    {activeFriend.photoUrl ? (
                      <img
                        src={activeFriend.photoUrl}
                        alt={activeFriend.fullName}
                        className="w-10 h-10 rounded-sm object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-sm text-ink">
                        {activeFriend.fullName[0]}
                      </div>
                    )}
                    {activeFriend.presence.state === 'inside' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-in-campus rounded-full border-2 border-surface animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-small sm:text-base font-bold text-ink truncate leading-tight">
                        {activeFriend.fullName}
                      </h3>
                      <span className="text-[11px] font-mono text-ink-muted">
                        ({activeFriend.collegeId})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      {activeFriend.presence.state === 'inside' ? (
                        <span className="text-in-campus font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-in-campus" />
                          <span>On Campus · {activeFriend.presence.zoneName || 'Academic Block'}</span>
                        </span>
                      ) : activeFriend.presence.state === 'outside' ? (
                        <span className="text-ink-muted">Outside Campus</span>
                      ) : (
                        <span className="text-ink-muted flex items-center gap-1">
                          <Lock size={10} /> Presence Private
                        </span>
                      )}
                      <span className="text-border">·</span>
                      <span className="text-ink-muted font-mono">{activeFriend.branch}</span>
                    </div>
                  </div>
                </div>

                {/* Collegiate Quick Actions in Header */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Shared current campus location', 'location')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-surface-sunken border border-border text-meta font-mono font-semibold text-ink hover:border-ink transition-colors cursor-pointer shadow-xs"
                    title="Send your live campus location"
                  >
                    <MapPin size={13} className="text-in-campus" />
                    <span>Share Location</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('Proposed 1:1 study meet', 'study_meet')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-surface-sunken border border-border text-meta font-mono font-semibold text-ink hover:border-ink transition-colors cursor-pointer shadow-xs"
                    title="Propose study session in library"
                  >
                    <Calendar size={13} className="text-highlight" />
                    <span>Study Meet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenProfile(activeFriend.userId)}
                    className="px-2.5 py-1.5 rounded-sm border border-border bg-surface text-meta font-mono font-semibold text-ink hover:bg-surface-sunken transition-colors cursor-pointer shadow-xs"
                  >
                    Profile
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {/* Security notice banner */}
                <div className="mx-auto max-w-md p-2 rounded-sm bg-surface border border-border text-[11px] font-mono text-ink-muted text-center shadow-xs flex items-center justify-center gap-1.5">
                  <ShieldCheck size={13} className="text-in-campus shrink-0" />
                  <span>Verified collegiate identity network. Zero GPS storage; geofence zone verification only.</span>
                </div>

                {/* Date separator */}
                <div className="flex items-center justify-center">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-sunken border border-border text-[10px] font-mono font-bold text-ink-muted">
                    Today
                  </span>
                </div>

                {/* Messages Bubbles */}
                {activeMessages.map((msg) => {
                  const isMe = msg.senderId === 'me'

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                    >
                      {/* Location Card message */}
                      {msg.type === 'location' && (
                        <div
                          className={cn(
                            'p-3.5 rounded-md border max-w-sm w-full space-y-2 shadow-xs',
                            isMe
                              ? 'bg-ink text-on-ink border-ink'
                              : 'bg-surface text-ink border-border'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-current/20 pb-2">
                            <span className="text-[11px] font-mono font-bold flex items-center gap-1.5">
                              <MapPin size={13} className="text-in-campus" />
                              <span>Verified Campus Location</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-80">{msg.timestamp}</span>
                          </div>

                          <div className="space-y-1">
                            <p className="font-display text-small font-bold leading-tight">
                              {msg.locationData?.zoneName || 'Academic Block'}
                            </p>
                            <p className="text-[11px] opacity-80">
                              {msg.locationData?.building || 'Main Campus'}
                            </p>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[10px] font-mono opacity-80">
                            <span>Status: High-Confidence Geofence</span>
                            {isMe && <span>✓✓</span>}
                          </div>
                        </div>
                      )}

                      {/* Study Meet Card message */}
                      {msg.type === 'study_meet' && (
                        <div
                          className={cn(
                            'p-3.5 rounded-md border max-w-sm w-full space-y-2 shadow-xs',
                            isMe
                              ? 'bg-ink text-on-ink border-ink'
                              : 'bg-surface text-ink border-border'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-current/20 pb-2">
                            <span className="text-[11px] font-mono font-bold flex items-center gap-1.5">
                              <Calendar size={13} className="text-highlight" />
                              <span>Study Meet Invitation</span>
                            </span>
                            <span className="text-[10px] font-mono opacity-80">{msg.timestamp}</span>
                          </div>

                          <div className="space-y-1">
                            <p className="font-display text-small font-bold leading-tight">
                              {msg.studyMeetData?.subject}
                            </p>
                            <p className="text-[11px] opacity-80">
                              {msg.studyMeetData?.time} · {msg.studyMeetData?.location}
                            </p>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[10px] font-mono opacity-80">
                            <span>Synced to Campus Calendar</span>
                            {isMe && <span>✓✓</span>}
                          </div>
                        </div>
                      )}

                      {/* Standard text bubble */}
                      {msg.type === 'text' && (
                        <div
                          className={cn(
                            'p-3 rounded-md text-small max-w-[85%] sm:max-w-[70%] space-y-1 shadow-xs',
                            isMe
                              ? 'bg-ink text-on-ink rounded-tr-none'
                              : 'bg-surface text-ink border border-border rounded-tl-none'
                          )}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={cn(
                              'text-[10px] font-mono flex items-center gap-1 justify-end',
                              isMe ? 'text-on-ink/70' : 'text-ink-muted'
                            )}
                          >
                            <span>{msg.timestamp}</span>
                            {isMe && <span className="font-bold">✓✓</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Composer Footer (Quick suggestion chips + Message input) */}
              <div className="p-3 border-t border-border bg-surface shrink-0 space-y-2">
                {/* Collegiate Quick Action Suggestion Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-meta">
                  {[
                    'Are you on campus?',
                    'Meet at Central Library?',
                    'Share CS302 notes?',
                    'Coffee at cafeteria?',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt, 'text')}
                      className="px-2.5 py-1 rounded-full bg-surface-sunken border border-border text-[11px] font-medium text-ink hover:border-ink transition-colors whitespace-nowrap cursor-pointer shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input row */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage(draftMessage, 'text')
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Shared current campus location', 'location')}
                    className="p-2 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                    title="Share current verified location"
                  >
                    <MapPin size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={`Type a message to ${activeFriend.fullName}...`}
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    className="flex-1 bg-surface-sunken border border-border rounded-sm px-3.5 py-2 text-small text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
                  />

                  <button
                    type="submit"
                    disabled={!draftMessage.trim()}
                    className="px-3.5 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 disabled:opacity-40 transition-opacity flex items-center gap-1 cursor-pointer"
                    aria-label="Send message"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* WhatsApp Web Style Welcome Splash when no contact is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-md bg-surface border border-border flex items-center justify-center text-ink shadow-xs">
                <Users size={32} strokeWidth={1.5} className="text-highlight" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="font-display text-h2 font-bold text-ink">
                  Select a Conversation
                </h3>
                <p className="text-small text-ink-muted leading-relaxed">
                  Select a friend from the left pane to view live campus presence, chat, share your verified building location, or coordinate study sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg w-full pt-4 text-left">
                <div className="p-3 rounded-md border border-border bg-surface space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-in-campus">
                    <span className="w-2 h-2 rounded-full bg-in-campus" />
                    <span>Geofence Presence</span>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    Know when your study group is on campus or inside labs.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-border bg-surface space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-ink">
                    <MapPin size={12} className="text-highlight" />
                    <span>Location Sharing</span>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    Broadcast your building or room number securely.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-border bg-surface space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-ink">
                    <Calendar size={12} className="text-color-meet" />
                    <span>Study Meets</span>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    Coordinate library study slots synced to calendar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Profile Dialog */}
      <StudentProfileDialog
        profile={selectedProfile}
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false)
          setSelectedProfile(null)
        }}
        onSendRequest={handleSendRequest}
        onRemoveFriend={handleRemoveFriend}
      />
    </div>
  )
}
