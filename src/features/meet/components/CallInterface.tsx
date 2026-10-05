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
  Maximize2,
  Minimize2,
  AlertTriangle,
  PenTool,
} from 'lucide-react'
import { WhiteboardCanvas } from './WhiteboardCanvas'

interface CallInterfaceProps {
  access: Extract<CallAccessResult, { ok: true }>
}

export function CallInterface({ access }: CallInterfaceProps) {
  const router = useRouter()
  const { session, userRole, otherParticipantName, otherParticipantRole, roomName, currentUserId } = access

  // View state: video, whiteboard, or split
  const [viewMode, setViewMode] = useState<'video' | 'whiteboard' | 'split'>('video')
  const [lastSavedWbVersion, setLastSavedWbVersion] = useState<number | null>(null)

  // Media state
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isPipExpanded, setIsPipExpanded] = useState(true)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected'>('connecting')

  // References for video elements and streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

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

  // Media initialization
  useEffect(() => {
    let isMounted = true

    async function initMedia() {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setMediaError('Media devices API is not supported in this browser.')
          setConnectionStatus('connected')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        setConnectionStatus('connected')
      } catch (err) {
        console.warn('[CallInterface] Camera/Mic access denied or unavailable:', err)
        // Fallback: try audio-only if camera is not available
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true })
          if (!isMounted) {
            audioOnly.getTracks().forEach((track) => track.stop())
            return
          }
          localStreamRef.current = audioOnly
          setIsCamOn(false)
          setConnectionStatus('connected')
        } catch {
          setMediaError('Camera and microphone access could not be acquired. You can still participate in the call.')
          setIsCamOn(false)
          setIsMicOn(false)
          setConnectionStatus('connected')
        }
      }
    }

    initMedia()

    return () => {
      isMounted = false
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      const nextState = !isMicOn
      audioTracks.forEach((track) => {
        track.enabled = nextState
      })
      setIsMicOn(nextState)
    } else {
      setIsMicOn((prev) => !prev)
    }
  }, [isMicOn])

  // Toggle Camera
  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      const nextState = !isCamOn
      videoTracks.forEach((track) => {
        track.enabled = nextState
      })
      setIsCamOn(nextState)
    } else {
      setIsCamOn((prev) => !prev)
    }
  }, [isCamOn])

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
      <header className="h-16 px-4 sm:px-6 bg-[#16213E]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 text-sm sm:text-base">
              {otherParticipantName}
            </span>
            <Chip variant="default" size="sm" className="bg-slate-800/80 border-slate-700 text-slate-300">
              {otherParticipantRole}
            </Chip>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs border-l border-slate-700/60 pl-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Encrypted 1-on-1 Call</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-slate-400">{roomName}</span>
          </div>
        </div>

        {/* Center View Mode Switcher */}
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

        {/* Right Status & Timer */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 capitalize">{connectionStatus}</span>
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

      {/* ── Main Canvas / Video Area ── */}
      <main className="relative flex-1 bg-[#0F1420] p-3 sm:p-4 flex items-center justify-center overflow-hidden">
        {mediaError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-950/80 border border-amber-700/60 text-amber-200 px-4 py-2 rounded-lg text-xs flex items-center gap-2 max-w-md shadow-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{mediaError}</span>
          </div>
        )}

        {/* MODE 1: Full Video Mode */}
        {viewMode === 'video' && (
          <div className="relative w-full h-full max-w-5xl rounded-2xl bg-[#171D2B] border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-2xl">
            {isScreenSharing ? (
              <div className="relative w-full h-full bg-black flex items-center justify-center">
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
            ) : (
              /* Remote Participant View */
              <div className="flex flex-col items-center justify-center space-y-4 text-center p-6">
                <div className="relative">
                  <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-100 text-3xl font-bold shadow-inner">
                    {otherParticipantName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-2 border-[#171D2B] text-slate-950">
                    <Volume2 className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-100">{otherParticipantName}</h2>
                  <p className="text-slate-400 text-sm mt-0.5">{otherParticipantRole}</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected & Ready</span>
                </div>
              </div>
            )}

            {/* Self View Floating PiP (Bottom-right) */}
            <div
              className={`absolute bottom-4 right-4 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300 z-10 ${
                isPipExpanded ? 'w-44 sm:w-56 h-32 sm:h-40' : 'w-24 h-16'
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
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
                      {userRole === 'teacher' ? 'FAC' : 'STU'}
                    </div>
                    {isPipExpanded && (
                      <span className="text-[11px] text-slate-400 mt-1">Camera Off</span>
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
                    {isPipExpanded ? (
                      <Minimize2 className="h-3 w-3" />
                    ) : (
                      <Maximize2 className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {/* Mic Status on PiP */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded text-[10px] text-slate-300">
                  {isMicOn ? (
                    <Mic className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <MicOff className="h-3 w-3 text-red-400" />
                  )}
                  <span>You</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: Whiteboard Focus Mode */}
        {viewMode === 'whiteboard' && (
          <div className="relative w-full h-full max-w-6xl flex flex-col shadow-2xl">
            <WhiteboardCanvas
              sessionId={session.id}
              currentUserId={currentUserId}
              currentUserName={userRole === 'teacher' ? (session.teacher?.full_name || 'Faculty') : (session.student?.full_name || 'Student')}
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
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs">
                      {userRole === 'teacher' ? 'FAC' : 'STU'}
                    </div>
                  </div>
                )}
                <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                  <button
                    type="button"
                    onClick={() => setIsPipExpanded(!isPipExpanded)}
                    className="p-1 rounded bg-black/60 text-slate-300 hover:text-white"
                  >
                    {isPipExpanded ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: Split View Mode */}
        {viewMode === 'split' && (
          <div className="w-full h-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-3 shadow-2xl">
            {/* Left: Compact Video Stage */}
            <div className="lg:col-span-4 h-full rounded-xl bg-[#171D2B] border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center p-4 relative">
              <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-100 text-2xl font-bold shadow-inner">
                {otherParticipantName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <h3 className="font-semibold text-slate-200 text-sm mt-3">{otherParticipantName}</h3>
              <p className="text-slate-400 text-xs">{otherParticipantRole}</p>

              {/* Compact Self-View at Bottom of Left Panel */}
              <div className="w-full h-32 mt-4 rounded-lg bg-black/50 border border-slate-700 overflow-hidden relative">
                {isCamOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    Camera Off
                  </div>
                )}
                <div className="absolute bottom-1 left-1 bg-black/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">
                  You
                </div>
              </div>
            </div>

            {/* Right: Collaborative Whiteboard */}
            <div className="lg:col-span-8 h-full flex flex-col">
              <WhiteboardCanvas
                sessionId={session.id}
                currentUserId={currentUserId}
                currentUserName={userRole === 'teacher' ? (session.teacher?.full_name || 'Faculty') : (session.student?.full_name || 'Student')}
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
              Are you sure you want to exit this meeting with {otherParticipantName}? You can rejoin within the active time window.
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
              className="bg-red-600 hover:bg-red-700 text-white"
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
                <span className="text-ink-muted">Your Role:</span>
                <span className="font-medium capitalize">{userRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Other Participant:</span>
                <span className="font-medium">{otherParticipantName}</span>
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
