import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  Crosshair, 
  Radio, 
  Clock, 
  Shield,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  MapPin,
  Activity
} from 'lucide-react';
import { 
  fetchActiveAttendanceSession, 
  markAttendanceApi, 
  fetchAttendancePresets 
} from '../services/api';
import { calculateHaversineDistance, formatDistance, HIGH_ACCURACY_GPS_OPTIONS } from '../utils/geo';
import { useAuth } from '../context/AuthContext';
import AttendanceMap from './AttendanceMap';

export default function AttendanceStudentView() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [studentPresets, setStudentPresets] = useState([]);
  const [loading, setLoading] = useState(false);

  // GPS Telemetry State
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'acquiring' | 'locked' | 'denied' | 'error'
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const [hardwareGps, setHardwareGps] = useState(null);
  const [activeSignalType, setActiveSignalType] = useState('gps'); // 'gps' | 'simulation'
  const [simulatedCoords, setSimulatedCoords] = useState(null);
  const [isSimDrawerOpen, setIsSimDrawerOpen] = useState(false);

  // Verification & History
  const [verificationResult, setVerificationResult] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  // Hardware GPS Acquisition
  const acquireRealGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Hardware Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('acquiring');
    setGpsErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          label: 'Hardware Device GPS',
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 5),
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          isHardwareGps: true,
          timestamp: new Date(pos.timestamp).toLocaleTimeString()
        };
        setHardwareGps(coords);
        setActiveSignalType('gps');
        setGpsStatus('locked');
      },
      (err) => {
        console.warn('Geolocation acquisition error:', err);
        if (err.code === 1) {
          setGpsStatus('denied');
          setGpsErrorMsg('Location permission was denied. Please allow location access in your browser or OS settings.');
        } else if (err.code === 2) {
          setGpsStatus('error');
          setGpsErrorMsg('Position unavailable from GPS satellites or network sensors.');
        } else if (err.code === 3) {
          setGpsStatus('error');
          setGpsErrorMsg('Location acquisition timed out. Please retry.');
        } else {
          setGpsStatus('error');
          setGpsErrorMsg(err.message || 'Unable to retrieve device GPS fix.');
        }
      },
      HIGH_ACCURACY_GPS_OPTIONS
    );
  };

  useEffect(() => {
    // 1. Fetch active classroom session
    fetchActiveAttendanceSession().then(sess => {
      setActiveSession(sess);
    }).catch(err => console.warn(err));

    // 2. Fetch presets for simulation lab
    fetchAttendancePresets().then(res => {
      if (res?.student_presets) {
        setStudentPresets(res.student_presets);
        if (res.student_presets.length > 0) {
          setSimulatedCoords({
            ...res.student_presets[0],
            isHardwareGps: false
          });
        }
      }
    }).catch(err => console.warn(err));

    // 3. Prompt and acquire live device GPS automatically
    acquireRealGps();
  }, []);

  // Determine active coordinates being evaluated
  const currentCoords = (activeSignalType === 'gps' && hardwareGps)
    ? hardwareGps
    : (simulatedCoords || hardwareGps);

  // Live Haversine distance calculation
  const currentDistance = (activeSession && currentCoords)
    ? calculateHaversineDistance(
        currentCoords.latitude,
        currentCoords.longitude,
        activeSession.latitude,
        activeSession.longitude
      )
    : null;

  const radiusLimit = activeSession?.radius_meters || 100;
  const isInsidePerimeter = currentDistance != null ? currentDistance <= radiusLimit : false;

  // Handle preset selection
  const handleSelectPreset = (preset) => {
    setActiveSignalType('simulation');
    setSimulatedCoords({
      ...preset,
      isHardwareGps: false
    });
    setVerificationResult(null);
  };

  // Switch back to real GPS
  const handleSwitchToRealGps = () => {
    setActiveSignalType('gps');
    setVerificationResult(null);
    if (!hardwareGps) {
      acquireRealGps();
    }
  };

  // Submit coordinate verification to backend
  const handleMarkAttendance = async () => {
    if (!activeSession) {
      alert('No active attendance session is broadcasting.');
      return;
    }
    if (!currentCoords) {
      alert('Please acquire GPS signal or choose coordinates first.');
      return;
    }

    try {
      setLoading(true);
      const result = await markAttendanceApi({
        session_id: activeSession.id,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        accuracy_meters: currentCoords.accuracy || 5.0,
        preset_name: activeSignalType === 'gps' ? 'Live Hardware GPS' : currentCoords.label,
        student_id: user.id,
        student_name: user.name,
        student_dept: `${user.department} ${user.semester_or_title || ''}`.trim()
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              <Navigation size={14} color="var(--primary)" /> Real-Time Geofence Attendance
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>Classroom Geolocation Check-In</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.15rem' }}>
              Confirm your physical presence in class via device GPS telemetry and spherical Haversine validation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            {/* GPS Lock State Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: gpsStatus === 'locked' && activeSignalType === 'gps' ? 'var(--success-bg)' : 'var(--bg-subtle)',
              border: `1px solid ${gpsStatus === 'locked' && activeSignalType === 'gps' ? 'var(--success-border)' : 'var(--border)'}`,
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem'
            }}>
              <span className={`priority-dot ${gpsStatus === 'locked' && activeSignalType === 'gps' ? 'Low' : (gpsStatus === 'acquiring' ? 'Medium' : 'Critical')}`}></span>
              <span style={{ 
                fontWeight: 600, 
                color: gpsStatus === 'locked' && activeSignalType === 'gps' ? 'var(--success-text)' : 'var(--text-main)',
                fontFamily: 'ui-monospace, monospace'
              }}>
                {activeSignalType === 'gps' ? (
                  gpsStatus === 'locked' ? `GPS LOCKED (±${hardwareGps?.accuracy}m)` :
                  gpsStatus === 'acquiring' ? 'ACQUIRING GPS...' :
                  gpsStatus === 'denied' ? 'GPS PERMISSION DENIED' : 'GPS IDLE'
                ) : 'SIMULATION MODE'}
              </span>
            </div>

            {/* Student Identity Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-subtle)', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
                {user.name} <span style={{ color: 'var(--text-dim)' }}>({user.department})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Left Column: Active Session & Interactive Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Active Class Target Info */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.9rem' }}>
              <div>
                <span className="badge-pill" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                  <Radio size={11} color="var(--success-text)" /> Target Classroom Geofence
                </span>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 600 }}>
                  {activeSession ? activeSession.course_name : 'No active session broadcast currently'}
                </h3>
              </div>

              {activeSession && (
                <span className="badge-pill status-Resolved" style={{ fontSize: '0.75rem' }}>
                  Active Geofence Window
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
                  <strong style={{ color: 'var(--text-main)', fontFamily: 'ui-monospace, monospace' }}>≤ {activeSession.radius_meters} meters</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.74rem' }}>Center Reference</span>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
                    {activeSession.latitude.toFixed(5)}° N, {activeSession.longitude.toFixed(5)}° E
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.86rem' }}>
                No active geofence window is currently broadcasting. Check back when lecture begins.
              </p>
            )}
          </div>

          {/* Interactive Geospatial Map Panel */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <MapPin size={16} color="var(--primary)" />
                  Geofence Radar Map
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                  Interactive perimeter visualization with live student GPS vector
                </span>
              </div>

              {/* Map Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                  Classroom Radius
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: isInsidePerimeter ? '#22c55e' : '#ef4444', display: 'inline-block' }}></span>
                  Your Position
                </span>
              </div>
            </div>

            {/* Leaflet Map Embed */}
            <AttendanceMap
              sessionCenter={activeSession}
              studentCoords={currentCoords}
              isInside={isInsidePerimeter}
              distanceMeters={currentDistance}
              height="350px"
            />

            {/* Live Telemetry Banner beneath map */}
            <div style={{
              marginTop: '0.9rem',
              padding: '0.8rem 1rem',
              borderRadius: '6px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                  Spherical Haversine Distance:
                </span>
                <strong style={{ fontSize: '1.15rem', color: isInsidePerimeter ? 'var(--success-text)' : 'var(--error-text)', fontFamily: 'ui-monospace, monospace' }}>
                  {currentDistance != null ? `${currentDistance} meters` : '--'}
                </strong>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
                  (Allowed: ≤ {radiusLimit}m)
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge-pill" style={{
                  background: isInsidePerimeter ? 'var(--success-bg)' : 'var(--error-bg)',
                  color: isInsidePerimeter ? 'var(--success-text)' : 'var(--error-text)',
                  border: `1px solid ${isInsidePerimeter ? 'var(--success-border)' : 'var(--error-border)'}`,
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem'
                }}>
                  {isInsidePerimeter ? '✓ Within Classroom Perimeter' : '⚠ Outside Allowed Perimeter'}
                </span>
              </div>
            </div>
          </div>

          {/* Coordinate Signal Controls & Attendance Action */}
          <div className="panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Crosshair size={16} />
                Hardware GPS Telemetry
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn ${activeSignalType === 'gps' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={acquireRealGps}
                  disabled={loading || gpsStatus === 'acquiring'}
                >
                  <RefreshCw size={13} className={gpsStatus === 'acquiring' ? 'spin-icon' : ''} />
                  {gpsStatus === 'acquiring' ? 'Acquiring GPS...' : 'Re-scan Hardware GPS'}
                </button>

                {activeSignalType === 'simulation' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSwitchToRealGps}
                  >
                    Return to Live GPS
                  </button>
                )}
              </div>
            </div>

            {/* GPS Diagnostic Alert if denied or error */}
            {gpsStatus === 'denied' && (
              <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: '6px', padding: '0.85rem 1rem', marginBottom: '1.2rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--error-text)', fontWeight: 600, marginBottom: '0.3rem' }}>
                  <AlertTriangle size={16} />
                  Location Access Denied
                </div>
                <p style={{ color: 'var(--text-main)', lineHeight: 1.4, margin: '0.2rem 0' }}>
                  {gpsErrorMsg} Click the lock / settings icon next to the URL bar to enable Location, then hit <strong>"Re-scan Hardware GPS"</strong>.
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setIsSimDrawerOpen(true)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    Open Testing Simulation Lab
                  </button>
                </div>
              </div>
            )}

            {/* Active Coordinates Details Card */}
            {currentCoords && (
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Transmitting Coordinates ({currentCoords.label || 'Active Signal'}):
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'ui-monospace, monospace', marginTop: '2px' }}>
                      {currentCoords.latitude.toFixed(6)}° N, {currentCoords.longitude.toFixed(6)}° E
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace', marginTop: '3px' }}>
                      Accuracy: ±{currentCoords.accuracy || 5}m {currentCoords.altitude ? `· Altitude: ${currentCoords.altitude}m` : ''} {currentCoords.timestamp ? `· Fix: ${currentCoords.timestamp}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleMarkAttendance}
                    disabled={loading || !activeSession}
                    id="submitAttendanceBtn"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                  >
                    <Navigation size={15} />
                    {loading ? 'Verifying with Server...' : 'Verify & Record Attendance'}
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Simulation Lab for Evaluators / Testing */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setIsSimDrawerOpen(!isSimDrawerOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.9rem',
                  background: 'var(--surface)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={14} />
                  🧪 Testing & Simulation Lab (For Evaluators & Edge Cases)
                </span>
                {isSimDrawerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isSimDrawerOpen && (
                <div style={{ padding: '0.9rem', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.7rem' }}>
                    Need to demo an outside-geofence breach without physically leaving campus? Select a simulated coordinate preset:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {studentPresets.map((preset) => {
                      const isSelected = activeSignalType === 'simulation' && simulatedCoords?.id === preset.id;
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
                            background: isSelected ? 'var(--surface-active)' : 'var(--surface)',
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
              )}
            </div>

            {/* Verification Result Callout */}
            {verificationResult && (
              <div
                style={{
                  marginTop: '1.2rem',
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
                    fontWeight: 600,
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
                      Server verified your distance as <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.distance_meters} meters</strong> from classroom center, within the allowed <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.radius_meters}m</strong> threshold. Check-in recorded for <strong>{verificationResult.student_name}</strong>.
                    </>
                  ) : (
                    <>
                      Server calculated your distance as <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.distance_meters} meters</strong>, which exceeds the allowed <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{verificationResult.radius_meters}m</strong> perimeter. Check-in was rejected.
                    </>
                  )}
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace', flexWrap: 'wrap' }}>
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
              <div className={`radar-blip ${isInsidePerimeter ? 'blip-inside' : 'blip-outside'}`}></div>
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }}>
              Threshold: {activeSession ? `${activeSession.radius_meters}m` : '100m'} · Spherical Haversine Triangulation
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
                        {h.timestamp} · ±{h.accuracy_meters}m
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
                No telemetry recorded in this session yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
