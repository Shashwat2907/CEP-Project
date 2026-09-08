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
  Compass,
  Navigation
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
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoSuccessMsg, setGeoSuccessMsg] = useState('');

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

    const interval = setInterval(loadSessionData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePresetSelect = (e) => {
    const selected = presets.find(p => p.id === e.target.value);
    if (selected) {
      setLatitude(selected.latitude);
      setLongitude(selected.longitude);
      setRoom(selected.name);
      setGeoSuccessMsg('');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    setGeoSuccessMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 0);
        setLatitude(lat);
        setLongitude(lon);
        setGeoLocating(false);
        setGeoSuccessMsg(`Snapped to hardware GPS: ±${acc}m accuracy`);
        if (!room.includes('Current Location')) {
          setRoom(prev => prev ? `${prev} (Current Location)` : 'Live Classroom Location');
        }
      },
      (err) => {
        setGeoLocating(false);
        alert(`Could not acquire device location: ${err.message}. Please check browser permissions.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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
      <div className="panel" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.5rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              <ShieldCheck size={14} /> Faculty Attendance Management Console
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>Autonomous Geofenced Classroom Attendance</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.15rem' }}>
              Broadcast mathematical perimeter thresholds for class sessions. Verify real-time presence with zero manual roll call.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={loadSessionData}
              disabled={refreshing}
            >
              <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Syncing...' : 'Sync Roster'}
            </button>
            {activeSession && (
              <button 
                type="button" 
                className="btn btn-danger btn-sm"
                onClick={handleCloseSession}
              >
                <Power size={13} />
                Terminate Session
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '360px 1fr' }}>
        {/* Left: Configuration & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Active Status Box */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Radio size={15} />
              Geofence Broadcasting State
            </h3>

            {activeSession ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem' }}>
                  <span className="priority-dot" style={{ background: 'var(--success)' }}></span>
                  <span style={{ fontWeight: 600, color: 'var(--success-text)', fontSize: '0.84rem' }}>ACTIVE SESSION IN PROGRESS</span>
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Course: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{activeSession.course_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Location: </span>
                    <span style={{ color: 'var(--text-main)' }}>{activeSession.room}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Perimeter: </span>
                    <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{activeSession.radius_meters} meters</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Expires: </span>
                    <span style={{ color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>{activeSession.expires_at}</span>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.3rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{records.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Scans</div>
                  </div>
                  <div style={{ background: 'var(--success-bg)', padding: '0.65rem 0.3rem', borderRadius: '6px', border: '1px solid var(--success-border)' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success-text)', fontFamily: 'ui-monospace, monospace' }}>{presentCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--success-text)' }}>Present</div>
                  </div>
                  <div style={{ background: 'var(--error-bg)', padding: '0.65rem 0.3rem', borderRadius: '6px', border: '1px solid var(--error-border)' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--error-text)', fontFamily: 'ui-monospace, monospace' }}>{outsideCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--error-text)' }}>Outside</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.2rem 0', color: 'var(--text-dim)' }}>
                <p style={{ fontSize: '0.86rem' }}>No broadcast is currently running.</p>
                <span style={{ fontSize: '0.78rem' }}>Set parameters below to activate perimeter.</span>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Sliders size={15} />
              Session Parameters
            </h3>

            <form onSubmit={handleStartSession}>
              <div className="form-group">
                <label>Course Title *</label>
                <input 
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Course title and code"
                  required
                />
              </div>

              <div className="form-group">
                <label>Campus Zone Preset</label>
                <select onChange={handlePresetSelect} defaultValue="">
                  <option value="" disabled>Select pre-mapped zone</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Room / Venue Label *</label>
                <input 
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Block A, Room 204"
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLocating}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '0.6rem 0.8rem' }}
                >
                  <Navigation size={14} className={geoLocating ? 'spin-icon' : ''} color="var(--primary)" />
                  {geoLocating ? 'Acquiring Device GPS...' : '📍 Snap Geofence to My Current GPS'}
                </button>
                {geoSuccessMsg && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--success-text)', marginTop: '0.35rem', textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}>
                    ✓ {geoSuccessMsg}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lat (°)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lon (°)</label>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label style={{ margin: 0 }}>Radius: <strong>{radiusMeters}m</strong></label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>±5m tolerance</span>
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
              </div>

              <div className="form-group">
                <label>Duration Window</label>
                <select value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes</option>
                  <option value="90">90 Minutes</option>
                  <option value="120">120 Minutes</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.4rem' }}
                disabled={loading}
              >
                <Radio size={15} />
                {loading ? 'Activating...' : activeSession ? 'Re-broadcast Geofence' : 'Broadcast Geofence Session'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Roster Table */}
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <h2>
              <Users size={16} />
              Classroom Attendance Telemetry
              <span className="count-chip">{records.length} Scans</span>
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge-pill status-Resolved">
                {presentCount} Present
              </span>
              <span className="badge-pill" style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)' }}>
                {outsideCount} Outside
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {records.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.75rem 1.2rem' }}>Student</th>
                    <th style={{ padding: '0.75rem 0.8rem' }}>Dept / Section</th>
                    <th style={{ padding: '0.75rem 0.8rem' }}>Check-in</th>
                    <th style={{ padding: '0.75rem 0.8rem' }}>Distance from Center</th>
                    <th style={{ padding: '0.75rem 0.8rem' }}>GPS Accuracy</th>
                    <th style={{ padding: '0.75rem 1.2rem' }}>Verification</th>
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
                          background: isPresent ? 'transparent' : 'rgba(239, 68, 68, 0.02)'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {rec.student_name}
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem', color: 'var(--text-muted)' }}>
                          {rec.student_dept}
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                          {rec.timestamp}
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem', fontFamily: 'ui-monospace, monospace' }}>
                          <span style={{ 
                            fontWeight: 600, 
                            color: isPresent ? 'var(--success-text)' : 'var(--error-text)' 
                          }}>
                            {rec.distance_meters} m
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                            / {rec.radius_meters}m
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.8rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                          ±{rec.accuracy_meters || 5}m
                        </td>
                        <td style={{ padding: '0.85rem 1.2rem' }}>
                          {isPresent ? (
                            <span className="badge-pill status-Resolved" style={{ gap: '4px' }}>
                              <CheckCircle2 size={12} /> Present
                            </span>
                          ) : (
                            <span 
                              className="badge-pill" 
                              style={{ 
                                background: 'var(--error-bg)', 
                                color: 'var(--error-text)', 
                                border: '1px solid var(--error-border)',
                                gap: '4px'
                              }}
                            >
                              <XCircle size={12} /> Denied (Outside)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '3.5rem 2rem', color: 'var(--text-dim)' }}>
                <Users size={32} style={{ marginBottom: '0.6rem' }} />
                <h4>No attendance check-ins recorded</h4>
                <p style={{ fontSize: '0.82rem', maxWidth: '340px', margin: '0.3rem auto 0' }}>
                  When students verify their coordinates, their telemetry will stream into this table live.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
