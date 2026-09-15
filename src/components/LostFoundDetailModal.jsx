import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Tag, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Trash2, 
  MessageSquare,
  Clock
} from 'lucide-react';
import { useLostFound } from '../context/LostFoundContext';
import { useAuth } from '../context/AuthContext';

export default function LostFoundDetailModal({ item, onClose }) {
  const { claimItem, updateItemStatus, deleteReport } = useLostFound();
  const { user, isTeacher } = useAuth();

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimNotes, setClaimNotes] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [showContact, setShowContact] = useState(false);

  if (!item) return null;

  const isReporter = item.reportedById === user?.id || item.reportedBy === user?.name;
  const isClaimer = item.claimedBy === user?.name;

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setSubmittingClaim(true);
    try {
      await claimItem(item.id, claimNotes, contactInfo);
      setShowClaimForm(false);
    } catch (err) {
      console.error('Claim failed:', err);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (window.confirm(`Are you sure you want to change item status to ${newStatus}?`)) {
      await updateItemStatus(item.id, newStatus);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete report "#${item.id} - ${item.title}"?`)) {
      await deleteReport(item.id);
      onClose();
    }
  };

  return (
    <div className="lf-modal-overlay" onClick={onClose}>
      <div className="lf-modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="lf-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className={`lf-type-badge type-${item.type}`} style={{ position: 'static' }}>
              {item.type}
            </span>
            <span className={`lf-status-pill status-${item.status}`} style={{ position: 'static' }}>
              {item.status}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '0.3rem' }}>
              #{item.id}
            </span>
          </div>
          <button type="button" className="lf-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="lf-modal-body">
          {/* Image */}
          {item.imageUrl && (
            <div className="lf-detail-image-box">
              <img src={item.imageUrl} alt={item.title} className="lf-detail-image" />
            </div>
          )}

          {/* Title & Category */}
          <div>
            <div className="lf-category-tag">{item.category}</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {item.title}
            </h2>
          </div>

          {/* Key Meta Grid */}
          <div className="lf-detail-meta-grid">
            <div className="lf-detail-meta-item">
              <span className="lf-detail-meta-label">Location</span>
              <span className="lf-detail-meta-val">
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                {item.location}
              </span>
            </div>

            <div className="lf-detail-meta-item">
              <span className="lf-detail-meta-label">Date Reported</span>
              <span className="lf-detail-meta-val">
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                {item.date}
              </span>
            </div>

            <div className="lf-detail-meta-item">
              <span className="lf-detail-meta-label">Reported By</span>
              <span className="lf-detail-meta-val">
                <User size={14} style={{ color: 'var(--text-muted)' }} />
                {item.reportedBy}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="lf-form-group">
            <label>Description & Identifying Details</label>
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.88rem',
              color: 'var(--text-main)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap'
            }}>
              {item.description}
            </div>
          </div>

          {/* Claim info / Notes if existing */}
          {item.claimedBy && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.84rem',
              color: '#facc15'
            }}>
              <strong>Claimed by:</strong> {item.claimedBy}
              {item.claimNotes && (
                <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                  Notes: {item.claimNotes}
                </div>
              )}
            </div>
          )}

          {/* Contact Details box (toggled) */}
          {showContact && (
            <div style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.86rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Reporter Contact Information</div>
              <div style={{ color: 'var(--text-muted)' }}>
                {item.contact || `Direct email: ${item.reportedById}@campus.edu`}
              </div>
            </div>
          )}

          {/* Claim Interactive Form */}
          {showClaimForm && item.status === 'Active' && (
            <form onSubmit={handleClaimSubmit} className="lf-claim-box">
              <h4>
                <ShieldCheck size={16} />
                {item.type === 'LOST' ? 'I Found This Item' : 'This Is Mine / Claim Item'}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {item.type === 'LOST' 
                  ? 'Please describe where you found it or leave a message for the owner.'
                  : 'Please describe unique identifying features to verify ownership.'}
              </p>

              <textarea
                className="lf-form-textarea"
                rows={3}
                placeholder="Provide verifying details, serial number, scratch description, or handover location..."
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                required
              />

              <input
                type="text"
                className="lf-form-input"
                placeholder="Your phone number or email for contact"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
              />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowClaimForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={submittingClaim}
                >
                  {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="lf-modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            {(isReporter || isTeacher) && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleDelete}
              >
                <Trash2 size={14} />
                Delete Report
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setShowContact(prev => !prev)}
            >
              <Phone size={14} />
              {showContact ? 'Hide Contact' : 'Contact Reporter'}
            </button>

            {item.status === 'Active' && !showClaimForm && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setShowClaimForm(true)}
              >
                <ShieldCheck size={14} />
                {item.type === 'LOST' ? 'I Found This' : 'This Is Mine'}
              </button>
            )}

            {item.status === 'Claimed' && (isReporter || isTeacher || isClaimer) && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => handleStatusChange('Returned')}
              >
                <CheckCircle2 size={14} />
                Mark as Returned / Reunited
              </button>
            )}

            {item.status === 'Returned' && (isReporter || isTeacher) && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleStatusChange('Active')}
              >
                Reopen Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
