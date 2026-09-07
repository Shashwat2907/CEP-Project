import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  Crosshair, 
  Radio, 
  Clock, 
  Shield
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
  const [locationSource, setLocationSource] = useState('preset');
  const [verificationResult, setVerificationResult] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  useEffect(() => {
    fetchActiveAttendanceSession().then(sess => {
      setActiveSession(sess);
    }).catch(err => console.warn(err));

    fetchAttendancePresets().then(res => {
      if (res?.student_presets) {
        setStudentPresets(res.student_presets);
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
          label: 'Hardware GPS Signal',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 5)
        });
        setLoading(false);
      },
      (err) => {
        alert(`Could not acquire GPS: ${err.message}. You can use the simulation presets below.`);
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
      {/* Top Header Summary */}
      <div className="panel" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.5rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              <Navigation size={14} /> Student Geofence Telemetry
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>Classroom Geolocation Check-in</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.15rem' }}>
              Confirm your physical presence in class via server-validated coordinate triangulation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-subtle)', padding: '0.5rem 0.9rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span className="priority-dot Low"></span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
              Student: <strong>{user.name}</strong> ({user.department})
            </span>
          </div>
        </div>
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Left Column: Active Session & Coordinate Submission */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Active Class Target Info */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.9rem' }}>
              <div>
                <span className="badge-pill" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                  <Radio size={11} /> Target Classroom Geofence
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                  {activeSession ? activeSession.course_name : 'No active session broadcast currently'}
                </h3>
              </div>

              {activeSession && (
                <span className="badge-pill status-Resolved" style={{ fontSize: '0.75rem' }}>
                  Active Broadcast
                </span>
              )}
            </div>

            {activeSession ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', background: 'var(--bg-subtle)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.74rem' }}>Instructor</span>
                  <strong style={{ color: 'var(--text-main)' }}>{activeSession.teacher_name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.74rem' }}>Classroom Venue</span>
                  <strong style={{ color: 'var(--text-main)' }}>{activeSession.room}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.74rem' }}>Perimeter Radius</span>
                  <strong style={{ color: 'var(--text-main)', fontFamily: 'ui-monospace, monospace' }}>≤ {activeSession.radius_meters}m</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.74rem' }}>Center Reference</span>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                    {activeSession.latitude.toFixed(4)}°, {activeSession.longitude.toFixed(4)}°
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.86rem' }}>
                No active geofence window is currently broadcasting. Check back when lecture begins.
              </p>
            )}
          </div>

          {/* Coordinate Signal Acquisition */}
          <div className="panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Crosshair size={16} />
              Location Signal & Verification
            </h3>

            {/* Signal Source Selection */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn ${locationSource === 'real' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleAcquireRealGps}
                  disabled={loading}
                >
                  <Compass size={15} />
                  Acquire Device GPS
                </button>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>or test with location presets:</span>
              </div>
            </div>

            {/* Presets List */}
            <div style={{ marginBottom: '1.4rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {studentPresets.map((preset) => {
                  const isSelected = locationSource === 'preset' && selectedCoords?.id === preset.id;
                  const isInside = preset.id.startsWith('inside');
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        padding: '0.65rem 0.8rem',
                        borderRadius: '6px',
                        textAlign: 'left',
                        background: isSelected ? 'var(--surface-active)' : 'var(--bg-subtle)',
                        border: `1px solid ${isSelected ? 'var(--text-main)' : 'var(--border)'}`,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`priority-dot ${isInside ? 'Low' : 'Critical'}`}></span>
                        {preset.label}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: isInside ? 'var(--success-text)' : 'var(--error-text)', marginTop: '2px', display: 'block', fontFamily: 'ui-monospace, monospace' }}>
                        {preset.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Location Readout & Action */}
            {selectedCoords && (
              <div style={{ background: 'var(--bg-subtle)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Selected Signal:</div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{selectedCoords.label}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace', marginTop: '2px' }}>
                    {selectedCoords.latitude.toFixed(5)}° N, {selectedCoords.longitude.toFixed(5)}° E
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleMarkAttendance}
                  disabled={loading || !activeSession}
                  id="submitAttendanceBtn"
                >
                  <Navigation size={15} />
                  {loading ? 'Verifying Coordinates...' : 'Verify & Record Attendance'}
                </button>
              </div>
            )}

            {/* Verification Result Callout */}
            {verificationResult && (
              <div
                style={{
                  padding: '1.1rem 1.3rem',
                  borderRadius: '8px',
                  background: verificationResult.status === 'PRESENT' ? 'var(--success-bg)' : 'var(--error-bg)',
                  border: `1px solid ${verificationResult.status === 'PRESENT' ? 'var(--success-border)' : 'var(--error-border)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                  {verificationResult.status === 'PRESENT' ? (
                    <CheckCircle2 size={18} color="var(--success-text)" />
                  ) : (
                    <XCircle size={18} color="var(--error-text)" />
                  )}
                  <h4 style={{ 
                    fontSize: '0.98rem', 
                    color: verificationResult.status === 'PRESENT' ? 'var(--success-text)' : 'var(--error-text)' 
                  }}>
                    {verificationResult.status === 'PRESENT'
                      ? 'Attendance Confirmed (Within Perimeter)'
                      : 'Attendance Denied (Outside Perimeter)'}
                  </h4>
                </div>

                <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {verificationResult.status === 'PRESENT' ? (
                    <>
                      Server verified your distance as <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.distance_meters} meters</strong> from center, within the allowed <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.radius_meters}m</strong> threshold. Check-in recorded.
                    </>
                  ) : (
                    <>
                      Server calculated your distance as <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.distance_meters} meters</strong>, which exceeds the allowed <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.radius_meters}m</strong> perimeter. Check-in was rejected.
                    </>
                  )}
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                  <span>Timestamp: {verificationResult.timestamp}</span>
                  <span>Accuracy: ±{verificationResult.accuracy_meters}m</span>
                  <span>Status: <strong>{verificationResult.status}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Precision Reticle & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Geospatial Scope Reticle */}
          <div className="panel" style={{ padding: '1.3rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              Geospatial Reticle Scope
            </h3>

            <div className="radar-container">
              <div className="radar-circle circle-1"></div>
              <div className="radar-circle circle-2"></div>
              <div className="radar-circle circle-3"></div>
              <div className="radar-crosshair-h"></div>
              <div className="radar-crosshair-v"></div>
              <div className="radar-sweep"></div>
              <div className={`radar-blip ${verificationResult?.status === 'OUTSIDE_GEOFENCE' ? 'blip-outside' : 'blip-inside'}`}></div>
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
              Target Radius: {activeSession ? `${activeSession.radius_meters}m` : '100m'} · Spherical Haversine Verification
            </div>
          </div>

          {/* Session Logs */}
          <div className="panel" style={{ padding: '1.2rem' }}>
            <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              Session Telemetry History
            </h3>

            {myHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myHistory.map((h, i) => (
                  <div 
                    key={i}
                    style={{
                      background: 'var(--bg-subtle)',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-main)', fontFamily: 'ui-monospace, monospace' }}>
                        {h.distance_meters}m from center
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                        {h.timestamp}
                      </span>
                    </div>

                    <span className={`badge-pill ${h.status === 'PRESENT' ? 'status-Resolved' : ''}`} style={{
                      background: h.status === 'PRESENT' ? 'var(--success-bg)' : 'var(--error-bg)',
                      color: h.status === 'PRESENT' ? 'var(--success-text)' : 'var(--error-text)',
                      border: `1px solid ${h.status === 'PRESENT' ? 'var(--success-border)' : 'var(--error-border)'}`
                    }}>
                      {h.status === 'PRESENT' ? 'Present' : 'Outside'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textAlign: 'center', padding: '0.8rem 0' }}>
                No telemetry recorded in this browser session.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
