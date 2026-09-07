import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer({ onNavigateDashboard }) {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-brand">
          <a href="#home" className="logo">
            <span className="logo-icon">
              <Shield size={16} />
            </span>
            CampusResolve
          </a>
          <p>
            Unified campus helper and academic administrative management system.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>System</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateDashboard(); }}>Dashboard Console</a>
            <a href="#how-it-works">Architecture</a>
            <a href="#features">Escalation Protocol</a>
          </div>

          <div className="footer-column">
            <h4>Modules</h4>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateDashboard(); }}>Issue Helper</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateDashboard(); }}>Geofenced Attendance</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateDashboard(); }}>Faculty Roster</a>
          </div>

          <div className="footer-column">
            <h4>Governance</h4>
            <a href="#" onClick={(e) => e.preventDefault()}>Institutional Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Data Integrity</a>
            <a href="#" onClick={(e) => e.preventDefault()}>SLA Matrix</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} CampusResolve. Academic operations and student management system.</p>
      </div>
    </footer>
  );
}
