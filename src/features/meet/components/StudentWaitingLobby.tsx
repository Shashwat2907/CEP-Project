'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SessionRequest } from '../schema'
import { checkSessionAdmission } from '../actions'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import {
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  Clock,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react'

interface StudentWaitingLobbyProps {
  session: SessionRequest
  teacherName: string
  startsAt?: string
  endsAt?: string
}

export function StudentWaitingLobby({
  session,
  teacherName,
  startsAt,
  endsAt,
}: StudentWaitingLobbyProps) {
  const router = useRouter()
  const [isAdmitted, setIsAdmitted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 1. Initialise Self Preview Camera
  useEffect(() => {
    let mounted = true

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsCameraActive(true)
      } catch (err) {
        console.warn('Camera preview not available in lobby:', err)
        if (mounted) {
          setMediaError('Camera preview in use by another tab or not allowed. Your mic & video will activate upon joining.')
          setIsCameraActive(false)
        }
      }
    }

    setupCamera()

    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Toggle Video
  const toggleVideo = () => {
    if (streamRef.current) {
      const vTrack = streamRef.current.getVideoTracks()[0]
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled
        setIsVideoEnabled(vTrack.enabled)
      }
    } else {
      setIsVideoEnabled((prev) => !prev)
    }
  }

  // Toggle Audio
  const toggleAudio = () => {
    if (streamRef.current) {
      const aTrack = streamRef.current.getAudioTracks()[0]
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled
        setIsAudioEnabled(aTrack.enabled)
      }
    } else {
      setIsAudioEnabled((prev) => !prev)
    }
  }

  // 2. BroadcastChannel & Polling for Admission Approval
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    const channelName = `meet-admission-${session.id}`

    try {
      channel = new BroadcastChannel(channelName)
      // Knock immediately to notify any active teacher tab
      channel.postMessage({
        type: 'KNOCK',
        sessionId: session.id,
        studentName: session.student?.full_name || 'Student',
      })

      channel.onmessage = (event) => {
        if (event.data?.type === 'ADMITTED' || event.data?.type === 'APPROVED') {
          setIsAdmitted(true)
          setTimeout(() => {
            router.refresh()
          }, 600)
        }
      }
    } catch {
      // BroadcastChannel fallback
    }

    // Interval to repeat knock every 3s and poll admission check
    const knockInterval = setInterval(() => {
      try {
        channel?.postMessage({
          type: 'KNOCK',
          sessionId: session.id,
          studentName: session.student?.full_name || 'Student',
        })
      } catch {}

      // Server check fallback
      checkSessionAdmission(session.id)
        .then((res) => {
          if (res.admitted) {
            setIsAdmitted(true)
            setTimeout(() => {
              router.refresh()
            }, 600)
          }
        })
        .catch(() => {})
    }, 2500)

    return () => {
      clearInterval(knockInterval)
      if (channel) {
        channel.close()
      }
    }
  }, [session.id, session.student?.full_name, router])

  return (
    <div className="min-h-screen bg-[#0B101A] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-blue-600">
      {/* Top Brand Nav */}
      <header className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between border-b border-slate-800/80 bg-[#16213E]/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            M
          </div>
          <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white">
            Campus Meet
          </span>
          <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Waiting Room
          </span>
        </div>

        <Link href="/meet">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800/60 gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" />
            <span>Leave Lobby</span>
          </Button>
        </Link>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl w-full grid md:grid-cols-12 gap-8 items-center pt-20 pb-8">
        {/* Left Column: Self Video Preview (6 cols) */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Live Camera Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                isCameraActive && isVideoEnabled ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Fallback Avatar when camera is off or blocked */}
            {(!isCameraActive || !isVideoEnabled) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-900 to-[#0F1420]">
                <div className="h-20 w-20 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
                  {(session.student?.full_name || 'Student')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-200 text-sm">
                    {session.student?.full_name || 'You'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {!isVideoEnabled ? 'Camera is muted' : 'Camera preview ready'}
                  </p>
                </div>
              </div>
            )}

            {/* Video preview controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 shadow-lg">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-2.5 rounded-full transition-colors ${
                  isAudioEnabled
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`p-2.5 rounded-full transition-colors ${
                  isVideoEnabled
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoEnabled ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mediaError && (
            <div className="mt-3 w-full p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{mediaError}</span>
            </div>
          )}
        </div>

        {/* Right Column: Waiting Info & Status (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {isAdmitted ? (
            <Card className="bg-emerald-950/40 border-emerald-500/60 shadow-xl animate-fade-in text-center p-6">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-emerald-300">You&apos;re Admitted!</h2>
              <p className="text-xs text-emerald-200/80 mt-1">
                Faculty has approved your request to join. Entering the meeting room now...
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Waiting for Host</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                  Waiting to be admitted...
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The faculty member has been notified that you are waiting. You will join automatically as soon as they admit you.
                </p>
              </div>

              {/* Host & Meeting details card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-semibold text-sm">
                    {teacherName
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Host Faculty Member</p>
                    <p className="text-sm font-semibold text-slate-100">{teacherName}</p>
                    {session.teacher?.department && (
                      <p className="text-xs text-slate-400">{session.teacher.department}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    <span>
                      {startsAt
                        ? new Date(startsAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Today'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>
                      {startsAt ? new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      {endsAt ? ` – ${new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security & Instruction note */}
              <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  To maintain classroom privacy and ensure both parties are present, meetings require faculty approval before entry. Keep this tab open.
                </p>
              </div>

              {/* Manual refresh / test check button */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.refresh()}
                  className="w-full text-xs text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  Check Admission Status Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
