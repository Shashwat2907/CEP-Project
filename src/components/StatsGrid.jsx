import React from 'react';
import { Layers, Clock, Activity, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useIssues } from '../context/IssueContext';

export default function StatsGrid() {
  const { stats, statusFilter, setStatusFilter, escalatedOnly, setEscalatedOnly } = useIssues();

  const handleStatClick = (type) => {
    if (type === 'all') {
      setStatusFilter('all');
      setEscalatedOnly(false);
    } else if (type === 'Pending') {
      setStatusFilter('Pending');
      setEscalatedOnly(false);
    } else if (type === 'InProgress') {
      setStatusFilter('InProgress');
      setEscalatedOnly(false);
    } else if (type === 'Resolved') {
      setStatusFilter('Resolved');
      setEscalatedOnly(false);
    } else if (type === 'escalated') {
      setEscalatedOnly(!escalatedOnly);
      setStatusFilter('all');
    }
  };

  return (
    <div className="stats-grid">
      <div 
        className={`stat-card ${statusFilter === 'all' && !escalatedOnly ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('all')}
        title="Click to view all issues"
      >
        <div className="stat-top">
          <div className="stat-icon total">
            <Layers size={18} />
          </div>
        </div>
        <div className="stat-value" id="statTotal">{stats.total}</div>
        <div className="stat-label">Total Issues</div>
      </div>

      <div 
        className={`stat-card ${statusFilter === 'Pending' ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('Pending')}
        title="Click to filter by Pending issues"
      >
        <div className="stat-top">
          <div className="stat-icon pending">
            <Clock size={18} />
          </div>
        </div>
        <div className="stat-value" id="statPending">{stats.pending}</div>
        <div className="stat-label">Pending (CR)</div>
      </div>

      <div 
        className={`stat-card ${statusFilter === 'InProgress' ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('InProgress')}
        title="Click to filter by In Progress issues"
      >
        <div className="stat-top">
          <div className="stat-icon progress">
            <Activity size={18} />
          </div>
        </div>
        <div className="stat-value" id="statProgress">{stats.progress}</div>
        <div className="stat-label">In Progress</div>
      </div>

      <div 
        className={`stat-card ${statusFilter === 'Resolved' ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('Resolved')}
        title="Click to filter by Resolved issues"
      >
        <div className="stat-top">
          <div className="stat-icon resolved">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="stat-value" id="statResolved">{stats.resolved}</div>
        <div className="stat-label">Resolved</div>
      </div>

      <div 
        className={`stat-card ${escalatedOnly ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('escalated')}
        title="Click to filter by Escalated issues"
      >
        <div className="stat-top">
          <div className="stat-icon escalated">
            <AlertOctagon size={18} />
          </div>
        </div>
        <div className="stat-value" id="statEscalated">{stats.escalated}</div>
        <div className="stat-label">Escalated</div>
      </div>
    </div>
  );
}
