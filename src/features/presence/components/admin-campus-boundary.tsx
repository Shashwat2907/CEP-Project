'use client'

import * as React from 'react'
import {
  MapPin,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Crosshair,
  Building2,
  Navigation,
  Radio,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { LatLng, CampusZone, DEFAULT_CAMPUS_ZONE } from '../schema'
import { isPointInPolygon } from '../polygon'
import { useOptionalPresence } from '../presence-context'
import { cn } from '@/lib/utils'

export interface AdminCampusBoundaryProps {
  initialZone?: CampusZone
  onSaveZone?: (zone: CampusZone) => Promise<void> | void
  className?: string
}

export function AdminCampusBoundary({
  initialZone = DEFAULT_CAMPUS_ZONE,
  onSaveZone,
  className,
}: AdminCampusBoundaryProps) {
  const presenceCtx = useOptionalPresence()
  const [zoneName, setZoneName] = React.useState(initialZone.name)
  const [vertices, setVertices] = React.useState<LatLng[]>(initialZone.polygon)
  const [newLat, setNewLat] = React.useState('')
  const [newLng, setNewLng] = React.useState('')
  const [testLat, setTestLat] = React.useState('12.9735')
  const [testLng, setTestLng] = React.useState('79.1620')
  const [testResult, setTestResult] = React.useState<{ inside: boolean; checked: boolean }>({
    inside: presenceCtx ? presenceCtx.presenceState === 'in' : true,
    checked: false,
  })
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  // Sync active zone to context on mount/change
  React.useEffect(() => {
    if (presenceCtx) {
      presenceCtx.setActiveZone({
        ...initialZone,
        name: zoneName,
        polygon: vertices,
      })
    }
  }, [vertices, zoneName]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddVertex = () => {
    const lat = parseFloat(newLat)
    const lng = parseFloat(newLng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setStatusMessage('Invalid latitude (-90 to 90) or longitude (-180 to 180)')
      return
    }
    const nextVertices = [...vertices, { lat, lng }]
    setVertices(nextVertices)
    setNewLat('')
    setNewLng('')
    setStatusMessage(null)
  }

  const handleRemoveVertex = (index: number) => {
    if (vertices.length <= 3) {
      setStatusMessage('A campus boundary polygon must contain at least 3 vertices')
      return
    }
    setVertices((prev) => prev.filter((_, i) => i !== index))
    setStatusMessage(null)
  }

  const handleTestPoint = async () => {
    const lat = parseFloat(testLat)
    const lng = parseFloat(testLng)
    if (isNaN(lat) || isNaN(lng)) return
    const inside = isPointInPolygon({ lat, lng }, vertices)
    setTestResult({ inside, checked: true })

    if (presenceCtx) {
      await presenceCtx.simulateLocation({ latitude: lat, longitude: lng })
      setStatusMessage(
        inside
          ? `Point (${lat}, ${lng}) is INSIDE campus. Top-bar toggle is now GREEN (IN).`
          : `Point (${lat}, ${lng}) is OUTSIDE campus. Top-bar toggle is now NEUTRAL (OUT).`
      )
    }
  }

  const handleSimulateInside = async () => {
    setTestLat('12.9735')
    setTestLng('79.1620')
    setTestResult({ inside: true, checked: true })
    if (presenceCtx) {
      await presenceCtx.simulateLocation({
        latitude: 12.9735,
        longitude: 79.162,
        label: 'Campus Center Quad',
      })
    }
    setStatusMessage('Simulated moving INSIDE campus (12.9735, 79.1620). Top-bar toggle is now GREEN (IN).')
  }

  const handleSimulateOutside = async () => {
    setTestLat('12.9900')
    setTestLng('79.2000')
    setTestResult({ inside: false, checked: true })
    if (presenceCtx) {
      await presenceCtx.simulateLocation({
        latitude: 12.99,
        longitude: 79.2,
        label: 'Off-Campus Tech Park',
      })
    }
    setStatusMessage('Simulated moving OUTSIDE campus (12.9900, 79.2000). Top-bar toggle is now NEUTRAL (OUT).')
  }

  const handleUseLiveGps = async () => {
    if (presenceCtx) {
      setStatusMessage('Switched to live continuous browser GPS watcher...')
      const nextState = await presenceCtx.resetToLiveGps()
      setStatusMessage(
        `Live GPS verified: ${nextState === 'in' ? 'Inside Campus (IN)' : nextState === 'out' ? 'Outside Campus (OUT)' : 'Permission Denied / Offline'}.`
      )
    }
  }

  const handleSave = async () => {
    if (vertices.length < 3) {
      setStatusMessage('At least 3 polygon vertices are required')
      return
    }
    setIsSaving(true)
    setStatusMessage(null)
    try {
      const updatedZone: CampusZone = {
        ...initialZone,
        name: zoneName,
        polygon: vertices,
      }
      presenceCtx?.setActiveZone(updatedZone)
      await onSaveZone?.(updatedZone)
      setStatusMessage('Campus boundary polygon successfully updated and active.')
    } catch {
      setStatusMessage('Failed to save campus boundary')
    } finally {
      setIsSaving(false)
    }
  }

  const currentPresence = presenceCtx?.presenceState ?? 'in'
  const isSimulated = presenceCtx?.isSimulated ?? false

  return (
    <div className={cn('bg-surface border border-border rounded-lg p-5 space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-sm bg-surface-sunken border border-border flex items-center justify-center text-ink">
            <Building2 size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-h3 font-semibold text-ink leading-tight">
              Campus Boundary Polygon
            </h3>
            <p className="text-meta text-ink-muted">
              Continuous geofence system: toggle automatically stays green while inside campus and flips to out when outside.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isSaving || vertices.length < 3}
          onClick={handleSave}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Save size={14} strokeWidth={2} />
          <span>{isSaving ? 'Saving...' : 'Save Boundary'}</span>
        </Button>
      </div>

      {/* Live System Synchronization Banner */}
      <div className="p-3.5 rounded-md bg-surface-sunken border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'w-3 h-3 rounded-full',
              currentPresence === 'in' ? 'bg-in-campus animate-pulse' : 'bg-out-campus'
            )}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-small font-bold text-ink">
                Live Top-Bar Toggle Status:
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-sm text-meta font-bold uppercase font-mono border',
                  currentPresence === 'in'
                    ? 'bg-in-campus text-white border-in-campus'
                    : 'bg-surface text-ink-muted border-border'
                )}
              >
                {currentPresence === 'in' ? '● IN (Campus Green)' : '○ OUT (Neutral Grey)'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-ink-muted block mt-0.5">
              Mode: {isSimulated ? 'Simulated Location Active' : 'Live Browser Geolocation Watcher Active'}
            </span>
          </div>
        </div>

        {/* Quick Simulation Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSimulateInside}
            className="flex items-center gap-1.5 text-in-campus hover:bg-in-campus/10"
            title="Simulate entering campus (sets toggle to GREEN)"
          >
            <MapPin size={14} strokeWidth={2} />
            <span>Simulate IN (Green)</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSimulateOutside}
            className="flex items-center gap-1.5 text-ink-muted hover:text-ink"
            title="Simulate leaving campus (sets toggle to OUT)"
          >
            <Navigation size={14} strokeWidth={2} />
            <span>Simulate OUT</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUseLiveGps}
            className="flex items-center gap-1.5 text-ink text-meta"
            title="Switch back to live browser GPS"
          >
            <Radio size={13} strokeWidth={2} />
            <span>Live GPS</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={cn(
            'p-3 rounded-md text-small flex items-center gap-2',
            statusMessage.includes('INSIDE') || statusMessage.includes('successfully') || statusMessage.includes('GREEN')
              ? 'bg-in-campus/10 text-in-campus border border-in-campus/30'
              : 'bg-surface-sunken text-ink border border-border'
          )}
        >
          {statusMessage.includes('INSIDE') || statusMessage.includes('successfully') || statusMessage.includes('GREEN') ? (
            <CheckCircle size={16} strokeWidth={2} className="shrink-0 text-in-campus" />
          ) : (
            <AlertCircle size={16} strokeWidth={2} className="shrink-0 text-ink-muted" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Zone Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-small font-medium text-ink mb-1.5">
            Zone / Campus Name
          </label>
          <input
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="w-full sm:max-w-md h-10 px-3 rounded-sm bg-surface-sunken border border-border text-ink text-small focus-visible:outline-2 focus-visible:outline-ink"
            placeholder="e.g. Main Campus"
          />
        </div>

        {/* Vertices List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-small font-medium text-ink">
              Polygon Vertices ({vertices.length})
            </span>
            <span className="text-meta font-mono text-ink-muted">
              Closed loop (min 3 coordinates)
            </span>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-surface divide-y divide-border">
            {vertices.map((vertex, index) => (
              <div
                key={index}
                className="px-3.5 py-2.5 flex items-center justify-between text-meta font-mono"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-surface-sunken border border-border flex items-center justify-center font-bold text-ink-muted text-[11px]">
                    {index + 1}
                  </span>
                  <span className="text-ink">
                    Lat: <strong className="font-mono">{vertex.lat.toFixed(6)}</strong>, Lng:{' '}
                    <strong className="font-mono">{vertex.lng.toFixed(6)}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveVertex(index)}
                  disabled={vertices.length <= 3}
                  className="text-ink-muted hover:text-danger disabled:opacity-40 p-1 rounded-sm transition-colors cursor-pointer"
                  title={
                    vertices.length <= 3
                      ? 'Minimum 3 vertices required'
                      : `Remove vertex ${index + 1}`
                  }
                  aria-label={`Remove vertex ${index + 1}`}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Vertex Input Row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude (e.g. 12.9720)"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                className="flex-1 h-9 px-3 rounded-sm bg-surface-sunken border border-border text-meta font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude (e.g. 79.1600)"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                className="flex-1 h-9 px-3 rounded-sm bg-surface-sunken border border-border text-meta font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddVertex}
              className="flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2} />
              Add Vertex
            </Button>
          </div>
        </div>

        {/* Boundary Point Verification Tester */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crosshair size={16} strokeWidth={2} className="text-ink" />
              <h4 className="font-display text-small font-semibold text-ink">
                Test Point & Update Toggle in Real Time
              </h4>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">
              Ray-casting point-in-polygon
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              step="0.0001"
              value={testLat}
              onChange={(e) => setTestLat(e.target.value)}
              placeholder="Test Latitude"
              className="w-36 h-9 px-3 rounded-sm bg-surface-sunken border border-border text-meta font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
            />
            <input
              type="number"
              step="0.0001"
              value={testLng}
              onChange={(e) => setTestLng(e.target.value)}
              placeholder="Test Longitude"
              className="w-36 h-9 px-3 rounded-sm bg-surface-sunken border border-border text-meta font-mono text-ink focus-visible:outline-2 focus-visible:outline-ink"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestPoint}
              className="flex items-center gap-1.5"
            >
              <Sparkles size={14} strokeWidth={2} />
              Run Polygon Check & Update Toggle
            </Button>

            {testResult.checked && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-sm text-meta font-mono font-bold flex items-center gap-1 border',
                  testResult.inside
                    ? 'bg-in-campus text-white border-in-campus'
                    : 'bg-surface-sunken text-ink border-border'
                )}
              >
                {testResult.inside ? (
                  <>
                    <CheckCircle size={13} strokeWidth={2} /> INSIDE CAMPUS (IN) — TOGGLE IS GREEN
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} strokeWidth={2} /> OUTSIDE CAMPUS (OUT) — TOGGLE IS OUT
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
