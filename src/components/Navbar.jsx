import React from 'react';
import { Shield, ArrowRight, LayoutDashboard, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onNavigateDashboard, onNavigateLogin }) {
  const { isAuthenticated, isTeacher } = useAuth();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      onNavigateDashboard();
    } else if (onNavigateLogin) {
      onNavigateLogin();
    } else {
      window.location.hash = '#login';
    }
  };

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
          <a href="#priority" onClick={handleAuthAction}>Priority Matrix</a>
        </div>

        <div className="nav-actions">
          {isAuthenticated ? (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={onNavigateDashboard}
              id="navDashboardBtn"
            >
              <LayoutDashboard size={15} />
              {isTeacher ? 'Faculty Portal' : 'Student Portal'}
            </button>
          ) : (
            <>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleAuthAction}
                id="navLoginBtn"
              >
                <LogIn size={15} />
                Sign In
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAuthAction}
                id="navGetStartedBtn"
              >
                Launch Portal
                <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
