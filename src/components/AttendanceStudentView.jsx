import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  Crosshair, 
  Radio, 
  Clock, 
  AlertCircle, 
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  fetchActiveAttendanceSession, 
  markAttendanceApi, 
  fetchAttendancePresets 
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AttendanceStudentView() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [studentPresets, setStudentPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [locationSource, setLocationSource] = useState('preset'); // 'real' or 'preset'
  const [verificationResult, setVerificationResult] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  useEffect(() => {
    fetchActiveAttendanceSession().then(sess => {
      setActiveSession(sess);
    }).catch(err => console.warn(err));

    fetchAttendancePresets().then(res => {
      if (res?.student_presets) {
        setStudentPresets(res.student_presets);
        // Default to inside lab preset
        if (res.student_presets.length > 0) {
          setSelectedCoords(res.student_presets[0]);
        }
      }
    }).catch(err => console.warn(err));
  }, []);

  const handleAcquireRealGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocationSource('real');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedCoords({
          label: 'Real Browser GPS Position',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 5)
        });
        setLoading(false);
      },
      (err) => {
        alert(`Could not acquire GPS: ${err.message}. You can use the preset location simulator below.`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectPreset = (preset) => {
    setLocationSource('preset');
    setSelectedCoords(preset);
    setVerificationResult(null);
  };

  const handleMarkAttendance = async () => {
    if (!activeSession) {
      alert('No active attendance session found.');
      return;
    }
    if (!selectedCoords) {
      alert('Please select or acquire a location first.');
      return;
    }

    try {
      setLoading(true);
      const result = await markAttendanceApi({
        session_id: activeSession.id,
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        accuracy_meters: selectedCoords.accuracy || 5.0,
        preset_name: selectedCoords.label
      });

      setVerificationResult(result);
      setMyHistory(prev => [result, ...prev]);
    } catch (err) {
      alert(`Attendance verification failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-view">
      {/* Student Banner */}
      <div className="panel" style={{ padding: '1.6rem 2rem', marginBottom: '1.8rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.08) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              <Navigation size={15} /> Student Geolocation Portal
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Geofence Classroom Check-in</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
              Verify your physical coordinates to prove attendance within the instructor's perimeter boundary.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span className="priority-dot Low"></span>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 500 }}>
              Logged in as: <strong>{user.name}</strong> ({user.department})
            </span>
          </div>
        </div>
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '1fr 380px' }}>
        {/* Left Column: Active Session & Telemetry Scanner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Session Status */}
          <div className="panel" style={{ padding: '1.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <span className="badge-pill" style={{ background: 'var(--status-progress-bg)', color: '#818cf8', marginBottom: '0.5rem' }}>
                  <Radio size={12} /> Active Class Geofence
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {activeSession ? activeSession.course_name : 'No active class session broadcast at this moment'}
                </h3>
              </div>

              {activeSession && (
                <span className="badge-pill status-Resolved" style={{ fontSize: '0.8rem' }}>
                  Broadcasting Live
                </span>
              )}
            </div>

            {activeSession ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', background: 'rgba(0,0,0,0.25)', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.86rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.78rem' }}>Instructor</span>
                  <strong style={{ color: 'var(--text-main)' }}>{activeSession.teacher_name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.78rem' }}>Room / Venue</span>
                  <strong style={{ color: 'var(--text-main)' }}>{activeSession.room}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.78rem' }}>Required Perimeter</span>
                  <strong style={{ color: 'var(--accent)' }}>Within {activeSession.radius_meters}m</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.78rem' }}>Target GPS Center</span>
                  <code style={{ color: 'var(--primary-hover)', fontSize: '0.82rem' }}>{activeSession.latitude.toFixed(4)}°, {activeSession.longitude.toFixed(4)}°</code>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Your instructor has not opened a geofence attendance window yet. Once opened, it will appear here automatically.
              </p>
            )}
          </div>

          {/* Verification Box & Radar Scanner */}
          <div className="panel" style={{ padding: '1.8rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={18} color="var(--primary-hover)" />
              GPS Coordinate Acquisition & Telemetry
            </h3>

            {/* Simulated vs Real selector */}
            <div style={{ marginBottom: '1.4rem' }}>
              <label style={{ display: 'block', fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                Location Signal Source:
              </label>

              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${locationSource === 'real' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleAcquireRealGps}
                  disabled={loading}
                >
                  <Compass size={16} />
                  Acquire Live Browser GPS
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                  or select an instant simulation preset below:
                </div>
              </div>
            </div>

            {/* Presets buttons */}
            <div style={{ marginBottom: '1.6rem' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Simulation Presets (for testing inside & outside geofences without leaving room):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                {studentPresets.map((preset) => {
                  const isSelected = locationSource === 'preset' && selectedCoords?.id === preset.id;
                  const isInside = preset.id.startsWith('inside');
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: '9px',
                        textAlign: 'left',
                        background: isSelected ? 'var(--surface-active)' : 'var(--surface)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 12px var(--primary-glow)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`priority-dot ${isInside ? 'Low' : 'Critical'}`}></span>
                        {preset.label}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: isInside ? 'var(--success)' : 'var(--error)', marginTop: '2px', display: 'block' }}>
                        {preset.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currently Selected Location Readout */}
            {selectedCoords && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Ready Location Signal:</div>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{selectedCoords.label}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-hover)', marginTop: '2px' }}>
                    Latitude: {selectedCoords.latitude.toFixed(5)}° · Longitude: {selectedCoords.longitude.toFixed(5)}°
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleMarkAttendance}
                  disabled={loading || !activeSession}
                  id="submitAttendanceBtn"
                >
                  <Navigation size={18} />
                  {loading ? 'Verifying with Geofence...' : 'Mark Attendance'}
                </button>
              </div>
            )}

            {/* Verification Result Callout */}
            {verificationResult && (
              <div
                style={{
                  padding: '1.4rem 1.6rem',
                  borderRadius: '12px',
                  background: verificationResult.status === 'PRESENT'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                  border: `1.5px solid ${
                    verificationResult.status === 'PRESENT'
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(239, 68, 68, 0.4)'
                  }`,
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.6rem' }}>
                  {verificationResult.status === 'PRESENT' ? (
                    <CheckCircle2 size={24} color="var(--success)" />
                  ) : (
                    <XCircle size={24} color="var(--error)" />
                  )}
                  <h4 style={{ 
                    fontSize: '1.15rem', 
                    color: verificationResult.status === 'PRESENT' ? 'var(--success)' : 'var(--error)' 
                  }}>
                    {verificationResult.status === 'PRESENT'
                      ? '✓ Attendance Successfully Verified!'
                      : '⚠ Attendance Rejected: Outside Boundary'}
                  </h4>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {verificationResult.status === 'PRESENT' ? (
                    <>
                      You are physically located <strong>{verificationResult.distance_meters} meters</strong> from the classroom center. This is within the allowed <strong>{verificationResult.radius_meters}m</strong> geofence. Your attendance has been securely stamped.
                    </>
                  ) : (
                    <>
                      You are <strong>{verificationResult.distance_meters} meters</strong> away from the classroom center, exceeding the allowed <strong>{verificationResult.radius_meters}m</strong> threshold. Please move inside the classroom perimeter to check in.
                    </>
                  )}
                </p>

                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.8rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Verified Time: {verificationResult.timestamp}</span>
                  <span>Accuracy: ±{verificationResult.accuracy_meters}m</span>
                  <span>Status: <strong>{verificationResult.status}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Radar Scanner & Scan History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Radar Scanner Graphic Panel */}
          <div className="panel" style={{ padding: '1.6rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Radio size={16} color="var(--accent)" />
              Perimeter Radar Scope
            </h3>

            <div className="radar-container" style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 1.2rem' }}>
              <div className="radar-circle circle-1"></div>
              <div className="radar-circle circle-2"></div>
              <div className="radar-circle circle-3"></div>
              <div className="radar-crosshair-h"></div>
              <div className="radar-crosshair-v"></div>
              <div className="radar-sweep"></div>
              <div className={`radar-blip ${verificationResult?.status === 'OUTSIDE_GEOFENCE' ? 'blip-outside' : 'blip-inside'}`}></div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Active Haversine validation protocol active on FastAPI backend. GPS spoofing prevention enabled.
            </div>
          </div>

          {/* Student's Local Scan History */}
          <div className="panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--primary-hover)" />
              Recent Scans
            </h3>

            {myHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {myHistory.map((h, i) => (
                  <div 
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>
                        {h.distance_meters}m from center
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {h.timestamp}
                      </span>
                    </div>

                    <span className={`badge-pill ${h.status === 'PRESENT' ? 'status-Resolved' : ''}`} style={{
                      background: h.status === 'PRESENT' ? 'var(--status-resolved-bg)' : 'rgba(239,68,68,0.15)',
                      color: h.status === 'PRESENT' ? 'var(--success)' : '#fca5a5'
                    }}>
                      {h.status === 'PRESENT' ? 'Present' : 'Rejected'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.84rem', textAlign: 'center', padding: '1rem 0' }}>
                No scan history recorded in this session yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
