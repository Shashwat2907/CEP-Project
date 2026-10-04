'use client'

import React, { useState, useEffect } from 'react'
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
        <h1 className="font-display text-h1 font-bold text-ink flex items-center gap-2.5">
          <Users className="w-6 h-6 text-ink" />
          Campus Friends & Network
        </h1>
        <p className="text-small text-ink-muted mt-1">
          Connect with peers, view shared student communities, and see verified live presence on campus.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-sm bg-surface-sunken border border-border text-small text-ink font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-ink-muted" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={cn(
            'pb-2.5 px-3 text-small font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer',
            activeTab === 'friends'
              ? 'border-highlight text-ink font-bold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Friends ({friends.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={cn(
            'pb-2.5 px-3 text-small font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer',
            activeTab === 'requests'
              ? 'border-highlight text-ink font-bold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Requests</span>
          {incoming.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-sm text-meta font-mono font-bold bg-ink text-on-ink">
              {incoming.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={cn(
            'pb-2.5 px-3 text-small font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer',
            activeTab === 'search'
              ? 'border-highlight text-ink font-bold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <Search className="w-4 h-4" />
          <span>Find Campus Students</span>
        </button>
      </div>

      {/* TAB 1: MY FRIENDS */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div className="p-12 text-center rounded-md border border-dashed border-border bg-surface space-y-3">
              <Users className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
              <h3 className="font-display text-small font-bold text-ink">No friends added yet</h3>
              <p className="text-small text-ink-muted max-w-sm mx-auto">
                Connect with classmates, project teammates, and club members across campus.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 transition-opacity cursor-pointer"
              >
                Find Students
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((f) => (
                <div
                  key={f.userId}
                  className="p-4 rounded-md border border-border bg-surface transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {f.photoUrl ? (
                        <img
                          src={f.photoUrl}
                          alt={f.fullName}
                          className="w-12 h-12 rounded-sm object-cover border border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-sm text-ink">
                          {f.fullName[0]}
                        </div>
                      )}
                      {/* Presence indicator */}
                      {f.presence.state === 'inside' && (
                        <span
                          title="On Campus"
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-in-campus rounded-full border-2 border-surface"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-display text-small font-bold text-ink">{f.fullName}</h4>
                        <span className="text-meta font-mono text-ink-muted">
                          ({f.collegeId})
                        </span>
                      </div>

                      <p className="text-meta text-ink-muted mt-0.5">
                        Year {f.year} · {f.branch}
                      </p>

                      {/* Presence line */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-meta">
                        {f.presence.state === 'inside' ? (
                          <span className="font-medium text-in-campus flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-in-campus animate-pulse" />
                            On Campus {f.presence.zoneName ? `· ${f.presence.zoneName}` : ''}
                          </span>
                        ) : f.presence.state === 'outside' ? (
                          <span className="text-ink-muted">Outside Campus</span>
                        ) : (
                          <span className="text-ink-muted flex items-center gap-1">
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
                              className="px-2 py-0.5 rounded-sm bg-surface-sunken border border-border text-meta font-mono text-ink-muted"
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
                    className="px-3 py-1.5 rounded-sm border border-border bg-surface text-small font-medium text-ink hover:bg-surface-sunken transition-colors shrink-0 cursor-pointer"
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
            <h3 className="font-display text-small font-bold text-ink mb-3">
              Incoming Requests ({incoming.length})
            </h3>
            {incoming.length === 0 ? (
              <p className="text-small text-ink-muted p-4 rounded-md border border-border bg-surface">
                No pending incoming friend requests.
              </p>
            ) : (
              <div className="space-y-2.5">
                {incoming.map((req) => (
                  <div
                    key={req.friendshipId}
                    className="p-3.5 rounded-md border border-border bg-surface flex items-center justify-between gap-3 text-small"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-xs text-ink">
                        {req.fullName[0]}
                      </div>
                      <div>
                        <p className="font-display font-bold text-ink">{req.fullName}</p>
                        <p className="text-meta font-mono text-ink-muted">
                          Year {req.year} · {req.branch} ({req.collegeId})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(req.friendshipId, 'accept')}
                        className="px-3 py-1.5 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(req.friendshipId, 'decline')}
                        className="px-2.5 py-1.5 rounded-sm border border-border text-small text-ink-muted hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-colors cursor-pointer"
                        aria-label="Decline request"
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
            <h3 className="font-display text-small font-bold text-ink mb-3">
              Sent Requests ({outgoing.length})
            </h3>
            {outgoing.length === 0 ? (
              <p className="text-small text-ink-muted p-4 rounded-md border border-border bg-surface">
                No active sent requests.
              </p>
            ) : (
              <div className="space-y-2.5">
                {outgoing.map((req) => (
                  <div
                    key={req.friendshipId}
                    className="p-3.5 rounded-md border border-border bg-surface flex items-center justify-between gap-3 text-small"
                  >
                    <div>
                      <p className="font-display font-bold text-ink">{req.fullName}</p>
                      <p className="text-meta font-mono text-ink-muted">
                        Year {req.year} · {req.branch}
                      </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-sm text-meta font-mono bg-warning/10 text-warning border border-warning/30">
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
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-small pl-9 pr-4 py-2 rounded-sm bg-surface border border-border text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
          </div>

          <div className="space-y-2.5">
            {searchResults.map((stu) => (
              <div
                key={stu.userId}
                className="p-3.5 rounded-md border border-border bg-surface flex items-center justify-between gap-3 text-small"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-sm bg-surface-sunken border border-border flex items-center justify-center font-display font-bold text-xs text-ink">
                    {stu.fullName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-display font-bold text-ink">{stu.fullName}</p>
                      <span className="text-meta font-mono text-ink-muted">
                        ({stu.collegeId})
                      </span>
                    </div>
                    <p className="text-meta text-ink-muted">
                      Year {stu.year} · {stu.branch}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(stu.userId)}
                    className="px-2.5 py-1.5 rounded-sm border border-border text-small text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                  >
                    View
                  </button>

                  {stu.friendshipStatus === 'none' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSendRequest(stu.userId)}
                      className="px-3 py-1.5 rounded-sm bg-ink text-on-ink text-small font-semibold hover:opacity-90 active:opacity-95 flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Friend</span>
                    </button>
                  )}

                  {stu.friendshipStatus === 'pending_sent' && (
                    <span className="px-2.5 py-0.5 rounded-sm text-meta font-mono bg-warning/10 text-warning border border-warning/30">
                      Request Sent
                    </span>
                  )}

                  {stu.friendshipStatus === 'pending_received' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('requests')}
                      className="px-2.5 py-1 rounded-sm text-meta font-semibold bg-ink text-on-ink cursor-pointer"
                    >
                      Respond
                    </button>
                  )}

                  {stu.friendshipStatus === 'friends' && (
                    <span className="px-2.5 py-0.5 rounded-sm text-meta font-mono bg-success/10 text-success border border-success/30 flex items-center gap-1">
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
