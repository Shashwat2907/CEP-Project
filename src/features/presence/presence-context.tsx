'use client'

import * as React from 'react'
import {
  PresenceState,
  PresenceConfidence,
  PresenceConsentRecord,
  CampusZone,
  DEFAULT_CAMPUS_ZONE,
} from './schema'
import { verifyPresence, updatePresenceConsent, togglePresencePause } from './actions'
import { isPointInPolygon, calculateConfidence } from './polygon'

export interface PresenceContextValue {
  presenceState: PresenceState
  zoneName: string
  confidence: PresenceConfidence
  accuracyMeters: number
  verifiedAt: string | null
  consent: PresenceConsentRecord | null
  isChecking: boolean
  isAutoMonitoring: boolean
  isSimulated: boolean
  activeZone: CampusZone
  errorMessage: string | null
  setActiveZone: (zone: CampusZone) => void
  setPresenceState: (state: PresenceState) => void
  verifyCoordinates: (coords: { latitude: number; longitude: number; accuracy?: number }) => Promise<PresenceState>
  checkCurrentLocation: () => Promise<PresenceState>
  simulateLocation: (coords: { latitude: number; longitude: number; label?: string }) => Promise<PresenceState>
  resetToLiveGps: () => Promise<PresenceState>
  togglePause: (isPaused: boolean) => Promise<void>
  saveConsent: (input: {
    consentGiven: boolean
    isPaused?: boolean
    visibility?: 'nobody' | 'friends' | 'everyone'
  }) => Promise<void>
  setAutoMonitoring: (enabled: boolean) => void
}

const PresenceContext = React.createContext<PresenceContextValue | undefined>(undefined)

