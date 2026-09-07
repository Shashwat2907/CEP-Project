import React, { useEffect } from 'react';
import { X, Check, ArrowRight, CheckCircle2, Tag, ThumbsUp } from 'lucide-react';
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
            <X size={16} />
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

            <span className="badge-pill" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <span className={`priority-dot ${issue.priority}`}></span>
              {issue.priority} Priority
            </span>

            <span className="badge-pill" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Tag size={11} />
              {issue.category}
            </span>

            <button
              type="button"
              className="badge-pill"
              onClick={() => toggleUpvote(issue.id)}
              style={{
                background: 'var(--surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <ThumbsUp size={11} />
              {issue.upvotes || 0} Endorsements
            </button>
          </div>

          <p className="detail-description">
            {issue.description}
          </p>

          {issue.imagePreview && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Attached Document / Evidence:
              </div>
              <img
                src={issue.imagePreview}
                alt="Evidence"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
          )}

          <h3 style={{ fontSize: '0.92rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Administrative Escalation Trail
          </h3>

          <div className="timeline">
            {STAGES.map((stageName, idx) => {
              let cls = 'pending';
              let icon = idx + 1;
              let sub = 'Not yet reached';

              if (isResolved && idx <= issue.stage) {
                cls = 'done';
                icon = <Check size={14} />;
                sub = idx === issue.stage ? 'Resolved at this tier' : 'Cleared through this tier';
              } else if (idx < issue.stage) {
                cls = 'done';
                icon = <Check size={14} />;
                sub = 'Advanced to next level';
              } else if (idx === issue.stage) {
                cls = 'current';
                sub = `Currently assigned here · ${timeAgo(issue.daysElapsed)}`;
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-text)', fontSize: '0.88rem' }}>
                <CheckCircle2 size={16} />
                This ticket has been officially resolved and closed.
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResolve}
                  id="markResolvedBtn"
                >
                  <Check size={14} />
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
                    <ArrowRight size={14} />
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
