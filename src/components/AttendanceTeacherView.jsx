import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  Users,
  Power,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { 
  fetchActiveAttendanceSession, 
  createAttendanceSession, 
  closeAttendanceSession, 
  fetchAttendanceRecords,
  fetchAttendancePresets 
} from '../services/api';

export default function AttendanceTeacherView() {
  const [activeSession, setActiveSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [presets, setPresets] = useState([]);

  // Form State
  const [courseName, setCourseName] = useState('CSE 302: Computer Networks & Distributed Systems');
  const [room, setRoom] = useState('Academic Block A - Room 204');
  const [latitude, setLatitude] = useState(28.5450);
  const [longitude, setLongitude] = useState(77.1926);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(90);

  const loadSessionData = async () => {
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
      console.warn('Failed to load active session:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessionData();
    fetchAttendancePresets().then(data => {
      if (data?.campus_presets) setPresets(data.campus_presets);
    }).catch(() => {});

    // Polling interval to keep live attendance fresh
    const interval = setInterval(loadSessionData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePresetSelect = (e) => {
    const selected = presets.find(p => p.id === e.target.value);
    if (selected) {
      setLatitude(selected.latitude);
      setLongitude(selected.longitude);
      setRoom(selected.name);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newSession = await createAttendanceSession({
        course_name: courseName,
        room,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_meters: parseFloat(radiusMeters),
        duration_minutes: parseInt(durationMinutes)
      });
      setActiveSession(newSession);
      const logs = await fetchAttendanceRecords(newSession.id);
      setRecords(logs);
    } catch (err) {
      alert(`Could not start session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (window.confirm('Are you sure you want to stop this geofence attendance session?')) {
      try {
        await closeAttendanceSession(activeSession.id);
        loadSessionData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const outsideCount = records.filter(r => r.status === 'OUTSIDE_GEOFENCE').length;

  return (
    <div className="attendance-view">
      {/* Top Banner */}
      <div className="panel" style={{ padding: '1.6rem 2rem', marginBottom: '1.8rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.08) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--primary-hover)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              <ShieldCheck size={16} /> Faculty Geofence Control Panel
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Autonomous Geofenced Classroom Attendance</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
              Create virtual perimeter boundaries. Students can only mark attendance when physically present inside the assigned classroom area.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={loadSessionData}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Syncing...' : 'Sync Roster'}
            </button>
            {activeSession && (
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleCloseSession}
              >
                <Power size={15} />
                End Session
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '380px 1fr' }}>
        {/* Left: Geofence Creator & Active Session Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Session Status Box */}
          <div className="panel" style={{ padding: '1.6rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} color={activeSession ? 'var(--success)' : 'var(--text-dim)'} />
              Active Geofence Status
            </h3>

            {activeSession ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <span className="priority-dot" style={{ background: 'var(--success)', width: '12px', height: '12px' }}></span>
                  <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.92rem' }}>GEOFENCE BROADCASTING LIVE</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.86rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Course: </span>
                    <strong>{activeSession.course_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Location: </span>
                    <span>{activeSession.room}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>GPS Center: </span>
                    <code style={{ color: 'var(--primary-hover)' }}>{activeSession.latitude.toFixed(4)}°, {activeSession.longitude.toFixed(4)}°</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Perimeter Radius: </span>
                    <strong style={{ color: 'var(--accent)' }}>{activeSession.radius_meters} meters</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Valid Until: </span>
                    <span>{activeSession.expires_at}</span>
                  </div>
                </div>

                {/* Telemetry Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', textAlign: 'center' }}>
                  <div style={{ background: 'var(--surface)', padding: '0.8rem 0.4rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{records.length}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Scans</div>
                  </div>
                  <div style={{ background: 'var(--status-resolved-bg)', padding: '0.8rem 0.4rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{presentCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--success)' }}>Verified</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.12)', padding: '0.8rem 0.4rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--error)' }}>{outsideCount}</div>
                    <div style={{ fontSize: '0.72rem', color: '#fca5a5' }}>Out of Fence</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                <AlertTriangle size={32} color="var(--warning)" style={{ marginBottom: '0.6rem' }} />
                <p style={{ fontSize: '0.9rem' }}>No geofence session is currently broadcasting.</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Configure the parameters below to launch a session.</span>
              </div>
            )}
          </div>

          {/* Session Configuration Form */}
          <div className="panel" style={{ padding: '1.6rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="var(--primary-hover)" />
              {activeSession ? 'Reconfigure / Launch New Session' : 'Setup Geofenced Session'}
            </h3>

            <form onSubmit={handleStartSession}>
              <div className="form-group">
                <label>Course / Subject *</label>
                <input 
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. CSE 302: Computer Networks"
                  required
                />
              </div>

              <div className="form-group">
                <label>Campus Zone Preset</label>
                <select onChange={handlePresetSelect} defaultValue="">
                  <option value="" disabled>Select campus building / lab preset</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Room / Hall Label *</label>
                <input 
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Academic Block A - Room 204"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude (°)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Longitude (°)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ margin: 0 }}>Geofence Radius: <strong>{radiusMeters} meters</strong></label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Classroom size threshold</span>
                </div>
                <input 
                  type="range"
                  min="30"
                  max="400"
                  step="10"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  <span>30m (Single Room)</span>
                  <span>100m (Wing)</span>
                  <span>400m (Whole Quad)</span>
                </div>
              </div>

              <div className="form-group">
                <label>Session Window Duration</label>
                <select value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes (1 Hour)</option>
                  <option value="90">90 Minutes (Standard Lab)</option>
                  <option value="120">120 Minutes (2 Hours)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={loading}
              >
                <Radio size={16} />
                {loading ? 'Activating...' : activeSession ? 'Update & Restart Geofence' : 'Broadcast Geofence Session'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Roster & Verification Log */}
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <h2>
              <Users size={18} color="var(--primary-hover)" />
              Live Geofence Attendance Roster
              <span className="count-chip">{records.length} Attendees</span>
            </h2>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span className="badge-pill status-Resolved">
                <CheckCircle2 size={12} /> {presentCount} Present
              </span>
              <span className="badge-pill" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                <XCircle size={12} /> {outsideCount} Outside
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {records.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.9rem 1.4rem' }}>Student Name</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Department / Roll</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Time</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Distance from Center</th>
                    <th style={{ padding: '0.9rem 1rem' }}>GPS Accuracy</th>
                    <th style={{ padding: '0.9rem 1.4rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const isPresent = rec.status === 'PRESENT';
                    return (
                      <tr 
                        key={rec.id}
                        style={{ 
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.2s ease',
                          background: isPresent ? 'transparent' : 'rgba(239, 68, 68, 0.03)'
                        }}
                      >
                        <td style={{ padding: '1rem 1.4rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {rec.student_name}
                        </td>
                        <td style={{ padding: '1rem 1rem', color: 'var(--text-muted)' }}>
                          {rec.student_dept}
                        </td>
                        <td style={{ padding: '1rem 1rem', color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                          <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                          {rec.timestamp}
                        </td>
                        <td style={{ padding: '1rem 1rem' }}>
                          <span style={{ 
                            fontWeight: 700, 
                            color: isPresent ? 'var(--success)' : 'var(--error)' 
                          }}>
                            {rec.distance_meters} m
                          </span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                            (limit {rec.radius_meters}m)
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1rem', color: 'var(--text-dim)' }}>
                          ±{rec.accuracy_meters || 5}m
                        </td>
                        <td style={{ padding: '1rem 1.4rem' }}>
                          {isPresent ? (
                            <span className="badge-pill status-Resolved" style={{ gap: '4px' }}>
                              <CheckCircle2 size={13} /> Present · Verified Inside
                            </span>
                          ) : (
                            <span 
                              className="badge-pill" 
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.15)', 
                                color: '#fca5a5', 
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                gap: '4px'
                              }}
                            >
                              <XCircle size={13} /> Denied · Outside Geofence
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <Users size={38} color="var(--text-dim)" style={{ marginBottom: '0.8rem' }} />
                <h3>No attendance scans recorded yet</h3>
                <p style={{ fontSize: '0.88rem', maxWidth: '380px', margin: '0.4rem auto 0' }}>
                  When students open their attendance portal and verify their GPS location, their telemetry and status will appear here live.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
