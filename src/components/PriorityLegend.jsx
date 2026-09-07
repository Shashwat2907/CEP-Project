import React from 'react';
import { Shield } from 'lucide-react';

export default function PriorityLegend() {
  return (
    <div className="panel priority-legend" id="priority">
      <h3>
        <Shield size={16} />
        Priority Matrix
      </h3>

      <div className="priority-row">
        <span className="priority-dot Critical"></span>
        <div>
          <strong>Critical</strong>
          <p>Safety risk or halts academic delivery. Routed immediately to Department Head (HOD).</p>
        </div>
      </div>

      <div className="priority-row">
        <span className="priority-dot High"></span>
        <div>
          <strong>High</strong>
          <p>Disrupts room lecture/lab session. Auto-escalates to Class Teacher within 24 hours.</p>
        </div>
      </div>

      <div className="priority-row">
        <span className="priority-dot Medium"></span>
        <div>
          <strong>Medium</strong>
          <p>Functional inconvenience. Auto-escalates after 48 hours of inaction.</p>
        </div>
      </div>

      <div className="priority-row">
        <span className="priority-dot Low"></span>
        <div>
          <strong>Low</strong>
          <p>Minor wear or maintenance item. Handled at the Class Representative level.</p>
        </div>
      </div>
    </div>
  );
}
