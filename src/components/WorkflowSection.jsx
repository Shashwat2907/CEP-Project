import React from 'react';
import { PenTool, Radio, ShieldCheck } from 'lucide-react';

export default function WorkflowSection() {
  const steps = [
    {
      num: '01',
      icon: <PenTool size={20} />,
      title: 'Student Issue Helper',
      desc: 'Students report classroom breakdowns, lab faults, or safety risks. The system assigns SLA timers and routes directly to the right authority.'
    },
    {
      num: '02',
      icon: <Radio size={20} />,
      title: 'Geofenced Attendance',
      desc: 'Instructors establish active perimeter perimeters. Students confirm physical presence through instant server-side geospatial validation.'
    },
    {
      num: '03',
      icon: <ShieldCheck size={20} />,
      title: 'Faculty Management',
      desc: 'A unified operations console for teachers and HODs: monitor live classroom rosters, manage student requests, and resolve escalated tickets.'
    }
  ];

  return (
    <section className="section" id="how-it-works">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Functional Architecture</h2>
          <p className="section-description">
            A cohesive operational stack supporting student welfare and administrative oversight.
          </p>
        </div>

        <div className="workflow-grid">
          {steps.map((step) => (
            <div className="workflow-card" key={step.num}>
              <div className="step-number">{step.num}</div>
              <div className="workflow-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
