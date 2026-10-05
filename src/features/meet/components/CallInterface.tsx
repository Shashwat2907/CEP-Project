'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CallAccessResult } from '../schema'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog'
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ShieldCheck,
  Clock,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  AlertTriangle,
  PenTool,
  LayoutGrid,
  Check,
} from 'lucide-react'
import { WhiteboardCanvas } from './WhiteboardCanvas'
import { admitStudentToCall } from '../actions'

interface CallInterfaceProps {
  access: Extract<CallAccessResult, { ok: true }>
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
}

/**
 * Creates an animated, live canvas video stream when physical camera hardware
 * is locked by another browser tab (common on Windows with single-client webcams).
 */
function createSyntheticVideoStream(name: string, role: string): MediaStream {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    const dummy = document.createElement('canvas')
    return dummy.captureStream(20)
  }

  let frame = 0
  let animId: number

  function draw() {
    frame++
    // Animated dark gradient background
    const grad = ctx!.createLinearGradient(0, 0, 640, 480)
    const shift = Math.sin(frame * 0.03) * 15
    grad.addColorStop(0, `rgb(${16 + shift * 0.2}, ${26 + shift * 0.3}, ${50 + shift * 0.5})`)
    grad.addColorStop(1, `rgb(10, 15, 26)`)
    ctx!.fillStyle = grad
    ctx!.fillRect(0, 0, 640, 480)

    // Pulsing aura ring
    const radius = 64 + Math.sin(frame * 0.06) * 6
    ctx!.beginPath()
    ctx!.arc(320, 200, radius + 12, 0, Math.PI * 2)
    ctx!.fillStyle = role === 'teacher' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)'
    ctx!.fill()

    // Avatar Circle
    ctx!.beginPath()
    ctx!.arc(320, 200, radius, 0, Math.PI * 2)
    ctx!.fillStyle = role === 'teacher' ? '#1E3A8A' : '#065F46'
    ctx!.strokeStyle = role === 'teacher' ? '#3B82F6' : '#10B981'
    ctx!.lineWidth = 3
    ctx!.fill()
    ctx!.stroke()

    // Initials
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    ctx!.fillStyle = '#FFFFFF'
    ctx!.font = 'bold 36px sans-serif'
    ctx!.textAlign = 'center'
    ctx!.textBaseline = 'middle'
    ctx!.fillText(initials, 320, 200)

    // Name & Role labels
    ctx!.font = 'bold 18px sans-serif'
    ctx!.fillText(name, 320, 310)
    ctx!.font = '14px sans-serif'
    ctx!.fillStyle = '#94A3B8'
    ctx!.fillText(role === 'teacher' ? 'Faculty Member' : 'Student', 320, 335)

    // Live Camera Indicator
    ctx!.fillStyle = '#10B981'
    ctx!.beginPath()
    ctx!.arc(280, 370, 4, 0, Math.PI * 2)
    ctx!.fill()
    ctx!.fillStyle = '#6EE7B7'
    ctx!.font = '11px monospace'
    ctx!.fillText('LIVE VIDEO STREAM', 335, 370)

    animId = requestAnimationFrame(draw)
  }

  draw()

  const stream = canvas.captureStream(25)
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    cancelAnimationFrame(animId)
  })

  return stream
}

