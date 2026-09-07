import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Radio, 
  Tv, 
  Zap, 
  Wifi, 
  Armchair, 
  Sparkles, 
  AlertTriangle, 
  Send,
  ChevronRight,
  ThumbsUp,
  MapPin,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  fetchActiveAttendanceSession, 
  markAttendanceApi, 
  fetchAttendancePresets 
} from '../services/api';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';
import { STAGES } from '../data/mockData';

export default function StudentCompanion({ onSelectIssue }) {
  const { user } = useAuth();
  const { issues, addIssue, toggleUpvote } = useIssues();

  // Attendance State
  const [activeSession, setActiveSession] = useState(null);
  const [studentPresets, setStudentPresets] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);

  // Quick Incident Pad State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickRoom, setQuickRoom] = useState('Room 204');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  useEffect(() => {
    fetchActiveAttendanceSession().then(sess => {
      setActiveSession(sess);
    }).catch(() => {});

    fetchAttendancePresets().then(res => {
      if (res?.student_presets) {
        setStudentPresets(res.student_presets);
        if (res.student_presets.length > 0) {
          setSelectedLocation(res.student_presets[0]);
        }
      }
    }).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    if (!activeSession || !selectedLocation) return;
    try {
      setCheckingIn(true);
      const res = await markAttendanceApi({
        session_id: activeSession.id,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        accuracy_meters: selectedLocation.accuracy || 4.5,
        preset_name: selectedLocation.label
      });
      setCheckInResult(res);
    } catch (err) {
      alert(`Check-in failed: ${err.message}`);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategory || !quickTitle.trim()) return;

    setSubmittingIssue(true);
    const isCritical = selectedCategory === 'Safety Hazard';
    addIssue({
      category: selectedCategory,
      priority: isCritical ? 'Critical' : 'Medium',
      title: `${quickTitle.trim()} in ${quickRoom}`,
      description: `Reported via Student Companion quick pad. Location: ${quickRoom}. Needs immediate attention from assigned representative.`,
      imagePreview: null
    });

    setQuickTitle('');
    setSelectedCategory(null);
    setSubmittingIssue(false);
  };

  const studentIssues = issues.filter(i => i.reportedBy === user.name || i.status !== 'Resolved');

  // Gauge Percentage calculation (0m to 250m scale)
  const currentDistance = checkInResult 
    ? checkInResult.distance_meters 
    : selectedLocation?.id === 'inside_lab' ? 22.5 : selectedLocation?.id === 'outside_city' ? 850 : 65;
  const gaugePercent = Math.min(Math.max((currentDistance / 220) * 100, 4), 96);
  const isInsidePerimeter = currentDistance <= (activeSession?.radius_meters || 100);

  return (
    <div className="student-companion">
      {/* 1. TOP UTILITY: Live Classroom Check-in Terminal */}
      <div className="panel" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.6rem', borderLeft: '3px solid var(--text-main)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              <Radio size={13} color="var(--success-text)" /> Live Lecture Geofence
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {activeSession ? activeSession.course_name : 'No Active Classroom Geofence'}
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
              {activeSession ? (
                <>Venue: <strong>{activeSession.room}</strong> · Instructor: {activeSession.teacher_name} · Perimeter: <strong>≤ {activeSession.radius_meters}m</strong></>
              ) : (
                'Your instructors have not opened an attendance window for this hour.'
              )}
            </div>
          </div>

          {activeSession && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCheckIn}
              disabled={checkingIn}
              id="studentQuickCheckInBtn"
            >
              <Navigation size={14} />
              {checkingIn ? 'Verifying Coordinates...' : 'Confirm Presence & Check In'}
            </button>
          )}
        </div>

        {/* Visual Linear Distance Gauge */}
        {activeSession && (
          <div className="distance-gauge-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>
                GPS Distance from Room: <strong className="font-mono" style={{ color: isInsidePerimeter ? 'var(--success-text)' : 'var(--error-text)' }}>{currentDistance} meters</strong>
              </span>
              <span className="badge-pill" style={{ 
                background: isInsidePerimeter ? 'var(--success-bg)' : 'var(--error-bg)',
                color: isInsidePerimeter ? 'var(--success-text)' : 'var(--error-text)',
                border: `1px solid ${isInsidePerimeter ? 'var(--success-border)' : 'var(--error-border)'}`,
                fontSize: '0.7rem'
              }}>
                {isInsidePerimeter ? '✓ Inside 100m Perimeter' : '⚠ Outside Allowed Perimeter'}
              </span>
            </div>

            <div className="gauge-track">
              <div className="gauge-perimeter-zone"></div>
              <div className="gauge-marker-center">0m (Center)</div>
              <div className="gauge-marker-limit">100m Limit</div>
              <div 
                className={`gauge-pin ${isInsidePerimeter ? 'inside' : 'outside'}`}
                style={{ left: `${gaugePercent}%` }}
              >
                <div className="gauge-pin-tooltip">
                  You: {currentDistance}m
                </div>
              </div>
            </div>

            {/* Quick Location Signal Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                Signal Source:
              </span>
              {studentPresets.map(preset => {
                const isSelected = selectedLocation?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(preset);
                      setCheckInResult(null);
                    }}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      background: isSelected ? 'var(--surface-active)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--text-main)' : 'var(--border)'}`,
                      color: isSelected ? 'var(--text-main)' : 'var(--text-dim)',
                      cursor: 'pointer'
                    }}
                  >
                    {preset.label.split('(')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="content-split" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Left: Quick Incident Pad + Active Ticket Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 2. FAST INCIDENT PAD (2-Tap Reporting) */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                Fast Classroom Incident Pad
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Report fixture breakdowns in 2 taps
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Experiencing a broken projector or lab issue? Select an incident category below:
            </p>

            <div className="incident-chips-grid">
              {[
                { id: 'Projector / AV', label: 'AV / Projector Fault', icon: <Tv size={15} /> },
                { id: 'Electrical / Fans / Lights', label: 'Electrical / Power', icon: <Zap size={15} /> },
                { id: 'Internet / Wi-Fi', label: 'Wi-Fi / LAN Down', icon: <Wifi size={15} /> },
                { id: 'Furniture / Seating', label: 'Broken Seating', icon: <Armchair size={15} /> },
                { id: 'Cleanliness', label: 'Sanitation Item', icon: <Sparkles size={15} /> },
                { id: 'Safety Hazard', label: 'Safety Hazard (Urgent)', icon: <AlertTriangle size={15} /> }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`incident-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Inline Fast Ticket Expander */}
            {selectedCategory && (
              <form onSubmit={handleQuickSubmit} className="fast-ticket-box">
                <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Filing: {selectedCategory}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '0.6rem' }}>
                  <input
                    type="text"
                    placeholder="Brief description (e.g. HDMI port broken)"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    required
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '5px',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Room/Lab"
                    value={quickRoom}
                    onChange={(e) => setQuickRoom(e.target.value)}
                    required
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '5px',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submittingIssue}
                  >
                    <Send size={13} />
                    Dispatch Ticket
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. ACTIVE ESCALATION PIPELINE */}
          <div className="panel" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                Active Incident Pipeline & SLA Timers
              </h3>
              <span className="count-chip font-mono">{studentIssues.length} Tickets</span>
            </div>

            {studentIssues.length > 0 ? (
              studentIssues.map(issue => {
                const currentStageName = STAGES[issue.stage] || 'CR';
                const isResolved = issue.status === 'Resolved';
                return (
                  <div 
                    key={issue.id} 
                    className="pipeline-card"
                    onClick={() => onSelectIssue(issue)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem' }}>
                          <span className={`priority-dot ${issue.priority}`}></span>
                          <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            #{issue.id}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>· {issue.category}</span>
                        </div>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {issue.title}
                        </h4>
                      </div>

                      <span className={`badge-pill status-${issue.status}`}>
                        {issue.status}
                      </span>
                    </div>

                    {/* Progressive Escalation Stepper Bar */}
                    <div className="pipeline-stepper">
                      <div className={`pipeline-step-node ${issue.stage >= 0 ? 'completed' : ''}`}></div>
                      <div className={`pipeline-step-node ${issue.stage >= 1 ? 'completed' : issue.stage === 0 && !isResolved ? 'active' : ''}`}></div>
                      <div className={`pipeline-step-node ${issue.stage >= 2 ? 'completed' : issue.stage === 1 && !isResolved ? 'active' : ''}`}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      <span>
                        Current Authority: <strong style={{ color: 'var(--text-main)' }}>{currentStageName}</strong>
                      </span>

                      {!isResolved ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning-text)' }}>
                          <Clock size={11} /> Auto-escalation active ({issue.daysElapsed}d in tier)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success-text)' }}>✓ Successfully Resolved</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.84rem' }}>
                No active tickets in progress. Use the pad above to report classroom faults.
              </div>
            )}
          </div>
        </div>

        {/* Right: Academic Assistant & Campus Authority Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Quick Academic Card */}
          <div className="panel" style={{ padding: '1.2rem' }}>
            <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              Academic Companion Profile
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Student Name:</span>
                <strong>{user.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Program:</span>
                <span>{user.department} ({user.semester_or_title})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Attendance Status:</span>
                <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>88.4% (Eligible)</span>
              </div>
            </div>
          </div>

          {/* College Hierarchy Resolution Map */}
          <div className="panel" style={{ padding: '1.2rem' }}>
            <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              Department Escalation Directory
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
              <div style={{ padding: '0.6rem', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Tier 1: Class Representative</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>Handles immediate desk, seating & room fixture issues.</div>
              </div>
              <div style={{ padding: '0.6rem', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Tier 2: Faculty Advisor (CT)</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>Handles lab equipment, AC, projector replacements.</div>
              </div>
              <div style={{ padding: '0.6rem', background: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Tier 3: Head of Department (HOD)</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>Handles critical security, structural or unresolved issues.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
