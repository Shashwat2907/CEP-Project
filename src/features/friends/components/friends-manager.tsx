'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Check,
  X,
  MapPin,
  Clock,
  Sparkles,
  Lock,
  GraduationCap,
  AlertCircle,
  Building,
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
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
          <Users className="w-6 h-6 text-[var(--primary)]" />
          Campus Friends & Network
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Connect with peers, view shared student communities, and see verified live presence on campus
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-300 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'friends'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Friends ({friends.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Requests</span>
          {incoming.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
              {incoming.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'search'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find Campus Students</span>
        </button>
      </div>

      {/* TAB 1: MY FRIENDS */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-paper)] space-y-3">
              <Users className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No friends added yet</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Connect with classmates, project teammates, and club members across campus.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-sm"
              >
                Find Students
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((f) => (
                <div
                  key={f.userId}
                  className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {f.photoUrl ? (
                        <img
                          src={f.photoUrl}
                          alt={f.fullName}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[var(--surface-sunken)] flex items-center justify-center font-bold text-sm text-[var(--primary)]">
                          {f.fullName[0]}
                        </div>
                      )}
                      {/* Presence indicator */}
                      {f.presence.state === 'inside' && (
                        <span
                          title="On Campus"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[var(--surface-paper)]"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{f.fullName}</h4>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                          ({f.collegeId})
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Year {f.year} · {f.branch}
                      </p>

                      {/* Presence line */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                        {f.presence.state === 'inside' ? (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            On Campus {f.presence.zoneName ? `· ${f.presence.zoneName}` : ''}
                          </span>
                        ) : f.presence.state === 'outside' ? (
                          <span className="text-[var(--text-secondary)]">Outside Campus</span>
                        ) : (
                          <span className="text-[var(--text-secondary)] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 opacity-60" />
                            <span>Presence Private</span>
                          </span>
                        )}
                      </div>

                      {/* Communities */}
                      {f.sharedCommunities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {f.sharedCommunities.slice(0, 2).map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-[var(--surface-sunken)] text-[10px] text-[var(--text-secondary)]"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenProfile(f.userId)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors shrink-0"
                  >
                    Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming */}
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
              Incoming Requests ({incoming.length})
            </h3>
            {incoming.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)]">
                No pending incoming friend requests.
              </p>
            ) : (
              <div className="space-y-2.5">
                {incoming.map((req) => (
                  <div
                    key={req.friendshipId}
                    className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--surface-sunken)] flex items-center justify-center font-bold text-xs text-[var(--primary)]">
                        {req.fullName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{req.fullName}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Year {req.year} · {req.branch} ({req.collegeId})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(req.friendshipId, 'accept')}
                        className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(req.friendshipId, 'decline')}
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
              Sent Requests ({outgoing.length})
            </h3>
            {outgoing.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)]">
                No active sent requests.
              </p>
            ) : (
              <div className="space-y-2.5">
                {outgoing.map((req) => (
                  <div
                    key={req.friendshipId}
                    className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{req.fullName}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Year {req.year} · {req.branch}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
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
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl bg-[var(--surface-paper)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)] shadow-2xs"
            />
          </div>

          <div className="space-y-2.5">
            {searchResults.map((stu) => (
              <div
                key={stu.userId}
                className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-paper)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-sunken)] flex items-center justify-center font-bold text-xs text-[var(--primary)]">
                    {stu.fullName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-[var(--text-primary)]">{stu.fullName}</p>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        ({stu.collegeId})
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Year {stu.year} · {stu.branch}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(stu.userId)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                  >
                    View
                  </button>

                  {stu.friendshipStatus === 'none' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSendRequest(stu.userId)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Friend</span>
                    </button>
                  )}

                  {stu.friendshipStatus === 'pending_sent' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      Request Sent
                    </span>
                  )}

                  {stu.friendshipStatus === 'pending_received' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('requests')}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-600 text-white"
                    >
                      Respond
                    </button>
                  )}

                  {stu.friendshipStatus === 'friends' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Friends</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
