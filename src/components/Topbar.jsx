import React from 'react';
import { Search, Bell, Plus, X, Menu, GraduationCap, UserCheck, Radio } from 'lucide-react';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ onOpenRaiseModal, onToggleMobileSidebar }) {
  const { stats, search, setSearch, showToast } = useIssues();
  const { user, role, switchRole, isTeacher, isStudent } = useAuth();

  const openCount = stats.pending + stats.progress;

  const handleSetRole = (newRole) => {
    if (newRole !== role) {
      switchRole(newRole);
      showToast(
        'Workspace Switched',
        newRole === 'teacher'
          ? 'Switched to Faculty Console (Prof. Rajesh Verma)'
          : 'Switched to Student Companion (Aditi Sharma)'
      );
    }
  };

  return (
    <header className="dashboard-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className="icon-btn mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          style={{ display: 'none' }}
          aria-label="Toggle navigation"
        >
          <Menu size={16} />
        </button>

        {/* Prominent Role Switcher Segmented Control */}
        <div className="role-segmented-toggle">
          <button
            type="button"
            className={`role-toggle-btn ${isStudent ? 'active' : ''}`}
            onClick={() => handleSetRole('student')}
            id="roleBtnStudent"
          >
            <UserCheck size={13} />
            <span>Student Companion</span>
          </button>
          <button
            type="button"
            className={`role-toggle-btn ${isTeacher ? 'active' : ''}`}
            onClick={() => handleSetRole('teacher')}
            id="roleBtnTeacher"
          >
            <GraduationCap size={13} />
            <span>Faculty Console</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          <span className="priority-dot Low"></span>
          <span>Campus Grid: <strong>Term Fall 2026</strong></span>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            id="searchInput"
            placeholder="Search tickets, rooms, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearch('')}
              title="Clear"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button 
          type="button" 
          className="icon-btn" 
          title={`${stats.escalated} escalated tickets`}
          onClick={() => alert(`Academic Operations: ${stats.escalated} issues escalated to department head.`)}
        >
          <Bell size={15} />
          {stats.escalated > 0 && <span className="dot"></span>}
        </button>

        {isStudent && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenRaiseModal}
            id="topbarRaiseBtn"
          >
            <Plus size={14} />
            Report Issue
          </button>
        )}
      </div>
    </header>
  );
}
