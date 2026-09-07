import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function PriorityLegend() {
  return (
    <div className="panel priority-legend" id="priority">
      <h3>
        <ShieldAlert size={18} color="var(--primary-hover)" />
        Priority Matrix
      </h3>

      <div className="priority-row">
        <span className="priority-dot Critical"></span>
        <div>
          <strong>Critical</strong>
          <p>Direct safety risk or fully halts academic activities. Routed immediately straight to the HOD.</p>
        </div>
      </div>

      <div className="priority-row">
        <span className="priority-dot High"></span>
        <div>
          <strong>High</strong>
          <p>Disrupts lecture/lab delivery for the entire room. Auto-escalates after 1 day of inaction.</p>
        </div>
      </div>

      <div className="priority-row">
        <span className="priority-dot Medium"></span>
        <div>
          <strong>Medium</strong>
          <p>Inconvenient but workable without stopping class. Auto-escalates after 2 days.</p>
        </div>
      </div>

      <div className="priority-row">
        <span className="priority-dot Low"></span>
        <div>
          <strong>Low</strong>
          <p>Minor cosmetic fix or routine wear. Handled and closed at the Class Representative level.</p>
        </div>
      </div>
    </div>
  );
}
