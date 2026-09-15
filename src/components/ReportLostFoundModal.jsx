import React, { useState, useEffect } from 'react';
import { X, UploadCloud, AlertCircle, CheckCircle2, MapPin, Calendar, Tag, FileText, Phone } from 'lucide-react';
import { useLostFound, LF_CATEGORIES, LF_LOCATIONS } from '../context/LostFoundContext';

export default function ReportLostFoundModal({ isOpen, onClose, defaultType = 'LOST' }) {
  const { addReport } = useLostFound();

  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [location, setLocation] = useState('Central Library');
  const [customLocation, setCustomLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setTitle('');
      setCategory('Electronics');
      setLocation('Central Library');
      setCustomLocation('');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setContact('');
      setImageUrl('');
      setImageFile(null);
      setError('');
      setSuccess(false);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide an item name / title.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a short description or identifying details.');
      return;
    }

    const finalLocation = location === 'Other Location' && customLocation.trim()
      ? customLocation.trim()
      : location;

    setLoading(true);
    try {
      await addReport({
        type,
        title: title.trim(),
        category,
        location: finalLocation,
        date,
        description: description.trim(),
        contact: contact.trim() || undefined,
        imageUrl: imageUrl || undefined
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lf-modal-overlay" onClick={onClose}>
      <div className="lf-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="lf-modal-header">
          <h2>Report Item to Lost & Found</h2>
          <button type="button" className="lf-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lf-modal-body">
            {/* Type selector toggle */}
            <div className="lf-form-group">
              <label>Report Type</label>
              <div className="lf-type-toggle-group">
                <button
                  type="button"
                  className={`lf-type-toggle-btn ${type === 'LOST' ? 'selected-lost' : ''}`}
                  onClick={() => setType('LOST')}
                >
                  <AlertCircle size={16} />
                  I Lost Something
                </button>
                <button
                  type="button"
                  className={`lf-type-toggle-btn ${type === 'FOUND' ? 'selected-found' : ''}`}
                  onClick={() => setType('FOUND')}
                >
                  <CheckCircle2 size={16} />
                  I Found Something
                </button>
              </div>
            </div>

            {/* Item Name */}
            <div className="lf-form-group">
              <label htmlFor="lfTitle">Item Name *</label>
              <input
                id="lfTitle"
                type="text"
                className="lf-form-input"
                placeholder={type === 'LOST' ? "e.g. Black Sony WH-1000XM5 Headphones" : "e.g. Set of 3 keys with red carabiner"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Category & Date */}
            <div className="lf-form-row">
              <div className="lf-form-group">
                <label htmlFor="lfCategory">Category</label>
                <select
                  id="lfCategory"
                  className="lf-form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {LF_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="lf-form-group">
                <label htmlFor="lfDate">{type === 'LOST' ? 'Date Lost' : 'Date Found'}</label>
                <input
                  id="lfDate"
                  type="date"
                  className="lf-form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="lf-form-group">
              <label htmlFor="lfLocation">Campus Location</label>
              <select
                id="lfLocation"
                className="lf-form-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {LF_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
                <option value="Other Location">Other Location...</option>
              </select>
            </div>

            {location === 'Other Location' && (
              <div className="lf-form-group">
                <label htmlFor="lfCustomLocation">Specific Location Details</label>
                <input
                  id="lfCustomLocation"
                  type="text"
                  className="lf-form-input"
                  placeholder="e.g. Academic Block B - Room 102"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                />
              </div>
            )}

            {/* Description & Identifying Details */}
            <div className="lf-form-group">
              <label htmlFor="lfDescription">Description & Identifying Marks *</label>
              <textarea
                id="lfDescription"
                className="lf-form-textarea"
                rows={3}
                placeholder="Mention brand, color, scratch marks, stickers, initial tags or specific contents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Contact Information */}
            <div className="lf-form-group">
              <label htmlFor="lfContact">Contact Information / Collection Point</label>
              <input
                id="lfContact"
                type="text"
                className="lf-form-input"
                placeholder="e.g. rahul.verma@campus.edu or Library Front Desk / Phone"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            {/* Image Attachment */}
            <div className="lf-form-group">
              <label>Photo Attachment (Optional)</label>
              {imageUrl ? (
                <div className="lf-image-preview-wrapper">
                  <img src={imageUrl} alt="Preview" className="lf-image-preview" />
                  <button
                    type="button"
                    className="lf-image-remove-btn"
                    onClick={() => { setImageUrl(''); setImageFile(null); }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="lf-image-upload-box">
                  <UploadCloud size={24} className="text-muted" />
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    Click or drag photo to upload
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    PNG, JPG, WEBP up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageFileChange}
                  />
                </label>
              )}
            </div>

            {error && (
              <div style={{
                background: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                color: 'var(--error-text)',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success-text)',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} />
                Report submitted successfully!
              </div>
            )}
          </div>

          <div className="lf-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
            >
              {loading ? 'Submitting...' : type === 'LOST' ? 'Submit Lost Report' : 'Submit Found Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
