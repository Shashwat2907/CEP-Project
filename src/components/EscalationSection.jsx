import React, { useState, useEffect } from 'react';
import { Check, ArrowDown, BellRing, Clock, AlertTriangle } from 'lucide-react';

export default function EscalationSection() {
  const [activeStep, setActiveStep] = useState(1);

  // Cycle preview step for interactive demonstration
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev === 0 ? 1 : prev === 1 ? 2 : 0));
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="section features-section" id="features">
      <div className="section-container">
        <div className="features-split">
          <div className="features-text">
            <h2 className="section-title text-left">Automatic Escalation</h2>
            <p className="section-description text-left">
              No problem is left unresolved or forgotten in an inbox. If an issue is delayed, our system automatically escalates it up the ladder.
            </p>

            <ul className="feature-list">
              <li>
                <div className="icon-box">
                  <Check size={20} />
                </div>
                <div>
                  <h4>1. CR Level</h4>
                  <p>Basic classroom issues are addressed directly by your elected Class Representative.</p>
                </div>
              </li>
              <li>
                <div className="icon-box">
                  <Check size={20} />
                </div>
                <div>
                  <h4>2. Class Teacher (CT)</h4>
                  <p>If not acknowledged or acted upon within 2 days, the complaint forwards automatically to the Class Teacher.</p>
                </div>
              </li>
              <li>
                <div className="icon-box">
                  <Check size={20} />
                </div>
                <div>
                  <h4>3. HOD Escalation</h4>
                  <p>Critical safety risks or stubborn bottlenecks reach the Head of Department with top priority.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="features-visual">
            <div className="status-preview-box">
              <div className="preview-header">
                <span>Live Escalation Engine</span>
                <span style={{ color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BellRing size={14} /> Active Monitoring
                </span>
              </div>

              <div className={`status-item ${activeStep === 0 ? 'active' : ''}`}>
                <span className="priority-dot warning"></span>
                <div className="status-info">
                  <strong>Stage 1: Pending CR Action</strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> 48 hours SLA threshold reached
                  </span>
                </div>
              </div>

              <div className="escalation-arrow">
                <ArrowDown size={22} />
              </div>

              <div className={`status-item ${activeStep === 1 ? 'active' : ''}`}>
                <span className="priority-dot High"></span>
                <div className="status-info">
                  <strong>Stage 2: Escalated to Class Teacher</strong>
                  <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BellRing size={12} /> Urgent notification dispatched to Faculty
                  </span>
                </div>
              </div>

              <div className="escalation-arrow">
                <ArrowDown size={22} />
              </div>

              <div className={`status-item ${activeStep === 2 ? 'active' : ''}`}>
                <span className="priority-dot Critical"></span>
                <div className="status-info">
                  <strong>Stage 3: Head of Department (HOD)</strong>
                  <span style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Direct department-head resolution protocol
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
