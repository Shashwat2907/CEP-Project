import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { STAGES } from '../data/mockData';
import { useIssues } from '../context/IssueContext';

export default function IssueRow({ issue, onSelectIssue }) {
  const { toggleUpvote } = useIssues();

  const stageAbbr = (stageName) => {
    if (!stageName) return 'CR';
    return stageName.length <= 3
      ? stageName
      : stageName.split(' ').map(w => w[0]).join('');
  };

  const timeAgo = (days) => {
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const statusLabel = (status) => {
    return status === 'InProgress' ? 'In Progress' : status;
  };

  const handleUpvote = (e) => {
    e.stopPropagation();
    toggleUpvote(issue.id);
  };

  const currentStageName = STAGES[issue.stage] || 'CR';

  return (
    <div 
      className="issue-row" 
      onClick={() => onSelectIssue(issue)}
      data-id={issue.id}
    >
      <span
        className={`priority-dot ${issue.priority}`}
        title={`${issue.priority} Priority`}
      ></span>

      <div className="issue-main">
        <div className="issue-title">{issue.title}</div>
        <div className="issue-meta">
          <span className="font-mono">#{issue.id}</span>
          <span className="sep">·</span>
          <span>{issue.category}</span>
          <span className="sep">·</span>
          <span>{timeAgo(issue.daysElapsed)}</span>
        </div>
      </div>

      <span className={`badge-pill status-${issue.status}`}>
        {statusLabel(issue.status)}
      </span>

      <span className="assignee-chip" title={`Assigned: ${currentStageName}`}>
        <span className="assignee-icon font-mono">{stageAbbr(currentStageName)}</span>
        {currentStageName}
      </span>

      <span className="issue-days">
        <strong className="font-mono">{issue.daysElapsed}d</strong>
        in tier
      </span>

      <button
        type="button"
        className="upvote-btn"
        onClick={handleUpvote}
        title="Endorse priority"
      >
        <ThumbsUp size={11} />
        <span>{issue.upvotes || 0}</span>
      </button>
    </div>
  );
}
