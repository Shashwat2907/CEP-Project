import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  ListFilter, 
  ArrowLeft, 
  Shield, 
  FileText,
  HelpCircle,
  Clock,
  PackageSearch,
  LogOut,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ 
  onNavigateHome, 
  activeNav, 
  setActiveNav,
  mobileOpen,
  setMobileOpen,
  onLogout
}) {
  const { stats } = useIssues();
  const { user, isTeacher, isStudent, logout } = useAuth();

  const handleNavClick = (navKey) => {
    setActiveNav(navKey);
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleLogoutClick = () => {
    logout();
    if (onLogout) onLogout();
  };

  const currentUser = user || {
    name: 'Rahul Verma',
    initials: 'RV',
    department: 'CSE',
    semester_or_title: 'Sem 5'
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
            <Shield size={16} />
          </span>
          CampusResolve
        </a>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{isTeacher ? 'Faculty Portal' : 'Student Portal'}</span>
          <span className="badge-pill" style={{
            fontSize: '0.65rem',
            padding: '0.15rem 0.45rem',
            background: isTeacher ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            color: isTeacher ? '#facc15' : '#60a5fa',
            borderColor: isTeacher ? 'rgba(234, 179, 8, 0.3)' : 'rgba(59, 130, 246, 0.3)'
          }}>
            {isTeacher ? 'FACULTY' : 'STUDENT'}
          </span>
        </div>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'desk' ? 'active' : ''}`}
          onClick={() => handleNavClick('desk')}
          id="sidebarDeskBtn"
        >
          <LayoutDashboard size={15} />
          <span>{isTeacher ? 'Faculty Console' : 'Student Companion'}</span>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'attendance' ? 'active' : ''}`}
          onClick={() => handleNavClick('attendance')}
          id="sidebarAttendanceNavBtn"
        >
          <Radio size={15} />
          <span>Geofence Attendance</span>
          <span className="sidebar-badge">Live</span>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'tickets' ? 'active' : ''}`}
          onClick={() => handleNavClick('tickets')}
          id="sidebarTicketsBtn"
        >
          <ListFilter size={15} />
          <span>{isTeacher ? 'Department Tickets' : 'Escalation Pipeline'}</span>
          <span className="sidebar-badge">{stats.total}</span>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'lost-found' ? 'active' : ''}`}
          onClick={() => handleNavClick('lost-found')}
          id="sidebarLostFoundBtn"
        >
          <PackageSearch size={15} />
          <span>Lost & Found</span>
          <span className="sidebar-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>New</span>
        </button>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'directory' ? 'active' : ''}`}
          onClick={() => handleNavClick('directory')}
          id="sidebarDirectoryBtn"
        >
          <FileText size={15} />
          <span>Campus Authority Directory</span>
        </button>

        <div className="sidebar-label">Institutional</div>

        <button
          type="button"
          className="sidebar-link"
          onClick={() => alert('SLA Governance: Tier 1 (CR) 48h SLA -> Tier 2 (CT) 48h SLA -> Tier 3 (HOD) Final Resolution.')}
        >
          <Clock size={15} />
          <span>SLA & Escalation Rules</span>
        </button>

        <button
          type="button"
          className="sidebar-link"
          onClick={onNavigateHome}
          id="sidebarBackHomeBtn"
        >
          <ArrowLeft size={15} />
          <span>Back to Landing</span>
        </button>

        <button
          type="button"
          className="sidebar-link"
          onClick={handleLogoutClick}
          id="sidebarLogoutBtn"
          style={{ color: 'var(--error-text)', marginTop: '0.5rem' }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">
          {currentUser.initials || 'U'}
        </div>
        <div className="sidebar-user-info">
          <strong>{currentUser.name}</strong>
          <span>{currentUser.department} • {currentUser.semester_or_title}</span>
        </div>
      </div>
    </aside>
  );
}
