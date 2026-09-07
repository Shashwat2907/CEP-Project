import React from 'react';
import { Layers, Clock, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
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
        title="View all complaints"
      >
        <div className="stat-top">
          <div className="stat-icon">
            <Layers size={15} />
          </div>
        </div>
        <div className="stat-value" id="statTotal">{stats.total}</div>
        <div className="stat-label">Total Tickets</div>
      </div>

      <div 
        className={`stat-card ${statusFilter === 'Pending' ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('Pending')}
        title="Filter by Pending action"
      >
        <div className="stat-top">
          <div className="stat-icon" style={{ color: 'var(--warning-text)' }}>
            <Clock size={15} />
          </div>
        </div>
        <div className="stat-value" id="statPending">{stats.pending}</div>
        <div className="stat-label">Pending Action</div>
      </div>

      <div 
        className={`stat-card ${statusFilter === 'InProgress' ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('InProgress')}
        title="Filter by In Progress"
      >
        <div className="stat-top">
          <div className="stat-icon">
            <Activity size={15} />
          </div>
        </div>
        <div className="stat-value" id="statProgress">{stats.progress}</div>
        <div className="stat-label">Under Investigation</div>
      </div>

      <div 
        className={`stat-card ${statusFilter === 'Resolved' ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('Resolved')}
        title="Filter by Resolved"
      >
        <div className="stat-top">
          <div className="stat-icon" style={{ color: 'var(--success-text)' }}>
            <CheckCircle2 size={15} />
          </div>
        </div>
        <div className="stat-value" id="statResolved">{stats.resolved}</div>
        <div className="stat-label">Resolved Closed</div>
      </div>

      <div 
        className={`stat-card ${escalatedOnly ? 'active-filter' : ''}`}
        onClick={() => handleStatClick('escalated')}
        title="Filter by Escalated to HOD"
      >
        <div className="stat-top">
          <div className="stat-icon" style={{ color: 'var(--error-text)' }}>
            <AlertTriangle size={15} />
          </div>
        </div>
        <div className="stat-value" id="statEscalated">{stats.escalated}</div>
        <div className="stat-label">Escalated HOD</div>
      </div>
    </div>
  );
}
