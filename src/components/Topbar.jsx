import React from 'react';
import { Search, Bell, Plus, X, Menu, GraduationCap, UserCheck, LogOut, Shield } from 'lucide-react';
import { useIssues } from '../context/IssueContext';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ onOpenRaiseModal, onToggleMobileSidebar, onLogout }) {
  const { stats, search, setSearch } = useIssues();
  const { user, isTeacher, isStudent, logout } = useAuth();

  const handleLogoutClick = () => {
    logout();
    if (onLogout) onLogout();
  };

  const currentUser = user || { name: 'Rahul Verma', role: 'student' };

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

        {/* Authenticated Role Indicator Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            background: isTeacher ? 'rgba(234, 179, 8, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            border: isTeacher ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
            color: isTeacher ? '#facc15' : '#60a5fa',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            {isTeacher ? <GraduationCap size={14} /> : <UserCheck size={14} />}
            <span>{isTeacher ? 'Faculty Console' : 'Student Companion'}</span>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Logged in as <strong>{currentUser.name}</strong>
          </span>
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

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleLogoutClick}
          title="Sign Out"
          style={{ gap: '0.35rem' }}
        >
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </header>
  );
}
