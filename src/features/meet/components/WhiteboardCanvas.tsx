'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveWhiteboardSnapshot } from '../actions'
import type {
  WhiteboardStroke,
  WhiteboardTool,
  WhiteboardSnapshotData,
  WhiteboardPoint,
} from '../schema'
import { Button } from '@/shared/ui/button'
import { Chip } from '@/shared/ui/chip'
import {
  Pen,
  Paintbrush,
  Square,
  Circle,
  Minus,
  MoveRight,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Download,
  CheckCircle,
  Eye,
} from 'lucide-react'

interface WhiteboardCanvasProps {
  sessionId: string
  currentUserId?: string
  currentUserName?: string
  initialData?: WhiteboardSnapshotData
  readOnly?: boolean
  onSnapshotSaved?: (version: number) => void
}

const COLOR_PALETTE = [
  { name: 'Navy Ink', hex: '#16213E' },
  { name: 'Pencil Yellow', hex: '#F5B700' },
  { name: 'Meet Blue', hex: '#3B82F6' },
  { name: 'Emerald Green', hex: '#1F9D6B' },
  { name: 'Coral Red', hex: '#D64545' },
  { name: 'Slate Grey', hex: '#5B667D' },
]

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

export function WhiteboardCanvas({
  sessionId,
  currentUserId,
  currentUserName,
  initialData,
  readOnly = false,
  onSnapshotSaved,
}: WhiteboardCanvasProps) {
  // Canvas & Stroke states
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(initialData?.strokes ?? [])
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([])
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen')
  const [activeColor, setActiveColor] = useState<string>('#16213E')
  const [strokeWidth, setStrokeWidth] = useState<number>(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<WhiteboardStroke | null>(null)

  // Status & peer states
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [remoteCursor, setRemoteCursor] = useState<{
    x: number
    y: number
    userName: string
  } | null>(null)

  const canvasRef = useRef<SVGSVGElement | null>(null)
  const supabase = createClient()

  // ── 1. Realtime Broadcast Synchronization (Supabase + Local BroadcastChannel fallback) ──
  useEffect(() => {
    if (readOnly || !sessionId) return

    const bc = new BroadcastChannel(`meet-wb-local-${sessionId}`)
    bc.onmessage = (e) => {
      const { event, payload } = e.data || {}
      if (event === 'new-stroke' && payload?.stroke) {
        setStrokes((prev) => [...prev, payload.stroke])
      } else if (event === 'clear') {
        setStrokes([])
        setRedoStack([])
      } else if (event === 'cursor' && payload?.x !== undefined) {
        setRemoteCursor({
          x: payload.x,
          y: payload.y,
          userName: payload.userName || 'Peer',
        })
      }
    }

    const channel = supabase.channel(`meet-wb-${sessionId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'new-stroke' }, ({ payload }) => {
        if (payload?.stroke) {
          setStrokes((prev) => [...prev, payload.stroke])
        }
      })
      .on('broadcast', { event: 'clear' }, () => {
        setStrokes([])
        setRedoStack([])
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload?.x !== undefined && payload?.y !== undefined) {
          setRemoteCursor({
            x: payload.x,
            y: payload.y,
            userName: payload.userName || 'Peer',
          })
        }
      })
      .subscribe()

    return () => {
      bc.close()
      supabase.removeChannel(channel)
    }
  }, [sessionId, readOnly, supabase])

  // Broadcast helper
  const broadcastEvent = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (readOnly) return
      try {
        const bc = new BroadcastChannel(`meet-wb-local-${sessionId}`)
        bc.postMessage({ event, payload })
        bc.close()
      } catch {
        // ignore
      }
      const channel = supabase.channel(`meet-wb-${sessionId}`)
      channel.send({
        type: 'broadcast',
        event,
        payload,
      })
    },
    [sessionId, readOnly, supabase]
  )

  // ── 2. Drawing Coordinates Helper ──
  const getCoordinates = (e: React.MouseEvent<SVGSVGElement>): WhiteboardPoint | null => {
    if (!canvasRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    }
  }

  // ── 3. Mouse Interaction Handlers ──
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return
    const point = getCoordinates(e)
    if (!point) return

    setIsDrawing(true)

    if (activeTool === 'text') {
      const text = window.prompt('Enter note text:')
      if (!text || !text.trim()) {
        setIsDrawing(false)
        return
      }

      const textStroke: WhiteboardStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool: 'text',
        color: activeColor,
        strokeWidth: 16, // text size
        points: [point],
        text: text.trim(),
        userId: currentUserId,
        userName: currentUserName,
        timestamp: Date.now(),
      }

      setStrokes((prev) => [...prev, textStroke])
      setRedoStack([])
      broadcastEvent('new-stroke', { stroke: textStroke })
      setIsDrawing(false)
      return
    }

    const newStroke: WhiteboardStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
      strokeWidth: activeTool === 'eraser' ? strokeWidth * 4 : strokeWidth,
      points: [point],
      userId: currentUserId,
      userName: currentUserName,
      timestamp: Date.now(),
    }

    setCurrentStroke(newStroke)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getCoordinates(e)
    if (!point) return

    // Broadcast cursor position (throttled)
    if (!readOnly && Math.random() < 0.3) {
      broadcastEvent('cursor', {
        x: point.x,
        y: point.y,
        userName: currentUserName || 'Participant',
      })
    }

    if (!isDrawing || !currentStroke) return

    if (activeTool === 'pen' || activeTool === 'brush' || activeTool === 'eraser') {
      setCurrentStroke((prev) =>
        prev
          ? {
              ...prev,
              points: [...prev.points, point],
            }
          : null
      )
    } else {
      // Shapes (line, rect, circle, arrow) only track start point and current point
      setCurrentStroke((prev) =>
        prev
          ? {
              ...prev,
              points: [prev.points[0], point],
            }
          : null
      )
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentStroke) return

    setIsDrawing(false)
    if (currentStroke.points.length > 0) {
      setStrokes((prev) => [...prev, currentStroke])
      setRedoStack([])
      broadcastEvent('new-stroke', { stroke: currentStroke })
    }
    setCurrentStroke(null)
  }

  // ── 4. Undo / Redo & Clear ──
  const handleUndo = () => {
    if (strokes.length === 0 || readOnly) return
    const last = strokes[strokes.length - 1]
    setRedoStack((prev) => [...prev, last])
    setStrokes((prev) => prev.slice(0, -1))
  }

  const handleRedo = () => {
    if (redoStack.length === 0 || readOnly) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setStrokes((prev) => [...prev, next])
  }

  const handleClear = () => {
    if (readOnly) return
    if (window.confirm('Are you sure you want to clear the entire whiteboard canvas?')) {
      setStrokes([])
      setRedoStack([])
      broadcastEvent('clear', {})
    }
  }

  // ── 5. Save Snapshot to Database ──
  const handleSaveSnapshot = useCallback(async () => {
    if (isSaving || readOnly) return
    setIsSaving(true)
    setSaveStatus(null)

    try {
      const snapshot_data: WhiteboardSnapshotData = {
        strokes,
        backgroundColor: '#FFFFFF',
        lastModified: Date.now(),
        clientVersion: 1,
      }

      const res = await saveWhiteboardSnapshot({
        session_id: sessionId,
        snapshot_data,
      })

      if (res.ok) {
        setSaveStatus(`Saved v${res.data.version}`)
        onSnapshotSaved?.(res.data.version)
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus('Save failed')
      }
    } catch {
      setSaveStatus('Error saving')
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, readOnly, strokes, sessionId, onSnapshotSaved])

  // ── 6. Download Canvas as PNG Image ──
  const handleDownloadImage = () => {
    if (!canvasRef.current) return
    const svgData = new XMLSerializer().serializeToString(canvasRef.current)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvasRef.current?.clientWidth || 800
      canvas.height = canvasRef.current?.clientHeight || 600
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        const pngUrl = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `meeting-whiteboard-${sessionId.slice(0, 8)}.png`
        downloadLink.href = pngUrl
        downloadLink.click()
      }
    }
    img.src = blobURL
  }

  // Helper to render stroke SVG elements
  const renderStroke = (stroke: WhiteboardStroke) => {
    const { id, tool, color, strokeWidth: width, points, text } = stroke
    if (!points || points.length === 0) return null

    if (tool === 'pen' || tool === 'brush' || tool === 'eraser') {
      const d = points.reduce(
        (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
        ''
      )
      return (
        <path
          key={id}
          d={d}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={tool === 'brush' ? 0.6 : 1}
        />
      )
    }

    if (tool === 'line') {
      const p1 = points[0]
      const p2 = points[1] || p1
      return (
        <line
          key={id}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
        />
      )
    }

    if (tool === 'rectangle') {
      const p1 = points[0]
      const p2 = points[1] || p1
      const x = Math.min(p1.x, p2.x)
      const y = Math.min(p1.y, p2.y)
      const w = Math.abs(p2.x - p1.x)
      const h = Math.abs(p2.y - p1.y)
      return (
        <rect
          key={id}
          x={x}
          y={y}
          width={w}
          height={h}
          stroke={color}
          strokeWidth={width}
          fill="none"
          rx="4"
        />
      )
    }

    if (tool === 'circle') {
      const p1 = points[0]
      const p2 = points[1] || p1
      const cx = (p1.x + p2.x) / 2
      const cy = (p1.y + p2.y) / 2
      const rx = Math.abs(p2.x - p1.x) / 2
      const ry = Math.abs(p2.y - p1.y) / 2
      return (
        <ellipse
          key={id}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={color}
          strokeWidth={width}
          fill="none"
        />
      )
    }

    if (tool === 'arrow') {
      const p1 = points[0]
      const p2 = points[1] || p1
      const headlen = 12
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
      const xHead1 = p2.x - headlen * Math.cos(angle - Math.PI / 6)
      const yHead1 = p2.y - headlen * Math.sin(angle - Math.PI / 6)
      const xHead2 = p2.x - headlen * Math.cos(angle + Math.PI / 6)
      const yHead2 = p2.y - headlen * Math.sin(angle + Math.PI / 6)

      return (
        <g key={id}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
          />
          <polygon
            points={`${p2.x},${p2.y} ${xHead1},${yHead1} ${xHead2},${yHead2}`}
            fill={color}
          />
        </g>
      )
    }

    if (tool === 'text') {
      const pt = points[0]
      return (
        <text
          key={id}
          x={pt.x}
          y={pt.y}
          fill={color}
          fontSize="15"
          fontWeight="500"
          fontFamily="system-ui, sans-serif"
        >
          {text}
        </text>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface rounded-xl border border-border overflow-hidden select-none shadow-sm">
      {/* ── Whiteboard Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-surface-sunken border-b border-border text-ink">
        {readOnly ? (
          <div className="flex items-center gap-2">
            <Chip variant="default" size="sm" className="bg-slate-200 text-ink">
              <Eye className="h-3.5 w-3.5" />
              <span>Read-Only Archive</span>
            </Chip>
            <span className="text-meta text-ink-muted">Past Whiteboard Snapshot</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {/* Tool Selection */}
            <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border">
              <Button
                size="sm"
                variant={activeTool === 'pen' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('pen')}
                className="h-8 w-8 p-0"
                title="Pen"
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'brush' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('brush')}
                className="h-8 w-8 p-0"
                title="Brush Marker"
              >
                <Paintbrush className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'line' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('line')}
                className="h-8 w-8 p-0"
                title="Line"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'arrow' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('arrow')}
                className="h-8 w-8 p-0"
                title="Arrow"
              >
                <MoveRight className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'rectangle' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('rectangle')}
                className="h-8 w-8 p-0"
                title="Rectangle"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'circle' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('circle')}
                className="h-8 w-8 p-0"
                title="Circle"
              >
                <Circle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'text' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('text')}
                className="h-8 w-8 p-0"
                title="Add Text"
              >
                <Type className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={activeTool === 'eraser' ? 'primary' : 'ghost'}
                onClick={() => setActiveTool('eraser')}
                className="h-8 w-8 p-0"
                title="Eraser"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border ml-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setActiveColor(c.hex)}
                  className={`h-5 w-5 rounded-full border transition-transform ${
                    activeColor === c.hex ? 'scale-110 ring-2 ring-ink ring-offset-1' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>

            {/* Stroke Width Selector */}
            <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border ml-1">
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw.value}
                  type="button"
                  onClick={() => setStrokeWidth(sw.value)}
                  className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${
                    strokeWidth === sw.value ? 'bg-ink text-on-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {sw.label}
                </button>
              ))}
            </div>

            {/* History Controls */}
            <div className="flex items-center gap-0.5 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="h-8 w-8 p-0"
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="h-8 w-8 p-0"
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                disabled={strokes.length === 0}
                className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                title="Clear Board"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons: Save & Download */}
        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-meta font-medium text-success flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{saveStatus}</span>
            </span>
          )}

          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveSnapshot}
              disabled={isSaving}
              className="gap-1.5 h-8 text-small font-medium"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Snapshot'}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownloadImage}
            className="gap-1 h-8 text-small font-medium"
            title="Download as PNG"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export PNG</span>
          </Button>
        </div>
      </div>

      {/* ── Main Canvas Area ── */}
      <div className="relative flex-1 bg-white cursor-crosshair overflow-hidden">
        <svg
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Subtle grid pattern background */}
          <defs>
            <pattern
              id={`grid-${sessionId}`}
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#E2E8F0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${sessionId})`} />

          {/* Render Committed Strokes */}
          {strokes.map(renderStroke)}

          {/* Render Active Stroke in Progress */}
          {currentStroke && renderStroke(currentStroke)}

          {/* Render Remote Participant Cursor */}
          {remoteCursor && (
            <g transform={`translate(${remoteCursor.x}, ${remoteCursor.y})`} className="pointer-events-none">
              <polygon points="0,0 0,16 5,12 12,12" fill="#3B82F6" />
              <rect x="14" y="2" width="60" height="18" rx="4" fill="#1E293B" />
              <text x="18" y="15" fill="#FFFFFF" fontSize="10" fontWeight="600">
                {remoteCursor.userName}
              </text>
            </g>
          )}
        </svg>

        {strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <p className="text-small text-slate-400 font-medium">
              {readOnly ? 'No whiteboard activity recorded for this session.' : 'Collaborative Whiteboard Canvas — Draw, write formulas, or sketch diagrams together in real time.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
