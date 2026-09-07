import React from 'react';
import { Shield, ArrowRight, LayoutDashboard } from 'lucide-react';

export default function Navbar({ onNavigateDashboard }) {
  return (
    <nav className="landing-navbar">
      <div className="nav-container">
        <a href="#home" className="logo">
          <span className="logo-icon">
            <Shield size={16} />
          </span>
          CampusResolve
        </a>

        <div className="nav-links">
          <a href="#how-it-works">Architecture</a>
          <a href="#features">Escalation Engine</a>
          <a href="#priority" onClick={onNavigateDashboard}>Priority Matrix</a>
        </div>

        <div className="nav-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onNavigateDashboard}
            id="navDashboardBtn"
          >
            <LayoutDashboard size={15} />
            Dashboard
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onNavigateDashboard}
            id="navGetStartedBtn"
          >
            Launch Platform
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
