import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function CTASection({ onNavigateDashboard }) {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <h2>Ready to improve your campus experience?</h2>
        <p>
          Join thousands of students and faculty members resolving classroom infrastructure and
          academic complaints with automated clarity.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onNavigateDashboard}
          id="ctaGoDashboardBtn"
        >
          <Sparkles size={18} />
          Go to Student Dashboard
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
