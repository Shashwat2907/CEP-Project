import React, { useRef } from 'react';
import { Sparkles, ArrowRight, Play, CheckCircle2, Zap, Clock } from 'lucide-react';

export default function Hero({ onNavigateDashboard, onOpenRaiseModal }) {
  const glowRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!glowRef.current) return;
    const { clientX, clientY } = e;
    const moveX = (clientX / window.innerWidth - 0.5) * 60;
    const moveY = (clientY / window.innerHeight - 0.5) * 60;
    glowRef.current.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  };

  return (
    <header className="hero" id="home" onMouseMove={handleMouseMove}>
      <div className="hero-bg-glow" ref={glowRef}></div>

      <div className="hero-content">
        <div className="badge">
          <span className="badge-sparkle"></span>
          Intelligent Campus Escalation
        </div>

        <h1 className="hero-title">
          Resolving campus issues, <br />
          <span className="text-gradient">faster than ever.</span>
        </h1>

        <p className="hero-subtitle">
          Don't know whom to contact? Just report it. Our smart system automatically routes your
          problem to the right authority — CR, Class Teacher, or HOD — and tracks it until it's solved.
        </p>

        <div className="hero-buttons">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              onNavigateDashboard();
              if (onOpenRaiseModal) onOpenRaiseModal();
            }}
            id="heroRaiseIssueBtn"
          >
            <Zap size={18} />
            Raise an Issue Now
            <ArrowRight size={18} />
          </button>
          <a href="#how-it-works" className="btn btn-secondary btn-lg">
            See How It Works
          </a>
        </div>

        <div className="hero-stats-strip">
          <div className="hero-stat-item">
            <strong>&lt; 24h</strong>
            <span>Avg Response Time</span>
          </div>
          <div className="hero-stat-item">
            <strong>100%</strong>
            <span>Transparent Tracking</span>
          </div>
          <div className="hero-stat-item">
            <strong>3-Tier</strong>
            <span>Auto Escalation</span>
          </div>
        </div>
      </div>
    </header>
  );
}
