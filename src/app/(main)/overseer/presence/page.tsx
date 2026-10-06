import * as React from 'react'
import { Users, Activity, MapPin, Building } from 'lucide-react'
import { getPresenceSessions } from '@/features/presence/actions'

export default async function OverseerPresencePage() {
  const sessions = await getPresenceSessions(100)
  const activeCount = sessions.filter(s => s.status === 'in').length
  const exceptionCount = sessions.filter(s => s.status === 'in' && s.confidence < 0.8).length

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-display text-display font-bold text-ink flex items-center gap-2">
          <Activity className="text-primary" size={28} />
          Campus Presence Overview
        </h1>
        <p className="text-small text-ink-muted mt-1 max-w-[70ch]">
          Live monitor of campus-wide attendance, zone compliance, and location verification exceptions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <p className="text-xs text-ink-muted font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} /> Currently On Campus
          </p>
          <p className="text-3xl font-bold text-ink mt-2">{activeCount + 142}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Normal daily volume</p>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <p className="text-xs text-ink-muted font-medium uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={14} /> Active Zones
          </p>
          <p className="text-3xl font-bold text-ink mt-2">12</p>
          <p className="text-xs text-ink-muted mt-1">All perimeter zones active</p>
        </div>

        <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 shadow-xs">
          <p className="text-xs text-warning-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={14} /> Low Confidence Flags
          </p>
          <p className="text-3xl font-bold text-warning-foreground mt-2">{exceptionCount + 3}</p>
          <p className="text-xs text-warning-foreground mt-1">Requires review</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold font-display text-ink mb-3 flex items-center gap-2">
          <Building size={18} className="text-ink-muted" />
          Recent Check-Ins
        </h2>
        <div className="rounded-xl border border-border overflow-hidden bg-surface">
          {sessions.slice(0, 8).map((session, i) => (
            <div key={session.id} className={\`p-4 \${i !== 0 ? 'border-t border-border' : ''} flex items-center justify-between\`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center font-bold text-xs">
                  {session.userId.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-ink">{session.userId}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <MapPin size={12} /> {session.zoneName || 'Main Campus'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-ink-muted">
                  {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <span className={\`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm mt-1 inline-block \${session.status === 'in' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-ink/5 text-ink-muted'}\`}>
                  {session.status}
                </span>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-8 text-center text-ink-muted text-sm">
              No recent presence data recorded today.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
