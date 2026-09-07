import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, LayoutDashboard } from 'lucide-react';

export default function Navbar({ onNavigateDashboard }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <a href="#home" className="logo">
          <span className="logo-icon">
            <ShieldAlert size={18} />
          </span>
          CampusResolve
        </a>

        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Smart Escalation</a>
          <a href="#priority" onClick={onNavigateDashboard}>Priority Matrix</a>
        </div>

        <div className="nav-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={onNavigateDashboard}
            id="navStudentLoginBtn"
          >
            <LayoutDashboard size={16} />
            Student Login
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onNavigateDashboard}
            id="navReportIssueBtn"
          >
            Report Issue
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
