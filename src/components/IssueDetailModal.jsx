import React, { useEffect } from 'react';
import { X, Check, ArrowRight, CheckCircle2, User, Calendar, Tag, ThumbsUp } from 'lucide-react';
import { STAGES } from '../data/mockData';
import { useIssues } from '../context/IssueContext';

export default function IssueDetailModal({ issue, onClose }) {
  const { resolveIssue, escalateIssue, toggleUpvote } = useIssues();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!issue) return null;

  const isResolved = issue.status === 'Resolved';
  const canEscalate = !isResolved && issue.stage < STAGES.length - 1;
  const nextStageName = canEscalate ? STAGES[issue.stage + 1] : null;

  const timeAgo = (days) => {
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const handleResolve = () => {
    resolveIssue(issue.id);
    onClose();
  };

  const handleEscalate = () => {
    escalateIssue(issue.id);
    onClose();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id="issueDetailModal"
    >
      <div className="modal-box">
        <div className="modal-header">
          <h2>{issue.title}</h2>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-id">
            #{issue.id} · Reported by <strong>{issue.reportedBy}</strong> on {issue.date}
          </div>

          <div className="detail-meta-row">
            <span className={`badge-pill status-${issue.status}`}>
              {issue.status === 'InProgress' ? 'In Progress' : issue.status}
            </span>

            <span className="badge-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
              <span className={`priority-dot ${issue.priority}`}></span>
              {issue.priority} Priority
            </span>

            <span className="badge-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
              <Tag size={12} />
              {issue.category}
            </span>

            <button
              type="button"
              className="badge-pill"
              onClick={() => toggleUpvote(issue.id)}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary-hover)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                cursor: 'pointer'
              }}
            >
              <ThumbsUp size={12} />
              {issue.upvotes || 0} Upvotes
            </button>
          </div>

          <p className="detail-description">
            {issue.description}
          </p>

          {issue.imagePreview && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
                Attached Evidence:
              </div>
              <img
                src={issue.imagePreview}
                alt="Attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: '220px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
          )}

          <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem', color: 'var(--text-main)' }}>
            Resolution Stepper & Escalation Trail
          </h3>

          <div className="timeline">
            {STAGES.map((stageName, idx) => {
              let cls = 'pending';
              let icon = idx + 1;
              let sub = 'Pending escalation';

              if (isResolved && idx <= issue.stage) {
                cls = 'done';
                icon = <Check size={16} />;
                sub = idx === issue.stage ? 'Successfully resolved at this level' : 'Cleared through this level';
              } else if (idx < issue.stage) {
                cls = 'done';
                icon = <Check size={16} />;
                sub = 'Escalated to next level due to SLA timer';
              } else if (idx === issue.stage) {
                cls = 'current';
                sub = `Currently active here · ${timeAgo(issue.daysElapsed)}`;
              }

              return (
                <div key={stageName} className={`timeline-stage ${cls}`}>
                  <div className="timeline-connector"></div>
                  <div className="timeline-node">{icon}</div>
                  <div className="timeline-content">
                    <strong>{stageName}</strong>
                    <span>{sub}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="detail-actions">
            {isResolved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.92rem' }}>
                <CheckCircle2 size={18} />
                This complaint has been officially marked as resolved.
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResolve}
                  id="markResolvedBtn"
                >
                  <Check size={16} />
                  Mark Resolved
                </button>

                {canEscalate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEscalate}
                    id="escalateBtn"
                  >
                    Escalate to {nextStageName}
                    <ArrowRight size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
