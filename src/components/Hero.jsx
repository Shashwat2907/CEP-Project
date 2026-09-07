import React from 'react';
import { ArrowRight, Zap, Shield, CheckCircle2, Navigation } from 'lucide-react';

export default function Hero({ onNavigateDashboard, onOpenRaiseModal }) {
  return (
    <header className="hero" id="home">
      <div className="hero-content">
        <div className="badge">
          <span className="badge-sparkle"></span>
          Integrated Academic Operations & Student Helper
        </div>

        <h1 className="hero-title">
          Campus utilities, issue resolution <br />
          and faculty operations. All in one place.
        </h1>

        <p className="hero-subtitle">
          Designed for modern colleges: automated 3-tier complaint escalation, geofenced classroom
          attendance validation, and instant academic coordination for students and instructors.
        </p>

        <div className="hero-buttons">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onNavigateDashboard}
            id="heroGoDashboardBtn"
          >
            Open Unified Platform
            <ArrowRight size={16} />
          </button>
          <a href="#how-it-works" className="btn btn-secondary btn-lg">
            System Architecture
          </a>
        </div>

        <div className="hero-stats-strip">
          <div className="hero-stat-item">
            <strong>&lt; 24h</strong>
            <span>Avg Escalation SLA</span>
          </div>
          <div className="hero-stat-item">
            <strong>100%</strong>
            <span>Geofenced Accuracy</span>
          </div>
          <div className="hero-stat-item">
            <strong>2-in-1</strong>
            <span>Student & Faculty Portal</span>
          </div>
        </div>
      </div>
    </header>
  );
}
