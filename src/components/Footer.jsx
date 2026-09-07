import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Footer({ onNavigateDashboard }) {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-brand">
          <a href="#home" className="logo">
            <span className="logo-icon">
              <ShieldAlert size={18} />
            </span>
            CampusResolve
          </a>
          <p>
            Smart, accountable complaint management system for colleges, labs, and modern academic institutions.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Platform</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateDashboard(); }}>Dashboard</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Escalation Tiers</a>
            <a href="#priority" onClick={onNavigateDashboard}>Priority Matrix</a>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <a href="#" onClick={(e) => e.preventDefault()}>Help Desk</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Guidelines</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Campus IT Policy</a>
          </div>

          <div className="footer-column">
            <h4>Institutional</h4>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()}>College Portal</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} CampusResolve. Designed for modern university infrastructure.</p>
      </div>
    </footer>
  );
}
