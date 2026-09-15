import React, { useState } from 'react';
import { 
  Shield, 
  GraduationCap, 
  UserCheck, 
  Lock, 
  Mail, 
  User, 
  Building, 
  ArrowRight, 
  Key, 
  AlertCircle, 
  CheckCircle2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';

export default function LoginPage({ onLoginSuccess, onNavigateHome }) {
  const { login, register, loginDemoUser, authError, setAuthError } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'faculty'

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science (CSE)');
  const [semesterOrTitle, setSemesterOrTitle] = useState('Semester 5');
  const [facultyCode, setFacultyCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [localSuccess, setLocalSuccess] = useState('');

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setAuthError('');
    setLocalSuccess('');
  };

  const handleRoleSwitch = (role) => {
    setSelectedRole(role);
    setAuthError('');
    setLocalSuccess('');
  };

  const handleQuickDemo = (roleType) => {
    setAuthError('');
    setLocalSuccess('');
    try {
      const user = loginDemoUser(roleType);
      setLocalSuccess(`Authenticated as ${user.name} (${roleType.toUpperCase()})`);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(user);
      }, 600);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLocalSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const user = await login({
          email: email.trim(),
          password: password.trim(),
          role: selectedRole
        });
        setLocalSuccess(`Welcome back, ${user.name}! Redirecting to portal...`);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user);
        }, 800);
      } else {
        const user = await register({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role: selectedRole,
          department,
          semester_or_title: semesterOrTitle,
          faculty_access_code: facultyCode.trim()
        });
        setLocalSuccess(`Account created! Logged in as ${user.name}`);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user);
        }, 800);
      }
    } catch (err) {
      console.error('Auth submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Accent Gradients */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Header Link */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <button
          type="button"
          onClick={onNavigateHome}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem' }}
        >
          <ArrowLeft size={14} />
          Back to Home
        </button>

        <a href="#home" className="logo" style={{ fontSize: '1.1rem' }}>
          <span className="logo-icon" style={{ width: '22px', height: '22px' }}>
            <Shield size={13} />
          </span>
          CampusResolve
        </a>
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '16px',
        padding: '2.2rem 2rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        zIndex: 1
      }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '0.8rem'
          }}>
            <Shield size={12} />
            Institutional Portal Access
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>
            {mode === 'login' ? 'Sign in to CampusResolve' : 'Create Campus Account'}
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
            {mode === 'login' 
              ? 'Select your role and authenticate to access your portal' 
              : 'Register for student or faculty portal access'}
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={13} style={{ color: '#facc15' }} />
              Quick Evaluation Login
            </span>
            <span style={{ color: 'var(--text-dim)' }}>One-click demo</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickDemo('student')}
              style={{ fontSize: '0.78rem', padding: '0.45rem' }}
            >
              <UserCheck size={13} />
              Student (Rahul)
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickDemo('faculty')}
              style={{ fontSize: '0.78rem', padding: '0.45rem' }}
            >
              <GraduationCap size={13} />
              Faculty (Prof. Rajesh)
            </button>
          </div>
        </div>

        {/* Role Segmented Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            className={`role-toggle-btn ${selectedRole === 'student' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('student')}
            style={{ padding: '0.55rem', borderRadius: '7px', fontSize: '0.84rem' }}
          >
            <UserCheck size={14} />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            className={`role-toggle-btn ${selectedRole === 'faculty' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('faculty')}
            style={{ padding: '0.55rem', borderRadius: '7px', fontSize: '0.84rem' }}
          >
            <GraduationCap size={14} />
            <span>Faculty Portal</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {mode === 'register' && (
            <div className="lf-form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 500 }}>Full Name *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={15} style={{ position: 'absolute', left: '0.8rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="lf-form-input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder={selectedRole === 'faculty' ? 'Prof. Rajesh Verma' : 'Rahul Verma'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="lf-form-group">
            <label style={{ fontSize: '0.82rem', fontWeight: 500 }}>College Email / ID *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={15} style={{ position: 'absolute', left: '0.8rem', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="lf-form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder={selectedRole === 'faculty' ? 'rajesh.verma@campus.edu' : 'rahul.verma@campus.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="lf-form-group">
            <label style={{ fontSize: '0.82rem', fontWeight: 500 }}>Password *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.8rem', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="lf-form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div className="lf-form-row">
                <div className="lf-form-group">
                  <label style={{ fontSize: '0.8rem' }}>Department</label>
                  <select
                    className="lf-form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="CSE">Computer Science (CSE)</option>
                    <option value="CSE & AI">CSE & AI</option>
                    <option value="ECE">Electronics (ECE)</option>
                    <option value="MECH">Mechanical (MECH)</option>
                    <option value="CIVIL">Civil Engineering</option>
                  </select>
                </div>

                <div className="lf-form-group">
                  <label style={{ fontSize: '0.8rem' }}>{selectedRole === 'faculty' ? 'Academic Designation' : 'Current Semester'}</label>
                  <select
                    className="lf-form-select"
                    value={semesterOrTitle}
                    onChange={(e) => setSemesterOrTitle(e.target.value)}
                  >
                    {selectedRole === 'faculty' ? (
                      <>
                        <option value="Associate Professor / HOD">Associate Professor / HOD</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Professor & Chair">Professor & Chair</option>
                        <option value="Class Teacher">Class Teacher</option>
                      </>
                    ) : (
                      <>
                        <option value="Sem 5">Semester 5</option>
                        <option value="Sem 1">Semester 1</option>
                        <option value="Sem 3">Semester 3</option>
                        <option value="Sem 7">Semester 7</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {selectedRole === 'faculty' && (
                <div className="lf-form-group" style={{ background: 'rgba(234, 179, 8, 0.08)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
                  <label style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Key size={13} />
                    Faculty Authorization Access Code *
                  </label>
                  <input
                    type="password"
                    className="lf-form-input"
                    style={{ marginTop: '0.3rem', background: 'var(--surface)' }}
                    placeholder="Enter code (Demo: FACULTY2026)"
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Required to prevent unauthorized student self-registration as faculty.
                  </span>
                </div>
              )}
            </>
          )}

          {/* Alert messages */}
          {authError && (
            <div style={{
              background: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
              color: 'var(--error-text)',
              padding: '0.75rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.45
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{authError}</div>
            </div>
          )}

          {localSuccess && (
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success-text)',
              padding: '0.75rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} />
              {localSuccess}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.4rem', gap: '0.5rem' }}
            disabled={submitting}
          >
            {submitting 
              ? 'Authenticating...' 
              : mode === 'login' 
                ? `Log in as ${selectedRole === 'faculty' ? 'Faculty' : 'Student'}` 
                : `Register ${selectedRole === 'faculty' ? 'Faculty' : 'Student'} Account`}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Mode Switch Footer */}
        <div style={{ marginTop: '1.4rem', textAlign: 'center', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
          {mode === 'login' ? (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Register here
              </button>
            </p>
          ) : (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Log in to portal
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Institutional Security Notice Footer */}
      <div style={{ marginTop: '1.5rem', fontSize: '0.76rem', color: 'var(--text-dim)', textAlign: 'center' }}>
        CampusResolve Enterprise SLA Governance • Role-Gated Encryption Protocol
      </div>
    </div>
  );
}
