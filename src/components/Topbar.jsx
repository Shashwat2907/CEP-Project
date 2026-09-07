import React from 'react';
import { Search, Bell, Plus, X, Menu, GraduationCap, UserCheck } from 'lucide-react';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ onOpenRaiseModal, onToggleMobileSidebar, activeNav, setActiveNav }) {
  const { stats, search, setSearch, showToast } = useIssues();
  const { user, role, switchRole, isTeacher, isStudent } = useAuth();

  const openCount = stats.pending + stats.progress;

  const handleToggleRole = () => {
    const nextRole = role === 'student' ? 'teacher' : 'student';
    switchRole(nextRole);
    showToast(
      'Role Switched',
      nextRole === 'teacher'
        ? 'Switched to Teacher Mode (Prof. Rajesh Verma)'
        : 'Switched to Student Mode (Aditi Sharma)'
    );
  };

  return (
    <header className="dashboard-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className="icon-btn mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          style={{ display: 'none' }}
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>
              {isTeacher 
                ? `Welcome, ${user.name}`
                : `Welcome back, ${user.name.split(' ')[0]}`}
            </h1>
            <span 
              className="badge-pill"
              style={{
                background: isTeacher ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isTeacher ? 'var(--warning)' : 'var(--success)',
                border: `1px solid ${isTeacher ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {isTeacher ? 'Teacher / Faculty' : 'Student'}
            </span>
          </div>

          <span>
            {activeNav === 'attendance'
              ? isTeacher 
                ? 'Geofence active session control & real-time attendance telemetry.'
                : 'Acquire your GPS coordinates to verify your classroom attendance.'
              : openCount === 0
                ? 'All caught up — no complaints require urgent attention.'
                : `You have ${openCount} active campus issue${openCount === 1 ? '' : 's'} in progress.`}
          </span>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Role Switcher Pill */}
        <button
          type="button"
          className="role-switcher-btn"
          onClick={handleToggleRole}
          id="topbarRoleSwitcher"
          title="Switch between Student and Teacher interface"
        >
          {isTeacher ? <GraduationCap size={15} color="var(--primary-hover)" /> : <UserCheck size={15} color="var(--success)" />}
          <span>Switch to {isTeacher ? 'Student' : 'Teacher'}</span>
        </button>

        {activeNav !== 'attendance' && (
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              id="searchInput"
              placeholder="Search issues, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <button 
          type="button" 
          className="icon-btn" 
          title={`${stats.escalated} escalated issues`}
          onClick={() => alert(`System Notifications: You have ${stats.escalated} issues escalated to HOD level.`)}
        >
          <Bell size={18} />
          {stats.escalated > 0 && <span className="dot"></span>}
        </button>

        {isStudent && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenRaiseModal}
            id="openRaiseIssueBtn"
          >
            <Plus size={16} />
            Raise Issue
          </button>
        )}
      </div>
    </header>
  );
}