export function PresenceProvider({
  children,
  initialState = 'in',
  initialConsent,
}: {
  children: React.ReactNode
  initialState?: PresenceState
  initialConsent?: PresenceConsentRecord | null
}) {
  const [presenceState, setPresenceState] = React.useState<PresenceState>(initialState)
  const [activeZone, setActiveZone] = React.useState<CampusZone>(DEFAULT_CAMPUS_ZONE)
  const [zoneName, setZoneName] = React.useState('Main Campus')
  const [confidence, setConfidence] = React.useState<PresenceConfidence>('high')
  const [accuracyMeters, setAccuracyMeters] = React.useState(15)
  const [verifiedAt, setVerifiedAt] = React.useState<string | null>(new Date().toISOString())
  const [isChecking, setIsChecking] = React.useState(false)
  const [isAutoMonitoring, setIsAutoMonitoring] = React.useState(true)
  const [isSimulated, setIsSimulated] = React.useState(false)
  const [lastCoords, setLastCoords] = React.useState<{ latitude: number; longitude: number } | null>({
    latitude: 12.9735,
    longitude: 79.162,
  })
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [consent, setConsent] = React.useState<PresenceConsentRecord | null>(
    initialConsent ?? {
      userId: 'default-user',
      consentGiven: true,
      isPaused: false,
      visibility: 'nobody',
      consentedAt: new Date().toISOString(),
    }
  )

  /**
   * Evaluates coordinates against active campus boundary polygon and updates the live toggle state.
   */
  const verifyCoordinates = React.useCallback(
    async (coords: { latitude: number; longitude: number; accuracy?: number }): Promise<PresenceState> => {
      setIsChecking(true)
      setErrorMessage(null)

      try {
        const accuracy = coords.accuracy ?? 12
        const conf = calculateConfidence(accuracy)
        const inside = isPointInPolygon(
          { lat: coords.latitude, lng: coords.longitude },
          activeZone.polygon
        )

        const nextState: PresenceState = inside ? 'in' : 'out'
        const nextZone = inside ? activeZone.name : 'Off Campus'
        const now = new Date().toISOString()

        setLastCoords({ latitude: coords.latitude, longitude: coords.longitude })

        // Call server action for audit and outbox event logging
        try {
          await verifyPresence({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy,
          })
        } catch {
          // In unit / offline fallback, local evaluation succeeds
        }

        // Live update the toggle and popover state
        setPresenceState(nextState)
        setZoneName(nextZone)
        setConfidence(conf)
        setAccuracyMeters(accuracy)
        setVerifiedAt(now)

        return nextState
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Location verification failed'
        setErrorMessage(msg)
        return presenceState
      } finally {
        setIsChecking(false)
      }
    },
    [activeZone, presenceState]
  )

  /**
   * Queries real browser GPS and verifies if device is inside campus.
   */
  const checkCurrentLocation = React.useCallback(async (): Promise<PresenceState> => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setErrorMessage('Geolocation is not supported by your browser')
      return presenceState
    }

    setIsChecking(true)
    setErrorMessage(null)

    return new Promise<PresenceState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const state = await verifyCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
          resolve(state)
        },
        (error) => {
          setIsChecking(false)
          let msg = 'Unable to retrieve location'
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location access denied in browser settings'
            setPresenceState('denied')
            resolve('denied')
          } else {
            setErrorMessage(msg)
            resolve(presenceState)
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    })
  }, [presenceState, verifyCoordinates])

  /**
   * Simulates moving to any coordinates (inside or outside campus)
   * and immediately flips the top bar toggle.
   */
  const simulateLocation = React.useCallback(
    async (coords: { latitude: number; longitude: number; label?: string }): Promise<PresenceState> => {
      setIsSimulated(true)
      return verifyCoordinates({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: 10,
      })
    },
    [verifyCoordinates]
  )

  /**
   * Switches from simulation back to live browser GPS.
   */
  const resetToLiveGps = React.useCallback(async (): Promise<PresenceState> => {
    setIsSimulated(false)
    return checkCurrentLocation()
  }, [checkCurrentLocation])

  /**
   * Continuous location watcher (Heartbeat per PLAN.MD §5.1)
   * Listens to real-time position changes if not in simulated mode.
   */
  React.useEffect(() => {
    if (!isAutoMonitoring || isSimulated || typeof window === 'undefined' || !('geolocation' in navigator)) {
      return
    }

    // Only watch if consent is given and not paused
    if (!consent?.consentGiven || consent?.isPaused) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        verifyCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      () => {
        // Fallback gracefully on background or weak GPS
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isAutoMonitoring, isSimulated, consent, verifyCoordinates])

  /**
   * Periodic re-evaluation heartbeat: ensures presence toggle stays strictly in sync
   * with boundary polygon if zone coordinates change.
   */
  React.useEffect(() => {
    if (!isAutoMonitoring || !lastCoords) return

    const interval = setInterval(() => {
      const inside = isPointInPolygon(
        { lat: lastCoords.latitude, lng: lastCoords.longitude },
        activeZone.polygon
      )
      const expectedState: PresenceState = inside ? 'in' : 'out'
      if (expectedState !== presenceState) {
        setPresenceState(expectedState)
        setZoneName(inside ? activeZone.name : 'Off Campus')
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [isAutoMonitoring, lastCoords, activeZone, presenceState])

  const togglePause = React.useCallback(async (isPaused: boolean) => {
    try {
      await togglePresencePause(isPaused)
    } catch {
      // offline fallback
    }
    setConsent((prev) => (prev ? { ...prev, isPaused } : null))
    if (isPaused) {
      setPresenceState('offline')
    }
  }, [])

  const saveConsent = React.useCallback(
    async (input: {
      consentGiven: boolean
      isPaused?: boolean
      visibility?: 'nobody' | 'friends' | 'everyone'
    }) => {
      try {
        await updatePresenceConsent(input)
      } catch {
        // offline fallback
      }
      setConsent({
        userId: 'current-user',
        consentGiven: input.consentGiven,
        isPaused: input.isPaused ?? false,
        visibility: input.visibility ?? 'nobody',
        consentedAt: input.consentGiven ? new Date().toISOString() : null,
        revokedAt: !input.consentGiven ? new Date().toISOString() : null,
      })
      if (!input.consentGiven) {
        setPresenceState('offline')
      }
    },
    []
  )

  return (
    <PresenceContext.Provider
      value={{
        presenceState,
        zoneName,
        confidence,
        accuracyMeters,
        verifiedAt,
        consent,
        isChecking,
        isAutoMonitoring,
        isSimulated,
        activeZone,
        errorMessage,
        setActiveZone,
        setPresenceState,
        verifyCoordinates,
        checkCurrentLocation,
        simulateLocation,
        resetToLiveGps,
        togglePause,
        saveConsent,
        setAutoMonitoring: setIsAutoMonitoring,
      }}
    >
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  const context = React.useContext(PresenceContext)
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider')
  }
  return context
}

export function useOptionalPresence() {
  return React.useContext(PresenceContext)
}
