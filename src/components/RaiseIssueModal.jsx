import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Image as ImageIcon, Trash2, Zap } from 'lucide-react';
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

    // Reset form
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
          <h2>Raise a Campus Issue</h2>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
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
              <label htmlFor="issuePriority">Priority Level *</label>
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
            <label htmlFor="issueTitle">Issue Title *</label>
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
            <label htmlFor="issueDescription">Detailed Description *</label>
            <textarea
              id="issueDescription"
              placeholder="Describe what happened, classroom number, how many students are affected, etc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Attach Evidence / Photo (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />

            {!imagePreview ? (
              <div
                className={`file-drop ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <UploadCloud size={28} color="var(--primary-hover)" />
                <span>
                  <strong>Click to attach</strong> a photo or screenshot, or drag it here
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                  PNG, JPG or WebP up to 10MB
                </span>
              </div>
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  src={imagePreview} 
                  alt="Issue preview" 
                  className="preview-thumb" 
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setImagePreview(null)}
                >
                  <Trash2 size={13} /> Remove Photo
                </button>
              </div>
            )}

            <div className="priority-preview" id="priorityPreview">
              <span className={`priority-dot ${priority}`}></span>
              <span>
                {priority === 'Critical'
                  ? '⚡ Critical priority detected: Will bypass CR and route directly to the Head of Department (HOD).'
                  : priority === 'High'
                  ? '⚠️ High priority: Assigned to Class Representative with rapid 24h escalation timer.'
                  : '✓ Standard triage: Assigned to Class Representative for initial assessment.'}
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
              <Zap size={16} />
              Submit Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
