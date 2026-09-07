import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function CTASection({ onNavigateDashboard }) {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <h2>Experience Integrated Academic Operations</h2>
        <p>
          A single platform connecting classroom realities with administrative responsiveness.
          Designed specifically for students, professors, and department heads.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onNavigateDashboard}
          id="ctaGoDashboardBtn"
        >
          Open Platform Console
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
