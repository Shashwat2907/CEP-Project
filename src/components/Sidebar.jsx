import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  ListFilter, 
  ArrowLeft, 
  Shield, 
  FileText,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ 
  onNavigateHome, 
  activeNav, 
  setActiveNav,
  mobileOpen,
  setMobileOpen 
}) {
  const { stats } = useIssues();
  const { user, isTeacher, isStudent } = useAuth();

  const handleNavClick = (navKey) => {
    setActiveNav(navKey);
    if (setMobileOpen) setMobileOpen(false);
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
        <div className="sidebar-label">Navigation</div>

        <button
          type="button"
          className={`sidebar-link ${activeNav === 'desk' ? 'active' : ''}`}
          onClick={() => handleNavClick('desk')}
          id="sidebarDeskBtn"
        >
          <LayoutDashboard size={15} />
          <span>{isTeacher ? 'Faculty Terminal' : 'Student Companion'}</span>
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
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">
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
