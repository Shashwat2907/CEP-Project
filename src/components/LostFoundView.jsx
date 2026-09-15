import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Plus, 
  PackageSearch, 
  MapPin, 
  Calendar, 
  Tag, 
  User, 
  Filter, 
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { 
  useLostFound, 
  LF_CATEGORIES, 
  LF_LOCATIONS 
} from '../context/LostFoundContext';
import ReportLostFoundModal from './ReportLostFoundModal';
import LostFoundDetailModal from './LostFoundDetailModal';
import '../styles/lostfound.css';

export default function LostFoundView() {
  const {
    filteredItems,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    locationFilter,
    setLocationFilter,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    resetFilters,
    reportModalOpen,
    reportModalType,
    openReportModal,
    closeReportModal,
    selectedItem,
    setSelectedItemId
  } = useLostFound();

  const hasActiveFilters = 
    searchQuery !== '' || 
    typeFilter !== 'ALL' || 
    categoryFilter !== 'ALL' || 
    locationFilter !== 'ALL' || 
    statusFilter !== 'ALL' ||
    activeTab !== 'all';

  return (
    <div className="lost-found-container">
      {/* Top Header Banner */}
      <div className="lf-header">
        <div className="lf-header-title">
          <div className="lf-badge-tag">
            <PackageSearch size={14} />
            Campus Lost & Found Protocol
          </div>
          <h1>Lost & Found</h1>
          <p className="lf-header-subtitle">
            Find what you&apos;ve lost. Return what you&apos;ve found.
          </p>
        </div>

        <div className="lf-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openReportModal('FOUND')}
          >
            <ShieldCheck size={16} />
            Report Found Item
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openReportModal('LOST')}
          >
            <Plus size={16} />
            Report Lost Item
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="lf-metrics-bar">
        <div 
          className={`lf-metric-card ${activeTab === 'all' && typeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setTypeFilter('ALL'); }}
        >
          <span className="lf-metric-label">Total Listings</span>
          <span className="lf-metric-value">{stats.total}</span>
        </div>

        <div 
          className={`lf-metric-card ${typeFilter === 'LOST' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setTypeFilter('LOST'); }}
        >
          <span className="lf-metric-label">Lost Reports</span>
          <span className="lf-metric-value" style={{ color: '#f87171' }}>{stats.lostCount}</span>
        </div>

        <div 
          className={`lf-metric-card ${typeFilter === 'FOUND' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setTypeFilter('FOUND'); }}
        >
          <span className="lf-metric-label">Found Reports</span>
          <span className="lf-metric-value" style={{ color: '#60a5fa' }}>{stats.foundCount}</span>
        </div>

        <div 
          className={`lf-metric-card ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          <span className="lf-metric-label">My Reports / Claims</span>
          <span className="lf-metric-value">{stats.myCount}</span>
        </div>

        <div 
          className={`lf-metric-card ${activeTab === 'returned' ? 'active' : ''}`}
          onClick={() => setActiveTab('returned')}
        >
          <span className="lf-metric-label">Returned & Reunited</span>
          <span className="lf-metric-value" style={{ color: '#4ade80' }}>{stats.returnedCount}</span>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="lf-filter-panel">
        <div className="lf-search-row">
          {/* Search box */}
          <div className="lf-search-box">
            <Search size={16} className="lf-search-icon" />
            <input
              type="text"
              className="lf-search-input"
              placeholder="Search by item name, AirPods, wallet, location or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="lf-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Chips (ALL / LOST / FOUND) */}
          <div className="lf-type-chips">
            <button
              type="button"
              className={`lf-chip-btn ${typeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setTypeFilter('ALL')}
            >
              All Types
            </button>
            <button
              type="button"
              className={`lf-chip-btn ${typeFilter === 'LOST' ? 'active-lost' : ''}`}
              onClick={() => setTypeFilter('LOST')}
            >
              Lost Only
            </button>
            <button
              type="button"
              className={`lf-chip-btn ${typeFilter === 'FOUND' ? 'active-found' : ''}`}
              onClick={() => setTypeFilter('FOUND')}
            >
              Found Only
            </button>
          </div>
        </div>

        {/* Sub-Filters Dropdowns Row */}
        <div className="lf-dropdowns-row">
          <div className="lf-select-wrapper">
            <label htmlFor="lfCatFilter">Category:</label>
            <select
              id="lfCatFilter"
              className="lf-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {LF_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="lf-select-wrapper">
            <label htmlFor="lfLocFilter">Location:</label>
            <select
              id="lfLocFilter"
              className="lf-select"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="ALL">All Locations</option>
              {LF_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="lf-select-wrapper">
            <label htmlFor="lfStatusFilter">Status:</label>
            <select
              id="lfStatusFilter"
              className="lf-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Claimed">Claimed</option>
              <option value="Returned">Returned</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={resetFilters}
              style={{ marginLeft: 'auto' }}
            >
              <RotateCcw size={13} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="lf-tabs-bar">
        <button
          type="button"
          className={`lf-tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Reported Items</span>
          <span className="lf-tab-count">{stats.total}</span>
        </button>

        <button
          type="button"
          className={`lf-tab-button ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          <span>My Lost & Found</span>
          <span className="lf-tab-count">{stats.myCount}</span>
        </button>

        <button
          type="button"
          className={`lf-tab-button ${activeTab === 'returned' ? 'active' : ''}`}
          onClick={() => setActiveTab('returned')}
        >
          <span>Returned & Reunited</span>
          <span className="lf-tab-count">{stats.returnedCount}</span>
        </button>
      </div>

      {/* Item Grid */}
      <div className="lf-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="lf-skeleton-card" />
          ))
        ) : filteredItems.length === 0 ? (
          <div className="lf-empty-state">
            <div className="lf-empty-icon">
              <PackageSearch size={28} />
            </div>
            <h3>No items found matching your filter</h3>
            <p>
              Try expanding your search criteria or reset filters to view all campus reports.
            </p>
            <div className="lf-empty-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openReportModal('LOST')}
              >
                Report New Item
              </button>
            </div>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="lf-card">
              <div className="lf-card-image-wrapper">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="lf-card-image" />
                ) : (
                  <div className="lf-card-placeholder-image">
                    <PackageSearch size={32} />
                    <span style={{ fontSize: '0.78rem' }}>No Photo Uploaded</span>
                  </div>
                )}
                <span className={`lf-type-badge type-${item.type}`}>
                  {item.type}
                </span>
                <span className={`lf-status-pill status-${item.status}`}>
                  {item.status}
                </span>
              </div>

              <div className="lf-card-body">
                <div className="lf-card-meta-top">
                  <span className="lf-category-tag">{item.category}</span>
                  <span className="lf-card-date">{item.date}</span>
                </div>

                <h3 className="lf-card-title">{item.title}</h3>
                <p className="lf-card-desc">{item.description}</p>

                <div className="lf-card-info-list">
                  <div className="lf-card-info-item">
                    <MapPin size={13} />
                    <span>{item.location}</span>
                  </div>
                  <div className="lf-card-info-item">
                    <User size={13} />
                    <span>Reported by {item.reportedBy}</span>
                  </div>
                </div>
              </div>

              <div className="lf-card-footer">
                <span className="lf-reporter-info">Item #{item.id}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setSelectedItemId(item.id)}
                  style={{ gap: '0.3rem' }}
                >
                  View Details
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <ReportLostFoundModal
        isOpen={reportModalOpen}
        onClose={closeReportModal}
        defaultType={reportModalType}
      />

      <LostFoundDetailModal
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}
