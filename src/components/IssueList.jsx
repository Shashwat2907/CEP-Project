import React from 'react';
import { Inbox, RotateCcw } from 'lucide-react';
import IssueRow from './IssueRow';
import { useIssues } from '../context/IssueContext';

export default function IssueList({ onSelectIssue, onOpenRaiseModal }) {
  const {
    filteredIssues,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sortBy,
    setSortBy,
    resetFilters,
    search
  } = useIssues();

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          Classroom Issues
          <span className="count-chip">{filteredIssues.length} found</span>
        </h2>

        <div className="filter-row">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            id="filterStatus"
            aria-label="Filter by Status"
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            id="filterPriority"
            aria-label="Filter by Priority"
          >
            <option value="all">All priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            id="sortBy"
            aria-label="Sort issues"
          >
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">By priority</option>
            <option value="upvotes">Most upvoted</option>
          </select>
        </div>
      </div>

      <div className="issues-list" id="issuesList">
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => (
            <IssueRow 
              key={issue.id} 
              issue={issue} 
              onSelectIssue={onSelectIssue} 
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Inbox size={42} />
            </div>
            <h3>No issues matched your criteria</h3>
            <p>
              {search
                ? `No complaints matched "${search}". Try checking your spelling or clearing filters.`
                : 'There are no complaints under the selected status or priority filter.'}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={resetFilters}
              >
                <RotateCcw size={15} />
                Clear Filters
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={onOpenRaiseModal}
              >
                Raise an Issue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
