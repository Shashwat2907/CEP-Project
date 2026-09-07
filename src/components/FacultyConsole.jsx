import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Power, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Check, 
  ArrowRight, 
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { 
  fetchActiveAttendanceSession, 
  createAttendanceSession, 
  closeAttendanceSession, 
  fetchAttendanceRecords,
  fetchAttendancePresets 
} from '../services/api';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';
import { STAGES } from '../data/mockData';

export default function FacultyConsole({ onSelectIssue }) {
  const { user } = useAuth();
  const { issues, resolveIssue, escalateIssue } = useIssues();

  // Attendance State
  const [activeSession, setActiveSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Quick Controls
  const [selectedCourse, setSelectedCourse] = useState('CSE 302: Computer Networks');
  const [selectedRoom, setSelectedRoom] = useState('Academic Block A - Room 204');
  const [radiusMeters, setRadiusMeters] = useState(100);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const session = await fetchActiveAttendanceSession();
      setActiveSession(session);
      if (session) {
        const logs = await fetchAttendanceRecords(session.id);
        setRecords(logs);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.warn('Could not load session:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSession = async () => {
    if (activeSession) {
      if (window.confirm('Terminate active attendance session for this class?')) {
        try {
          await closeAttendanceSession(activeSession.id);
          loadData();
        } catch (err) {
          alert(err.message);
        }
      }
    } else {
      try {
        setBroadcastLoading(true);
        const created = await createAttendanceSession({
          course_name: selectedCourse,
          room: selectedRoom,
          latitude: 28.5450,
          longitude: 77.1926,
          radius_meters: radiusMeters,
          duration_minutes: 90
        });
        setActiveSession(created);
        loadData();
      } catch (err) {
        alert(`Failed to launch session: ${err.message}`);
      } finally {
        setBroadcastLoading(false);
      }
    }
  };

  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const outsideCount = records.filter(r => r.status === 'OUTSIDE_GEOFENCE').length;
  const estimatedCapacity = 45;
  const turnoutPercent = Math.min(Math.round((presentCount / estimatedCapacity) * 100), 100);

  // Triage groupings for faculty
  const criticalTickets = issues.filter(i => (i.priority === 'Critical' || i.priority === 'High') && i.status !== 'Resolved');
  const generalTickets = issues.filter(i => (i.priority === 'Medium' || i.priority === 'Low') && i.status !== 'Resolved');

  return (
    <div className="faculty-console">
      {/* 1. TOP LIVE CLASSROOM BROADCAST TERMINAL */}
      <div className="panel" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.6rem', borderLeft: '3px solid var(--text-main)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              <Radio size={13} color={activeSession ? 'var(--success-text)' : 'var(--text-dim)'} /> 
              Classroom Broadcast Terminal
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>
              {activeSession ? activeSession.course_name : 'No Ongoing Lecture Session'}
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '0.15rem' }}>
              {activeSession ? (
                <>Broadcasting at <strong>{activeSession.room}</strong> · Geofence: <strong>≤ {activeSession.radius_meters}m</strong></>
              ) : (
                'Select course and venue to start automated student presence check-in.'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              disabled={refreshing}
            >
              <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Syncing...' : 'Sync Telemetry'}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSession ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleToggleSession}
              disabled={broadcastLoading}
              id="facultyToggleBroadcastBtn"
            >
              <Power size={13} />
              {activeSession ? 'Terminate Broadcast' : 'Launch Geofence Broadcast'}
            </button>
          </div>
        </div>

        {/* Live Headcount Ticker & Progress Bar */}
        {activeSession ? (
          <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Live Class Presence Turnout
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                  <span className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {presentCount}
                  </span>
                  <span className="font-mono" style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>
                    / {estimatedCapacity} expected ({turnoutPercent}%)
                  </span>
                  {outsideCount > 0 && (
                    <span className="badge-pill" style={{ background: 'var(--error-bg)', color: 'var(--error-text)', marginLeft: '6px' }}>
                      {outsideCount} rejected outside fence
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Radius Selector */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '4px' }}>Perimeter:</span>
                {[50, 100, 200].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusMeters(r)}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontFamily: 'ui-monospace, monospace',
                      background: radiusMeters === r ? 'var(--surface-active)' : 'var(--bg-subtle)',
                      border: `1px solid ${radiusMeters === r ? 'var(--text-main)' : 'var(--border)'}`,
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>

            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${turnoutPercent}%` }}></div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              placeholder="Course name"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                minWidth: '240px'
              }}
            />
            <input
              type="text"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              placeholder="Room / Venue"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                minWidth: '180px'
              }}
            />
          </div>
        )}
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Left Column: Department Ticket Triage & Resolution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Urgent / Blocker Tickets */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="priority-dot Critical"></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  High-Priority Classroom Blockers & Safety Issues
                </h3>
              </div>
              <span className="count-chip font-mono">{criticalTickets.length} Action Items</span>
            </div>

            {criticalTickets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {criticalTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    className="pipeline-card"
                    style={{ background: 'var(--bg-subtle)', marginBottom: 0 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem' }}>
                          <span className={`priority-dot ${ticket.priority}`}></span>
                          <span className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>#{ticket.id}</span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>· {ticket.category}</span>
                        </div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {ticket.title}
                        </h4>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {ticket.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => resolveIssue(ticket.id)}
                          title="Mark Resolved"
                        >
                          <Check size={12} />
                          Mark Resolved
                        </button>
                        {ticket.stage < 2 && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => escalateIssue(ticket.id)}
                            title="Forward to HOD"
                          >
                            <ArrowRight size={12} />
                            To HOD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.8rem 0', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                No high-priority or safety hazards reported.
              </div>
            )}
          </div>

          {/* Routine & Maintenance Queue */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="priority-dot Medium"></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  General Maintenance & Equipment Queue
                </h3>
              </div>
              <span className="count-chip font-mono">{generalTickets.length} Items</span>
            </div>

            {generalTickets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {generalTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    className="pipeline-card"
                    style={{ marginBottom: 0, padding: '0.85rem 1rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>#{ticket.id}</span>
                          <span style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-main)' }}>{ticket.title}</span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Reported by {ticket.reportedBy} · {ticket.daysElapsed}d ago</span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => resolveIssue(ticket.id)}
                      >
                        <Check size={12} />
                        Mark Fixed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                Queue clear.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Telemetry Incoming Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="panel" style={{ padding: '1.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} color="var(--success-text)" />
                Incoming Telemetry Feed
              </h3>
              <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>LIVE STREAM</span>
            </div>

            {records.length > 0 ? (
              <div className="live-pulse-feed">
                {records.map(rec => {
                  const isPresent = rec.status === 'PRESENT';
                  return (
                    <div key={rec.id} className="feed-item">
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-main)' }}>{rec.student_name}</strong>
                        <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {rec.timestamp} · {rec.distance_meters}m from center
                        </span>
                      </div>

                      <span className={`badge-pill ${isPresent ? 'status-Resolved' : ''}`} style={{
                        background: isPresent ? 'var(--success-bg)' : 'var(--error-bg)',
                        color: isPresent ? 'var(--success-text)' : 'var(--error-text)',
                        border: `1px solid ${isPresent ? 'var(--success-border)' : 'var(--error-border)'}`
                      }}>
                        {isPresent ? 'Verified' : 'Outside'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Awaiting student GPS scans.
              </div>
            )}
          </div>

          {/* Quick Faculty Presets */}
          <div className="panel" style={{ padding: '1.2rem' }}>
            <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              Campus Department Zones
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ padding: '0.6rem', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>Academic Block A (Room 204)</strong>
                <div style={{ color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>28.5450° N, 77.1926° E · 100m Perimeter</div>
              </div>
              <div style={{ padding: '0.6rem', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>CS & AI Labs (Lab 3)</strong>
                <div style={{ color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>28.5452° N, 77.1930° E · 80m Perimeter</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
