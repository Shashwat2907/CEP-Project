import React from 'react';
import { 
  LayoutDashboard, 
  ListFilter, 
  PlusCircle, 
  Clock, 
  TrendingUp, 
  Settings, 
  ArrowLeft,
  ShieldAlert,
  Radio,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ 
  onNavigateHome, 
  onOpenRaiseModal, 
  activeNav, 
  setActiveNav,
  mobileOpen,
  setMobileOpen 
}) {
  const { 
    stats, 
    setStatusFilter, 
    setEscalatedOnly, 
    resetFilters,
    statusFilter,
    escalatedOnly,
    showToast
  } = useIssues();

  const { user, role, switchRole, isTeacher, isStudent } = useAuth();

  const handleNavClick = (navKey, filterAction) => {
    setActiveNav(navKey);
    if (filterAction) filterAction();
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleToggleRole = () => {
    const nextRole = role === 'student' ? 'teacher' : 'student';
    switchRole(nextRole);
    showToast(
      'Role Switched',
      nextRole === 'teacher'
        ? 'Switched to Teacher / Faculty View (Prof. Rajesh Verma)'
        : 'Switched to Student View (Aditi Sharma)'
    );
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <a 
          href="#home" 
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          <span className="logo-icon">
            <ShieldAlert size={18} />
          </span>
          CampusResolve
        </a>
      </div>

      <nav className="sidebar-nav">
        {/* Role Badge Indicator & Switcher */}
        <div style={{ padding: '0 0.2rem 0.6rem' }}>
          <button
            type="button"
            className="role-switcher-btn"
            onClick={handleToggleRole}
            title="Click to toggle between Student and Teacher roles"
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isTeacher ? <GraduationCap size={15} color="var(--primary-hover)" /> : <UserCheck size={15} color="var(--success)" />}
              <span>{isTeacher ? 'Teacher Mode' : 'Student Mode'}</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Switch ⇄</span>
          </button>
        </div>

        <div className="sidebar-label">Main Applications</div>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'attendance' ? 'active' : ''}`}
          onClick={() => handleNavClick('attendance')}
          id="sidebarAttendanceBtn"
          style={{ 
            background: activeNav === 'attendance' ? 'var(--surface-active)' : 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)' 
          }}
        >
          <Radio size={18} color="var(--primary-hover)" />
          <span>Geofence Attendance</span>
          <span className="sidebar-badge" style={{ background: 'var(--primary)', color: 'white' }}>
            Live
          </span>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'overview' && !escalatedOnly && statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleNavClick('overview', resetFilters)}
          id="sidebarOverviewBtn"
        >
          <LayoutDashboard size={18} />
          Issues Overview
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'all' ? 'active' : ''}`}
          onClick={() => handleNavClick('all', resetFilters)}
          id="sidebarAllIssuesBtn"
        >
          <ListFilter size={18} />
          {isTeacher ? 'All Campus Complaints' : 'My Raised Issues'}
          <span className="sidebar-badge">{stats.total}</span>
        </button>

        {isStudent && (
          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              onOpenRaiseModal();
              if (setMobileOpen) setMobileOpen(false);
            }}
            id="sidebarRaiseBtn"
            style={{ color: 'var(--primary-hover)' }}
          >
            <PlusCircle size={18} />
            Raise Issue
          </button>
        )}

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'pending' || statusFilter === 'Pending' ? 'active' : ''}`}
          onClick={() => handleNavClick('pending', () => {
            setStatusFilter('Pending');
            setEscalatedOnly(false);
          })}
          id="sidebarPendingBtn"
        >
          <Clock size={18} />
          Pending Action
          <span className="sidebar-badge">{stats.pending}</span>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'escalated' || escalatedOnly ? 'active' : ''}`}
          onClick={() => handleNavClick('escalated', () => {
            setEscalatedOnly(true);
            setStatusFilter('all');
          })}
          id="sidebarEscalatedBtn"
        >
          <TrendingUp size={18} />
          Escalated to HOD
          <span className="sidebar-badge" style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#fca5a5' }}>
            {stats.escalated}
          </span>
        </button>

        <div className="sidebar-label">Navigation & Account</div>

        <button
          type="button"
          className="sidebar-link"
          onClick={onNavigateHome}
          id="sidebarBackHomeBtn"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="avatar" style={{ background: isTeacher ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'var(--gradient)' }}>
          {user.initials}
        </div>
        <div className="sidebar-user-info">
          <strong>{user.name}</strong>
          <span>{user.department} • {user.semester_or_title}</span>
        </div>
      </div>
    </aside>
  );
}
