import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './OwnerAvailability.css';

const OwnerAvailability = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Check
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'venue_owner') {
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  // Primary Data States
  const [venue, setVenue] = useState(null);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  
  // Date & Calendar State (default to current year and month)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Selected Date Modal / Panel State
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [formStatus, setFormStatus] = useState('blocked');
  const [formNotes, setFormNotes] = useState('');
  const [formValidationError, setFormValidationError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 2. Fetch Venue Context & Availability Records
  const fetchAvailabilityData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Parallel fetch: Venue details & All availability records for venue
      const [venueRes, availRes] = await Promise.all([
        api.get(`/venues/${venueId}`),
        api.get(`/venues/${venueId}/availability`)
      ]);

      // Process Venue Details & Ownership Guard
      if (venueRes.data && venueRes.data.status === 'success') {
        const venueData = venueRes.data.data?.venue || venueRes.data.data;
        
        if (currentUser && venueData.owner_id !== currentUser.id && currentUser.role !== 'admin') {
          setErrorMessage('Access denied. You do not own this venue.');
          setLoading(false);
          return;
        }

        setVenue(venueData);
      } else {
        setErrorMessage(venueRes.data?.message || 'Failed to load venue details.');
      }

      // Process Availability Records
      if (availRes.data && availRes.data.status === 'success') {
        setAvailabilityRecords(Array.isArray(availRes.data.data) ? availRes.data.data : []);
      }

    } catch (err) {
      console.error('Error fetching availability data:', err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        setErrorMessage(err.response?.data?.message || 'Venue not found or access denied.');
      } else {
        setErrorMessage(err.response?.data?.message || 'Unable to load venue availability.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'venue_owner' && venueId) {
      fetchAvailabilityData();
      window.scrollTo(0, 0);
    }
  }, [venueId]);

  // Toast Helper
  const triggerToast = (type, text) => {
    setToastNotice({ type, text });
    setTimeout(() => {
      setToastNotice({ type: '', text: '' });
    }, 4000);
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'rejected': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // ----------------------------------------------------
  // CALENDAR LOGIC & COMPUTATION
  // ----------------------------------------------------
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTodayMonth = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map availability records by YYYY-MM-DD for fast lookup
  const recordsMap = {};
  availabilityRecords.forEach(r => {
    recordsMap[r.date] = r;
  });

  // Calculate Monthly Summary Metrics
  let monthBookedCount = 0;
  let monthBlockedCount = 0;
  let monthExplicitAvailableCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = recordsMap[dStr];
    if (rec) {
      if (rec.status === 'booked') monthBookedCount++;
      else if (rec.status === 'blocked') monthBlockedCount++;
      else if (rec.status === 'available') monthExplicitAvailableCount++;
    }
  }

  const monthDefaultAvailableCount = daysInMonth - (monthBookedCount + monthBlockedCount + monthExplicitAvailableCount);
  const totalAvailableCount = monthDefaultAvailableCount + monthExplicitAvailableCount;

  // ----------------------------------------------------
  // DATE SELECTION & MODAL HANDLERS
  // ----------------------------------------------------
  const handleSelectDate = (dateStr) => {
    const existingRec = recordsMap[dateStr];
    setSelectedDateStr(dateStr);
    setFormValidationError('');
    setShowDeleteConfirm(false);

    if (existingRec) {
      setFormStatus(existingRec.status === 'available' ? 'blocked' : existingRec.status);
      setFormNotes(existingRec.notes || '');
    } else {
      setFormStatus('blocked');
      setFormNotes('');
    }

    setShowDateModal(true);
  };

  const handleCloseDateModal = () => {
    setShowDateModal(false);
    setSelectedDateStr(null);
    setFormValidationError('');
    setShowDeleteConfirm(false);
  };

  // Submit Save / Update Availability
  const handleSaveAvailability = async (e) => {
    if (e) e.preventDefault();
    setFormValidationError('');

    const existingRec = recordsMap[selectedDateStr];
    if (existingRec && existingRec.status === 'booked') {
      setFormValidationError('Booked dates cannot be manually changed.');
      return;
    }

    setActionLoading(true);

    const payload = {
      date: selectedDateStr,
      status: formStatus,
      notes: formNotes.trim() || null
    };

    try {
      const res = await api.post(`/venues/${venueId}/availability`, payload);
      if (res.data && res.data.status === 'success') {
        triggerToast('success', `✓ Date ${selectedDateStr} marked as ${formStatus.toUpperCase()}.`);
        handleCloseDateModal();
        // Refresh availability records
        const refreshRes = await api.get(`/venues/${venueId}/availability`);
        if (refreshRes.data?.status === 'success') {
          setAvailabilityRecords(refreshRes.data.data);
        }
      } else {
        setFormValidationError(res.data?.message || 'Failed to save availability record.');
      }
    } catch (err) {
      console.error('Error saving availability:', err);
      setFormValidationError(err.response?.data?.message || 'An error occurred while saving availability.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Remove Explicit Availability Record (Resets to Default Available)
  const handleDeleteAvailabilityRecord = async () => {
    const existingRec = recordsMap[selectedDateStr];
    if (existingRec && existingRec.status === 'booked') {
      triggerToast('warning', 'Booked dates cannot be manually deleted.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.delete(`/venues/${venueId}/availability/${selectedDateStr}`);
      if (res.data && res.data.status === 'success') {
        triggerToast('success', `✨ Availability record for ${selectedDateStr} removed. Returned to Default Available.`);
        handleCloseDateModal();
        // Refresh availability records
        const refreshRes = await api.get(`/venues/${venueId}/availability`);
        if (refreshRes.data?.status === 'success') {
          setAvailabilityRecords(refreshRes.data.data);
        }
      } else {
        triggerToast('warning', res.data?.message || 'Failed to remove availability record.');
      }
    } catch (err) {
      console.error('Error deleting availability record:', err);
      triggerToast('warning', err.response?.data?.message || 'An error occurred while removing availability record.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="owner-availability-page">
      {/* Toast Notice */}
      {toastNotice.text && (
        <div className={`toast-notice toast-${toastNotice.type}`}>
          {toastNotice.text}
        </div>
      )}

      <div className="container dashboard-container">
        
        {/* Mobile Toggle */}
        <button
          className="dashboard-mobile-toggle"
          onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        >
          {sidebarMobileOpen ? '✕ Close Menu' : '☰ Owner Navigation'}
        </button>

        {/* 1. Sidebar */}
        <aside className={`dashboard-sidebar glass-card ${sidebarMobileOpen ? 'is-open' : ''}`}>
          <div className="sidebar-profile">
            <div className="profile-avatar owner-avatar">
              {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'O'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{currentUser.full_name}</h3>
              <span className="profile-role-badge owner-role-badge">Venue Owner</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📊 Overview Dashboard
                </Link>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link active">
                  🏰 My Venues
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📝 Quotation Requests
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📅 Bookings
                </Link>
              </li>
              <li>
                <button type="button" className="sidebar-link active">
                  🗓️ Availability
                </button>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  ⭐ Reviews
                </Link>
              </li>
            </ul>
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* 2. Main Content */}
        <main className="dashboard-main-content">
          
          {/* Context Header Links */}
          <div className="manage-top-bar" style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <Link to="/owner/venues" className="back-link">
              ← Back to My Venues
            </Link>
            <Link to={`/owner/venues/${venueId}/manage`} className="back-link">
              ⚙️ Manage Venue Features & Pricing
            </Link>
          </div>

          {/* Error Banner */}
          {errorMessage ? (
            <div className="glass-card filter-validation-error" style={{ margin: '1rem 0 2rem' }}>
              ⚠️ {errorMessage}
              <div style={{ marginTop: '1rem' }}>
                <Link to="/owner/venues" className="btn btn-secondary btn-sm">
                  Return to My Venues
                </Link>
              </div>
            </div>
          ) : loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0', margin: '1rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading venue availability calendar...</p>
            </div>
          ) : venue ? (
            <>
              {/* Context Header Card */}
              <div className="glass-card venue-manage-header-card">
                <div className="vm-header-left">
                  <div className="vm-title-icon font-gradient">🗓️</div>
                  <div>
                    <h1 className="vm-title">{venue.name}</h1>
                    <p className="vm-subtitle">
                      📍 {venue.city}, {venue.state} • Manage date availability, block custom dates, and inspect confirmed bookings.
                    </p>
                  </div>
                </div>

                <div className="vm-header-right">
                  <span className={`status-pill ${getStatusBadgeClass(venue.status)}`}>
                    ● Approval: {venue.status}
                  </span>
                  <span className={`status-pill ${venue.is_active ? 'badge-info' : 'badge-secondary'}`}>
                    {venue.is_active ? 'Active Listing' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Monthly Summary Statistics Cards */}
              <div className="metrics-cards-grid availability-metrics-grid">
                <div className="glass-card metric-card">
                  <div className="metric-icon-box icon-purple">✅</div>
                  <div className="metric-details">
                    <span className="metric-value">{totalAvailableCount} Days</span>
                    <span className="metric-label">Available ({monthNames[month]})</span>
                  </div>
                </div>

                <div className="glass-card metric-card">
                  <div className="metric-icon-box icon-amber">⛔</div>
                  <div className="metric-details">
                    <span className="metric-value">{monthBlockedCount} Days</span>
                    <span className="metric-label">Blocked by Owner</span>
                  </div>
                </div>

                <div className="glass-card metric-card">
                  <div className="metric-icon-box icon-blue">🔒</div>
                  <div className="metric-details">
                    <span className="metric-value">{monthBookedCount} Days</span>
                    <span className="metric-label">Confirmed Booked</span>
                  </div>
                </div>
              </div>

              {/* Availability Calendar Container */}
              <div className="glass-card calendar-container-card">
                
                {/* Calendar Month Header Controls */}
                <div className="calendar-month-header">
                  <h2 className="month-title">
                    {monthNames[month]} <span className="gradient-text">{year}</span>
                  </h2>

                  <div className="calendar-nav-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handlePrevMonth}
                    >
                      ◀ Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleTodayMonth}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleNextMonth}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>

                {/* Calendar State Legend */}
                <div className="calendar-legend">
                  <div className="legend-item">
                    <span className="legend-badge badge-unlisted"></span>
                    <span>Available (Default)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-badge badge-explicit-avail"></span>
                    <span>Explicit Available</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-badge badge-blocked"></span>
                    <span>Blocked</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-badge badge-booked"></span>
                    <span>Booked (Locked)</span>
                  </div>
                </div>

                {/* Days of Week Row */}
                <div className="calendar-grid-weekdays">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Days Grid */}
                <div className="calendar-grid-days">
                  {/* Empty padding cells for start of month */}
                  {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="calendar-day-cell cell-empty"></div>
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const record = recordsMap[dStr];
                    const status = record ? record.status : 'unlisted';

                    let cellStatusClass = 'status-unlisted';
                    let statusLabel = 'Available';
                    let iconEmoji = '';

                    if (status === 'booked') {
                      cellStatusClass = 'status-booked';
                      statusLabel = 'Booked';
                      iconEmoji = '🔒';
                    } else if (status === 'blocked') {
                      cellStatusClass = 'status-blocked';
                      statusLabel = 'Blocked';
                      iconEmoji = '⛔';
                    } else if (status === 'available') {
                      cellStatusClass = 'status-available';
                      statusLabel = 'Available';
                      iconEmoji = '✅';
                    }

                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = dStr === todayStr;

                    return (
                      <div
                        key={dStr}
                        className={`calendar-day-cell ${cellStatusClass} ${isToday ? 'is-today' : ''}`}
                        onClick={() => handleSelectDate(dStr)}
                      >
                        <div className="day-cell-header">
                          <span className="day-number">{dayNum}</span>
                          {isToday && <span className="today-dot" title="Today">●</span>}
                        </div>

                        <div className="day-cell-body">
                          <span className="day-status-pill">
                            {iconEmoji} {statusLabel}
                          </span>
                          {record?.notes && (
                            <span className="day-notes-snippet" title={record.notes}>
                              💬 {record.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </>
          ) : null}

        </main>
      </div>

      {/* Date Details & Action Modal */}
      {showDateModal && selectedDateStr && (
        <div className="modal-overlay" onClick={handleCloseDateModal}>
          <div className="glass-card modal-content owner-availability-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  🗓️ Date Details: <span className="gradient-text">{selectedDateStr}</span>
                </h2>
                <span className="modal-subtitle-venue">
                  Manage date status, block reservations, or add private owner notes.
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseDateModal}>
                ✕
              </button>
            </div>

            <div className="venue-form-body">
              {formValidationError && (
                <div className="filter-validation-error" style={{ marginBottom: '1.2rem' }}>
                  ⚠️ {formValidationError}
                </div>
              )}

              {/* Status Display Info */}
              {(() => {
                const rec = recordsMap[selectedDateStr];
                const isBooked = rec && rec.status === 'booked';
                const isBlocked = rec && rec.status === 'blocked';
                const isExplicitAvail = rec && rec.status === 'available';
                const isUnlisted = !rec;

                if (isBooked) {
                  return (
                    <div className="booked-locked-banner">
                      <div className="banner-icon">🔒</div>
                      <div>
                        <h4>Date is Confirmed Booked</h4>
                        <p>This venue date is booked for a customer event. Booked dates cannot be manually changed or deleted.</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <form onSubmit={handleSaveAvailability}>
                    <div className="form-group">
                      <label className="form-label">Availability Status *</label>
                      <select
                        className="form-control"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        disabled={actionLoading}
                      >
                        <option value="blocked">⛔ Blocked (Reserve for private maintenance/event)</option>
                        <option value="available">✅ Available (Mark explicitly available)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label className="form-label">Notes / Reason (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Private renovation, Family event, Reserved"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        disabled={actionLoading}
                      />
                    </div>

                    <div className="modal-footer-actions" style={{ marginTop: '1.75rem', justifyContent: 'space-between' }}>
                      {/* Left: Remove Record / Delete option if explicit record exists */}
                      {!isUnlisted ? (
                        <button
                          type="button"
                          className="btn btn-danger-soft btn-sm"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={actionLoading}
                        >
                          🗑️ Reset to Default Available
                        </button>
                      ) : (
                        <span></span>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleCloseDateModal}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Saving...' : 'Save Availability'}
                        </button>
                      </div>
                    </div>
                  </form>
                );
              })()}

              {/* Remove Record Confirmation Box */}
              {showDeleteConfirm && (
                <div className="delete-confirm-box" style={{ marginTop: '1.5rem' }}>
                  <p>
                    Are you sure you want to remove the custom record for <strong>{selectedDateStr}</strong>? It will return to the default <strong>AVAILABLE</strong> state.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-soft btn-xs"
                      onClick={handleDeleteAvailabilityRecord}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Removing...' : 'Confirm Remove'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerAvailability;
