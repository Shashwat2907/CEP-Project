import React from 'react';
import { PenSquare, GitFork, Activity } from 'lucide-react';

export default function WorkflowSection() {
  const steps = [
    {
      num: '01',
      icon: <PenSquare size={24} />,
      title: 'Raise Issue',
      desc: 'Select category (e.g. Projector down, Fan sparking). Add title, details, and an optional image attachment.'
    },
    {
      num: '02',
      icon: <GitFork size={24} />,
      title: 'Smart Routing',
      desc: 'Intelligent triage routes standard issues to the Class Representative, or critical safety hazards immediately to the HOD.'
    },
    {
      num: '03',
      icon: <Activity size={24} />,
      title: 'Live Tracking',
      desc: 'Watch real-time status as your issue progresses through the 3-tier timeline with automated SLA escalation.'
    }
  ];

  return (
    <section className="section" id="how-it-works">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Seamless Workflow</h2>
          <p className="section-description">
            From reporting to resolution, experience a transparent, accountable, and automated process.
          </p>
        </div>

        <div className="workflow-grid">
          {steps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <div className="workflow-card">
                <div className="step-number">{step.num}</div>
                <div className="workflow-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
              {idx < steps.length - 1 && <div className="workflow-connector"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
