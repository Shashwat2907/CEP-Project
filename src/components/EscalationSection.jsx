import React, { useState, useEffect } from 'react';
import { Check, ArrowDown, Radio, Clock, AlertTriangle } from 'lucide-react';

export default function EscalationSection() {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev === 0 ? 1 : prev === 1 ? 2 : 0));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="section features-section" id="features">
      <div className="section-container">
        <div className="features-split">
          <div className="features-text">
            <h2 className="section-title text-left">Automated Escalation Protocol</h2>
            <p className="section-description text-left">
              Complaints follow strict accountability timers. If an issue remains unaddressed, it automatically advances through administrative tiers.
            </p>

            <ul className="feature-list">
              <li>
                <div className="icon-box">
                  <Check size={18} />
                </div>
                <div>
                  <h4>1. Class Representative (CR) Level</h4>
                  <p>Initial evaluation for basic classroom fixtures, seating, and common peer concerns.</p>
                </div>
              </li>
              <li>
                <div className="icon-box">
                  <Check size={18} />
                </div>
                <div>
                  <h4>2. Faculty / Class Teacher (CT)</h4>
                  <p>Automatically triggered after 48 hours of inaction for formal departmental intervention.</p>
                </div>
              </li>
              <li>
                <div className="icon-box">
                  <Check size={18} />
                </div>
                <div>
                  <h4>3. Head of Department (HOD)</h4>
                  <p>Critical infrastructure disruptions and safety hazards bypass lower tiers directly to department heads.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="features-visual">
            <div className="status-preview-box">
              <div className="preview-header">
                <span>Protocol Demonstration</span>
                <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Radio size={13} /> Automated Router
                </span>
              </div>

              <div className={`status-item ${activeStep === 0 ? 'active' : ''}`}>
                <span className="priority-dot Medium"></span>
                <div className="status-info">
                  <strong>Stage 1: Pending CR Action</strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> 48-hour response window
                  </span>
                </div>
              </div>

              <div className="escalation-arrow">
                <ArrowDown size={18} />
              </div>

              <div className={`status-item ${activeStep === 1 ? 'active' : ''}`}>
                <span className="priority-dot High"></span>
                <div className="status-info">
                  <strong>Stage 2: Transferred to Class Teacher</strong>
                  <span style={{ color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Automated SLA escalation dispatched
                  </span>
                </div>
              </div>

              <div className="escalation-arrow">
                <ArrowDown size={18} />
              </div>

              <div className={`status-item ${activeStep === 2 ? 'active' : ''}`}>
                <span className="priority-dot Critical"></span>
                <div className="status-info">
                  <strong>Stage 3: Head of Department (HOD)</strong>
                  <span style={{ color: 'var(--error-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    High-priority administrative ticket
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
