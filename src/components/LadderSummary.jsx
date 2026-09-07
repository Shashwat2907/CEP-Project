import React from 'react';
import { Layers } from 'lucide-react';
import { STAGES } from '../data/mockData';
import { useIssues } from '../context/IssueContext';

export default function LadderSummary() {
  const { stats } = useIssues();

  return (
    <div className="panel escalation-summary">
      <h3>
        <Layers size={18} color="var(--primary-hover)" />
        Escalation Ladder
      </h3>

      <div className="ladder" id="ladderSummary">
        {STAGES.map((stageName, idx) => {
          const count = stats.ladderCounts[idx] || 0;
          const isFilled = count > 0;

          return (
            <div 
              key={stageName} 
              className={`ladder-stage ${isFilled ? 'filled' : ''}`}
            >
              <div className="ladder-line"></div>
              <div className="ladder-node">{idx + 1}</div>
              <div className="ladder-info">
                <strong>{stageName}</strong>
                <span>
                  {count} active issue{count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="ladder-count">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