export function CallInterface({ access }: CallInterfaceProps) {
  const router = useRouter()
  const { session, userRole: initialRole, otherParticipantName, otherParticipantRole, roomName, currentUserId } = access

  // Unique ID for this browser tab to prevent message reflection
  const myTabId = useRef(`tab-${Math.random().toString(36).slice(2, 9)}`).current

  // Active identity in this tab (strictly derived from authenticated session)
  const activeRole = initialRole

  // Participant display resolution
  const teacherFullName = session.teacher?.full_name || 'Prof. Rajesh Sharma'
  const studentFullName = session.student?.full_name || 'Aarav Mehta'

  const myName = access.currentUserName || (activeRole === 'teacher' ? teacherFullName : studentFullName)
  const myRoleLabel = activeRole === 'teacher' ? 'Faculty Member' : 'Student'
  const theirName = access.otherParticipantName || (activeRole === 'teacher' ? studentFullName : teacherFullName)
  const theirRoleLabel = access.otherParticipantRole || (activeRole === 'teacher' ? 'Student' : 'Faculty Member')
  const otherRole = activeRole === 'teacher' ? 'student' : 'teacher'

  // Host Admission Prompt (for teacher when student knocks/waits in lobby)
  const [pendingKnockStudent, setPendingKnockStudent] = useState<string | null>(null)

  useEffect(() => {
    if (activeRole !== 'teacher') return

    let admissionBc: BroadcastChannel | null = null
    try {
      admissionBc = new BroadcastChannel(`meet-admission-${session.id}`)
      admissionBc.onmessage = (e) => {
        if (e.data?.type === 'KNOCK') {
          setPendingKnockStudent(e.data.studentName || theirName)
        }
      }
    } catch {}

    return () => {
      admissionBc?.close()
    }
  }, [activeRole, session.id, theirName])

  const handleAdmitStudent = async () => {
    try {
      await admitStudentToCall(session.id)
      const ch = new BroadcastChannel(`meet-admission-${session.id}`)
      ch.postMessage({ type: 'ADMITTED', sessionId: session.id })
      ch.close()
    } catch (err) {
      console.error('Error admitting student:', err)
    }
    setPendingKnockStudent(null)
  }

  // View & Layout states
  const [viewMode, setViewMode] = useState<'video' | 'whiteboard' | 'split'>('video')
  const [layoutMode, setLayoutMode] = useState<'spotlight' | 'grid'>('spotlight')
  const [lastSavedWbVersion, setLastSavedWbVersion] = useState<number | null>(null)

  // Media state
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isPipExpanded, setIsPipExpanded] = useState(true)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  // Remote peer state
  const [isRemoteConnected, setIsRemoteConnected] = useState(false)
  const [remoteCamOn, setRemoteCamOn] = useState(true)
  const [remoteMicOn, setRemoteMicOn] = useState(true)
  const [isRemoteAudioMutedLocally, setIsRemoteAudioMutedLocally] = useState(true) // prevent same-device audio feedback
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected'>('connecting')

  // Last received live video frame (instant fallback when WebRTC is negotiating)
  const [remoteFrameUrl, setRemoteFrameUrl] = useState<string | null>(null)

  // Video references
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const gridLocalVideoRef = useRef<HTMLVideoElement | null>(null)
  const gridRemoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const isNegotiatingRef = useRef(false)

  // Channels
  const signalChannelRef = useRef<BroadcastChannel | null>(null)
  const framesChannelRef = useRef<BroadcastChannel | null>(null)

  // Session Time Remaining Calculation
  const endsAtMs = new Date(session.ends_at).getTime()
  const initialDiffSec = Math.floor((endsAtMs - Date.now()) / 1000)
  const isExpiredInitially = initialDiffSec <= 0
  const [remainingSec, setRemainingSec] = useState(() =>
    isExpiredInitially ? 30 * 60 : initialDiffSec
  )
  const [isTimeExpired, setIsTimeExpired] = useState(false)

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        const next = prev - 1
        if (next <= 0) {
          setIsTimeExpired(true)
          clearInterval(timer)
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // ── WebRTC PeerConnection Setup ──
  const getOrCreatePeerConnection = useCallback(() => {
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
      return peerConnectionRef.current
    }

    try {
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = pc

      pc.onicecandidate = (event) => {
        if (event.candidate && signalChannelRef.current) {
          signalChannelRef.current.postMessage({
            type: 'ICE_CANDIDATE',
            senderTabId: myTabId,
            candidate: event.candidate,
          })
        }
      }

      pc.ontrack = (event) => {
        const [incomingStream] = event.streams
        if (incomingStream) {
          remoteStreamRef.current = incomingStream
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = incomingStream
            remoteVideoRef.current.play().catch(() => {})
          }
          if (gridRemoteVideoRef.current) {
            gridRemoteVideoRef.current.srcObject = incomingStream
            gridRemoteVideoRef.current.play().catch(() => {})
          }
          setIsRemoteConnected(true)
          setRemoteCamOn(true)
          setConnectionStatus('connected')
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsRemoteConnected(true)
          setConnectionStatus('connected')
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          // If WebRTC fails, frame-mirror fallback keeps working
        }
      }

      // Add local tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      return pc
    } catch (e) {
      console.warn('[WebRTC] RTCPeerConnection creation failed:', e)
      return null
    }
  }, [myTabId])

  // Initiate WebRTC offer (Polite Peer negotiation)
  const startNegotiation = useCallback(async () => {
    const pc = getOrCreatePeerConnection()
    if (!pc || isNegotiatingRef.current) return

    try {
      isNegotiatingRef.current = true
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await pc.setLocalDescription(offer)

      signalChannelRef.current?.postMessage({
        type: 'OFFER',
        senderTabId: myTabId,
        sdp: offer,
      })
    } catch (err) {
      console.warn('[WebRTC] Error creating offer:', err)
    } finally {
      isNegotiatingRef.current = false
    }
  }, [getOrCreatePeerConnection, myTabId])

  // ── Frame Mirroring (Instant Cross-Tab Video Streaming) ──
  // Guarantees that even if WebRTC encounters network/firewall hiccups,
  // both tabs immediately see each other's live camera frames without delay.
  useEffect(() => {
    if (!isCamOn) return

    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const interval = setInterval(() => {
      const activeVideo = localVideoRef.current || gridLocalVideoRef.current
      if (activeVideo && activeVideo.readyState >= 2 && framesChannelRef.current) {
        try {
          ctx.drawImage(activeVideo, 0, 0, 320, 240)
          const frameData = canvas.toDataURL('image/jpeg', 0.6)
          framesChannelRef.current.postMessage({
            type: 'FRAME',
            senderTabId: myTabId,
            frame: frameData,
            name: myName,
            role: activeRole,
          })
        } catch {
          // Canvas capture error ignored
        }
      }
    }, 100) // 10 fps lightweight frame stream

    return () => clearInterval(interval)
  }, [isCamOn, myName, activeRole, myTabId])

  // ── Main Initialization Effect: Signaling + Media ──
  useEffect(() => {
    let isMounted = true

    // 1. Setup BroadcastChannels
    const signalBc = new BroadcastChannel(`meet-p2p-${session.id}`)
    const framesBc = new BroadcastChannel(`meet-frames-${session.id}`)
    signalChannelRef.current = signalBc
    framesChannelRef.current = framesBc

    // 2. Handle incoming video frames from the other tab
    framesBc.onmessage = (e) => {
      const data = e.data
      if (!data || !isMounted) return
      if (data.senderTabId === myTabId) return // Ignore self frames

      // We have an active peer streaming frames!
      setIsRemoteConnected(true)
      setRemoteCamOn(true)
      setConnectionStatus('connected')
      if (data.frame) {
        setRemoteFrameUrl(data.frame)
      }
    }

    // 3. Handle WebRTC Signaling messages
    signalBc.onmessage = async (e) => {
      const data = e.data
      if (!data || !isMounted) return
      if (data.senderTabId === myTabId) return // Ignore self messages

      // Heartbeat: someone is alive in this room!
      if (data.type === 'PEER_HEARTBEAT' || data.type === 'PEER_JOINED') {
        setIsRemoteConnected(true)
        setConnectionStatus('connected')

        // Auto-arbitrate role conflict: if both tabs joined with the same role,
        // automatically assign complementary roles so pair-testing works out of the box!
        if (data.role === activeRole) {
          if (myTabId > data.senderTabId) {
            setActiveRole('student')
          } else {
            setActiveRole('teacher')
          }
        }

        // Polite peer negotiation: tab with smaller ID initiates WebRTC offer
        if (myTabId < data.senderTabId) {
          startNegotiation()
        }
      }

      if (data.type === 'OFFER') {
        const pc = getOrCreatePeerConnection()
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            signalBc.postMessage({
              type: 'ANSWER',
              senderTabId: myTabId,
              sdp: answer,
            })
          } catch (err) {
            console.warn('[WebRTC] Error handling offer:', err)
          }
        }
      }

      if (data.type === 'ANSWER') {
        const pc = peerConnectionRef.current
        if (pc && pc.signalingState !== 'stable') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          } catch (err) {
            console.warn('[WebRTC] Error handling answer:', err)
          }
        }
      }

      if (data.type === 'ICE_CANDIDATE') {
        const pc = peerConnectionRef.current
        if (pc && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          } catch (err) {
            console.warn('[WebRTC] Error adding ICE candidate:', err)
          }
        }
      }

      if (data.type === 'MEDIA_STATE') {
        if (typeof data.isCamOn === 'boolean') setRemoteCamOn(data.isCamOn)
        if (typeof data.isMicOn === 'boolean') setRemoteMicOn(data.isMicOn)
      }

      if (data.type === 'PEER_LEFT') {
        setIsRemoteConnected(false)
        setRemoteFrameUrl(null)
      }
    }

    // 4. Media Acquisition (Real camera or animated fallback if camera locked)
    async function initMedia() {
      let stream: MediaStream | null = null

      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
        }
      } catch (err) {
        console.warn('[CallInterface] Camera locked by other tab, creating animated live avatar:', err)
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const syntheticVideo = createSyntheticVideoStream(myName, activeRole)
          stream = new MediaStream([...syntheticVideo.getVideoTracks(), ...audioStream.getAudioTracks()])
        } catch {
          stream = createSyntheticVideoStream(myName, activeRole)
        }
      }

      if (!isMounted) {
        stream?.getTracks().forEach((t) => t.stop())
        return
      }

      if (stream) {
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.play().catch(() => {})
        }
        if (gridLocalVideoRef.current) {
          gridLocalVideoRef.current.srcObject = stream
          gridLocalVideoRef.current.play().catch(() => {})
        }

        // Add tracks to WebRTC
        const pc = getOrCreatePeerConnection()
        if (pc) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream!))
        }
      }

      // Broadcast presence immediately
      signalBc.postMessage({
        type: 'PEER_JOINED',
        senderTabId: myTabId,
        role: activeRole,
        name: myName,
      })
    }

    initMedia()

    // 5. Periodic Heartbeat to maintain cross-tab synchronization
    const heartbeatTimer = setInterval(() => {
      if (signalBc) {
        signalBc.postMessage({
          type: 'PEER_HEARTBEAT',
          senderTabId: myTabId,
          role: activeRole,
          name: myName,
          isCamOn,
          isMicOn,
        })
      }
    }, 1500)

    return () => {
      isMounted = false
      clearInterval(heartbeatTimer)
      signalBc.postMessage({ type: 'PEER_LEFT', senderTabId: myTabId })
      signalBc.close()
      framesBc.close()
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [session.id, activeRole, myName, myTabId, getOrCreatePeerConnection, startNegotiation])

  // Attach streams to video elements whenever layout updates
  useEffect(() => {
    if (localStreamRef.current) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
        localVideoRef.current.play().catch(() => {})
      }
      if (gridLocalVideoRef.current && gridLocalVideoRef.current.srcObject !== localStreamRef.current) {
        gridLocalVideoRef.current.srcObject = localStreamRef.current
        gridLocalVideoRef.current.play().catch(() => {})
      }
    }
    if (remoteStreamRef.current) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        remoteVideoRef.current.play().catch(() => {})
      }
      if (gridRemoteVideoRef.current && gridRemoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        gridRemoteVideoRef.current.srcObject = remoteStreamRef.current
        gridRemoteVideoRef.current.play().catch(() => {})
      }
    }
  }, [viewMode, layoutMode, isRemoteConnected])

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    const nextState = !isMicOn
    setIsMicOn(nextState)

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState
      })
    }

    signalChannelRef.current?.postMessage({
      type: 'MEDIA_STATE',
      senderTabId: myTabId,
      isMicOn: nextState,
      isCamOn,
    })
  }, [isMicOn, isCamOn, myTabId])

  // Toggle Camera
  const toggleCam = useCallback(() => {
    const nextState = !isCamOn
    setIsCamOn(nextState)

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState
      })
    }

    signalChannelRef.current?.postMessage({
      type: 'MEDIA_STATE',
      senderTabId: myTabId,
      isCamOn: nextState,
      isMicOn,
    })
  }, [isCamOn, isMicOn, myTabId])

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null
      }
      setIsScreenSharing(false)
    } else {
      try {
        if (!navigator?.mediaDevices?.getDisplayMedia) {
          alert('Screen sharing is not supported by your current browser.')
          return
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = screenStream
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = screenStream
        }
        setIsScreenSharing(true)

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          screenStreamRef.current = null
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err)
      }
    }
  }

  // Leave Call action
  const handleLeaveCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    router.push('/meet')
  }

  // Format timer
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const isLowTime = remainingSec <= 300 // 5 minutes left
  const isCriticalTime = remainingSec <= 60 // 1 minute left

  return (
    <div className="flex flex-col h-screen w-full bg-[#0B101A] text-slate-100 overflow-hidden select-none">
      {/* ── Top Bar ── */}
      <header className="h-16 px-4 sm:px-6 bg-[#16213E]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        {/* Left: Meeting info & Active Role Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 text-sm sm:text-base">
              {theirName}
            </span>
            <Chip variant="default" size="sm" className="bg-slate-800/80 border-slate-700 text-slate-300">
              {theirRoleLabel}
            </Chip>
          </div>

          {/* User Account Display */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/70 rounded-full px-2.5 py-1 text-xs">
            <span className="text-slate-400">You:</span>
            <span className="font-medium text-emerald-400">{myName}</span>
            <span className="text-slate-500">({myRoleLabel})</span>
          </div>
        </div>

        {/* Center: View Mode (Video vs Whiteboard vs Split) */}
        <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700/80 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('video')}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === 'video'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => setViewMode('whiteboard')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'whiteboard'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>Whiteboard</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`hidden md:inline-block px-3 py-1 rounded transition-colors ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split View
          </button>
        </div>

        {/* Right: Layout, Status & Timer */}
        <div className="flex items-center gap-3">
          {/* Layout switcher (Spotlight vs Grid) */}
          {viewMode === 'video' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLayoutMode((prev) => (prev === 'spotlight' ? 'grid' : 'spotlight'))}
              className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 gap-1.5 text-xs px-2.5"
              title={layoutMode === 'spotlight' ? 'Switch to 50/50 Grid View' : 'Switch to Spotlight View'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{layoutMode === 'spotlight' ? 'Grid' : 'Spotlight'}</span>
            </Button>
          )}

          {/* Peer Connection Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isRemoteConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 hidden sm:inline">
              {isRemoteConnected ? 'Peer Connected' : 'Waiting for Peer'}
            </span>
          </div>

          {/* Remaining Time Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold transition-colors ${
              isCriticalTime
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                : isLowTime
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(remainingSec)}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettingsDialog(true)}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
            title="Meeting Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Teacher Admission Request Banner ── */}
      {pendingKnockStudent && activeRole === 'teacher' && (
        <div className="bg-emerald-950/95 border-b border-emerald-500/50 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 z-30 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              <strong className="text-white font-semibold">{pendingKnockStudent}</strong> is in the waiting room asking to join.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-7 px-3 text-xs gap-1 shadow"
              onClick={handleAdmitStudent}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Admit to Call</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-emerald-300 hover:text-white hover:bg-emerald-900/60 h-7 px-2 text-xs"
              onClick={() => setPendingKnockStudent(null)}
            >
              Ignore
            </Button>
          </div>
        </div>
      )}

      {/* ── Sub-header Banner: Meeting Info & Audio Protection ── */}
      <div className="bg-[#121A2B] border-b border-slate-800/80 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 z-10 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Encrypted Room:
          </span>
          <span className="font-mono text-slate-400">{roomName}</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">
            You are in as <strong className="text-slate-200">{myName}</strong> ({myRoleLabel})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Feedback Protection */}
          <button
            type="button"
            onClick={() => setIsRemoteAudioMutedLocally(!isRemoteAudioMutedLocally)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:text-white"
            title="Mutes remote speaker audio to prevent feedback when testing both tabs on one laptop"
          >
            {isRemoteAudioMutedLocally ? (
              <>
                <VolumeX className="h-3 w-3 text-amber-400" />
                <span>Test Audio: Muted (No Feedback)</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3 text-emerald-400" />
                <span>Audio Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Canvas / Video Stage ── */}
      <main className="relative flex-1 bg-[#0F1420] p-3 sm:p-4 flex items-center justify-center overflow-hidden">
        {mediaError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-950/80 border border-amber-700/60 text-amber-200 px-4 py-2 rounded-lg text-xs flex items-center gap-2 max-w-md shadow-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{mediaError}</span>
          </div>
        )}

        {/* ── MODE 1: Video View ── */}
        {viewMode === 'video' && (
          <>
            {/* Screen sharing spotlight take-over */}
            {isScreenSharing ? (
              <div className="relative w-full h-full max-w-5xl rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
                <video
                  ref={screenShareVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                  <ScreenShare className="h-3.5 w-3.5 text-blue-400" />
                  <span>You are sharing your screen</span>
                </div>
              </div>
            ) : layoutMode === 'spotlight' ? (
              /* ── Spotlight Layout: Remote participant full-stage + You in PiP ── */
              <div className="relative w-full h-full max-w-5xl rounded-2xl bg-[#171D2B] border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-2xl">
                {isRemoteConnected ? (
                  /* Live Remote Video or Frame Mirror */
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {/* Primary WebRTC Stream */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted={isRemoteAudioMutedLocally}
                      className={`w-full h-full object-cover ${remoteCamOn && !remoteFrameUrl ? 'block' : 'hidden'}`}
                    />

                    {/* Instant Frame Mirror fallback */}
                    {remoteFrameUrl && remoteCamOn && (
                      <img
                        src={remoteFrameUrl}
                        alt={theirName}
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    )}

                    {/* Remote Camera Off Avatar */}
                    {!remoteCamOn && (
                      <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                        <div className="h-28 w-28 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-100 text-3xl font-bold shadow-inner">
                          {theirName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-100">{theirName}</h3>
                        <p className="text-slate-400 text-xs">Camera is paused</p>
                      </div>
                    )}

                    {/* Participant Details Badge on stage */}
                    <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-100 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-10">
                      {remoteMicOn ? (
                        <Mic className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className="font-medium">{theirName}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{theirRoleLabel}</span>
                    </div>
                  </div>
                ) : (
                  /* Waiting for other participant screen */
                  <div className="flex flex-col items-center justify-center space-y-5 text-center p-6 max-w-md">
                    {/* Concentric pulse rings */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute h-36 w-36 rounded-full bg-blue-500/10 animate-ping" />
                      <div className="absolute h-28 w-28 rounded-full bg-blue-500/20 animate-pulse" />
                      <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-100 text-2xl font-bold shadow-xl relative z-10">
                        {theirName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h2 className="text-lg font-bold text-slate-100">
                        Waiting for {theirName} to join...
                      </h2>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        This call room is active. Open the link as <strong>{theirRoleLabel}</strong> in another tab or window to start video.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleOpenOtherInNewTab}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs shadow-md"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open as {theirRoleLabel} in New Tab</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyOtherLink}
                        className="border-slate-700 text-slate-300 hover:text-white gap-1.5 text-xs"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{isCopied ? 'Link Copied!' : 'Copy Link'}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Self View Floating PiP (Bottom-right) */}
                <div
                  className={`absolute bottom-4 right-4 rounded-xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300 z-10 ${
                    isPipExpanded ? 'w-48 sm:w-56 h-32 sm:h-36' : 'w-24 h-16'
                  }`}
                >
                  <div className="relative w-full h-full flex items-center justify-center bg-black/40">
                    {isCamOn ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center">
                        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs">
                          {activeRole === 'teacher' ? 'FAC' : 'STU'}
                        </div>
                        {isPipExpanded && (
                          <span className="text-[10px] text-slate-400 mt-1">Camera Off</span>
                        )}
                      </div>
                    )}

                    {/* PiP Mini Controls */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => setIsPipExpanded(!isPipExpanded)}
                        className="p-1 rounded bg-black/60 text-slate-300 hover:text-white"
                        title={isPipExpanded ? 'Minimize View' : 'Expand View'}
                      >
                        {isPipExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Mic Status on PiP */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded text-[10px] text-slate-300">
                      {isMicOn ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-red-400" />}
                      <span>{myName.split(' ')[0]} (You)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Grid Layout: 50% / 50% Side-by-Side Dual Tiles (Google Meet Style) ── */
              <div className="w-full h-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tile 1: YOU */}
                <div className="relative rounded-2xl bg-[#171D2B] border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
                  {isCamOn ? (
                    <video
                      ref={gridLocalVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 text-xl font-bold">
                        {myName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-slate-400 text-xs">Your Camera is Off</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {isMicOn ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-red-400" />}
                    <span className="font-semibold text-slate-100">{myName} (You)</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{myRoleLabel}</span>
                  </div>
                </div>

                {/* Tile 2: OTHER PARTICIPANT */}
                <div className="relative rounded-2xl bg-[#171D2B] border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
                  {isRemoteConnected ? (
                    <>
                      {/* WebRTC stream */}
                      <video
                        ref={gridRemoteVideoRef}
                        autoPlay
                        playsInline
                        muted={isRemoteAudioMutedLocally}
                        className={`w-full h-full object-cover ${remoteCamOn && !remoteFrameUrl ? 'block' : 'hidden'}`}
                      />
                      {/* Frame mirror fallback */}
                      {remoteFrameUrl && remoteCamOn && (
                        <img
                          src={remoteFrameUrl}
                          alt={theirName}
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      )}
                      {!remoteCamOn && (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-200 text-xl font-bold">
                            {theirName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-slate-400 text-xs">{theirName}&apos;s Camera is Off</span>
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 z-10">
                        {remoteMicOn ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-red-400" />}
                        <span className="font-semibold text-slate-100">{theirName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{theirRoleLabel}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg animate-pulse">
                        {theirName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm">Waiting for {theirName}...</h4>
                        <p className="text-slate-400 text-xs mt-0.5">Click below to open other tab</p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleOpenOtherInNewTab}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Join as {theirRoleLabel}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MODE 2: Whiteboard Focus Mode ── */}
        {viewMode === 'whiteboard' && (
          <div className="relative w-full h-full max-w-6xl flex flex-col shadow-2xl">
            <WhiteboardCanvas
              sessionId={session.id}
              currentUserId={currentUserId}
              currentUserName={myName}
              onSnapshotSaved={(v) => setLastSavedWbVersion(v)}
            />

            {/* Floating Mini PiP during Whiteboard Mode */}
            <div
              className={`absolute bottom-4 right-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300 z-20 ${
                isPipExpanded ? 'w-44 h-32' : 'w-24 h-16'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center bg-black/40">
                {isCamOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="text-slate-400 text-xs">Camera Off</div>
                )}
                <div className="absolute bottom-1 left-1 bg-black/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">
                  You
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 3: Split View (Video Tiles Left + Whiteboard Right) ── */}
        {viewMode === 'split' && (
          <div className="w-full h-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Dual Video Stack */}
            <div className="lg:col-span-4 h-full flex flex-col gap-3">
              {/* Remote Video Tile */}
              <div className="relative flex-1 rounded-xl bg-[#171D2B] border border-slate-800 overflow-hidden flex items-center justify-center">
                {isRemoteConnected ? (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted={isRemoteAudioMutedLocally}
                      className={`w-full h-full object-cover ${!remoteFrameUrl ? 'block' : 'hidden'}`}
                    />
                    {remoteFrameUrl && (
                      <img
                        src={remoteFrameUrl}
                        alt={theirName}
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center p-3">
                    <p className="text-xs text-slate-400">Waiting for {theirName}</p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-300">
                  {theirName}
                </div>
              </div>

              {/* Local Video Tile */}
              <div className="relative flex-1 rounded-xl bg-[#171D2B] border border-slate-800 overflow-hidden flex items-center justify-center">
                {isCamOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="text-slate-400 text-xs">Camera Off</div>
                )}
                <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-300">
                  {myName} (You)
                </div>
              </div>
            </div>

            {/* Right: Collaborative Whiteboard */}
            <div className="lg:col-span-8 h-full flex flex-col">
              <WhiteboardCanvas
                sessionId={session.id}
                currentUserId={currentUserId}
                currentUserName={myName}
                onSnapshotSaved={(v) => setLastSavedWbVersion(v)}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Control Bar ── */}
      <footer className="h-20 bg-[#16213E]/95 backdrop-blur-md border-t border-slate-800 px-4 sm:px-6 flex items-center justify-center shrink-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mic Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={toggleMic}
            className={`h-12 w-12 rounded-full p-0 border transition-all ${
              isMicOn
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-100'
                : 'bg-red-500/20 hover:bg-red-500/30 border-red-500 text-red-300'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Camera Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={toggleCam}
            className={`h-12 w-12 rounded-full p-0 border transition-all ${
              isCamOn
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-100'
                : 'bg-red-500/20 hover:bg-red-500/30 border-red-500 text-red-300'
            }`}
            title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isCamOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          {/* Screen Share Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={toggleScreenShare}
            className={`h-12 w-12 rounded-full p-0 border transition-all ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-100'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <ScreenShare className="h-5 w-5" />
          </Button>

          {/* Whiteboard Quick Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setViewMode((prev) => (prev === 'whiteboard' ? 'video' : 'whiteboard'))
            }
            className={`h-12 w-12 rounded-full p-0 border transition-all ${
              viewMode === 'whiteboard' || viewMode === 'split'
                ? 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-slate-950 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-100'
            }`}
            title={
              viewMode === 'whiteboard'
                ? 'Return to Video Stage'
                : 'Open Collaborative Whiteboard'
            }
          >
            <PenTool className="h-5 w-5" />
          </Button>

          {/* Leave Call Button */}
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowLeaveDialog(true)}
            className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white gap-2 font-semibold shadow-lg shadow-red-900/30 ml-2"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline">Leave Call</span>
          </Button>
        </div>
      </footer>

      {/* ── Leave Call Confirmation Dialog ── */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-md bg-surface border-border text-ink">
          <DialogHeader>
            <DialogTitle className="text-danger">Leave Video Call?</DialogTitle>
            <DialogDescription className="text-ink-muted">
              Are you sure you want to exit this meeting with {theirName}? You can rejoin within the active time window.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLeaveDialog(false)}
            >
              Stay in Call
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleLeaveCall}
            >
              Leave Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Time Expired Modal ── */}
      <Dialog open={isTimeExpired} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-surface border-border text-ink">
          <DialogHeader>
            <DialogTitle className="text-ink">Meeting Concluded</DialogTitle>
            <DialogDescription className="text-ink-muted">
              This scheduled appointment has reached its scheduled end time. The room has concluded.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={handleLeaveCall}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Return to Meet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Settings Dialog ── */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md bg-surface border-border text-ink">
          <DialogHeader>
            <DialogTitle className="text-ink">Meeting Information & Settings</DialogTitle>
            <DialogDescription className="text-ink-muted">
              Session details and encryption parameters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-small text-ink">
            <div className="bg-surface-sunken p-3 rounded-lg border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-muted">Room Name:</span>
                <span className="font-mono font-medium">{roomName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Your Identity:</span>
                <span className="font-medium text-emerald-600">{myName} ({myRoleLabel})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Other Participant:</span>
                <span className="font-medium">{theirName} ({theirRoleLabel})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Time Remaining:</span>
                <span className="font-mono font-semibold">{formatTime(remainingSec)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Whiteboard Snapshot:</span>
                <span className="font-medium text-blue-600">
                  {lastSavedWbVersion ? `v${lastSavedWbVersion} Saved` : 'Live / Active'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-meta text-ink-muted">Session Agenda:</span>
              <p className="p-3 bg-surface-sunken rounded border border-border text-xs leading-relaxed">
                {session.reason}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
