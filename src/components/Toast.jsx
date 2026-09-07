import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useIssues } from '../context/IssueContext';

export default function Toast() {
  const { toast } = useIssues();

  if (!toast.show) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      default:
        return <CheckCircle2 size={18} />;
    }
  };

  return (
    <div className="toast-container" id="toast">
      <div className={`toast toast-${toast.type}`}>
        <div className="toast-icon">
          {getIcon()}
        </div>
        <div>
          <strong>{toast.title}</strong>
          <span>{toast.subtitle}</span>
        </div>
      </div>
    </div>
  );
}
