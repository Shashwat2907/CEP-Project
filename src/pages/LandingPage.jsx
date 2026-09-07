import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import WorkflowSection from '../components/WorkflowSection';
import EscalationSection from '../components/EscalationSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';
import '../styles/landing.css';

export default function LandingPage({ onNavigateDashboard, onOpenRaiseModal }) {
  return (
    <div className="landing-wrapper">
      <Navbar onNavigateDashboard={onNavigateDashboard} />
      <Hero 
        onNavigateDashboard={onNavigateDashboard} 
        onOpenRaiseModal={onOpenRaiseModal} 
      />
      <WorkflowSection />
      <EscalationSection />
      <CTASection onNavigateDashboard={onNavigateDashboard} />
      <Footer onNavigateDashboard={onNavigateDashboard} />
    </div>
  );
}
