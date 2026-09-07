import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Trash2, Send } from 'lucide-react';
import { CATEGORIES, PRIORITIES } from '../data/mockData';
import { useIssues } from '../context/IssueContext';

export default function RaiseIssueModal({ isOpen, onClose }) {
  const { addIssue } = useIssues();

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category || !title.trim() || !description.trim()) {
      alert('Please fill in category, title, and description.');
      return;
    }

    addIssue({
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
      imagePreview
    });

    setCategory('');
    setPriority('Medium');
    setTitle('');
    setDescription('');
    setImagePreview(null);
    onClose();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id="raiseIssueModal"
    >
      <div className="modal-box">
        <div className="modal-header">
          <h2>File an Infrastructure Ticket</h2>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} id="raiseIssueForm">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="issueCategory">Category *</label>
              <select
                id="issueCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="issuePriority">Priority Classification *</label>
              <select
                id="issuePriority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="issueTitle">Subject / Title *</label>
            <input
              type="text"
              id="issueTitle"
              placeholder="e.g. Projector lamp blown out in Hall 302"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="issueDescription">Specific Details & Location *</label>
            <textarea
              id="issueDescription"
              placeholder="Specify room number, fixture details, impact on class, etc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Image Attachment (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />

            {!imagePreview ? (
              <div
                className="file-drop"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <UploadCloud size={24} color="var(--text-muted)" />
                <span>
                  <strong>Click to browse</strong> or drop photo evidence
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  PNG, JPG up to 10MB
                </span>
              </div>
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  src={imagePreview} 
                  alt="Attachment preview" 
                  className="preview-thumb" 
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setImagePreview(null)}
                >
                  <Trash2 size={12} /> Remove Attachment
                </button>
              </div>
            )}

            <div className="priority-preview" id="priorityPreview">
              <span className={`priority-dot ${priority}`}></span>
              <span>
                {priority === 'Critical'
                  ? 'Critical protocol: Direct routing to Head of Department (HOD).'
                  : priority === 'High'
                  ? 'High priority: Handled by CR with rapid 24-hour escalation timer.'
                  : 'Standard triage: Initial evaluation by Class Representative.'}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              <Send size={14} />
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
