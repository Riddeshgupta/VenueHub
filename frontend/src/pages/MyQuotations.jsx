import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './MyQuotations.css';

const MyQuotations = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // Access Control Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'customer') {
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  // Primary State
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Details Modal State
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Accept / Reject Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'accept'|'reject', quotation: obj }
  const [actionLoading, setActionLoading] = useState(false);

  // Booking Confirmation Modal State
  const [bookModal, setBookModal] = useState(null); // quotation object
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Toast Notification State
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // 1. Fetch Customer Quotations List
  const fetchQuotations = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/quotations/my');
      if (res.data && res.data.status === 'success') {
        setQuotations(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setErrorMessage(res.data?.message || 'Failed to load quotation requests.');
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch quotation requests. Please check if the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'customer') {
      fetchQuotations();
      window.scrollTo(0, 0);
    }
  }, []);

  // 2. Fetch Single Quotation Details with Itemized Line Items
  const handleOpenDetails = async (quotationId) => {
    setSelectedQuotationId(quotationId);
    setDetailsLoading(true);
    setDetailsError('');
    setDetailsData(null);

    try {
      const res = await api.get(`/quotations/${quotationId}`);
      if (res.data && res.data.status === 'success') {
        setDetailsData(res.data.data);
      } else {
        setDetailsError(res.data?.message || 'Failed to fetch quotation details.');
      }
    } catch (err) {
      console.error('Error fetching quotation details:', err);
      setDetailsError(
        err.response?.data?.message || 'An error occurred while loading itemized quotation details.'
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedQuotationId(null);
    setDetailsData(null);
    setDetailsError('');
  };

  // 3. Accept Quotation Action Handler
  const handleAcceptQuotation = async (quotation) => {
    setConfirmDialog({ type: 'accept', quotation });
  };

  // 4. Reject Quotation Action Handler
  const handleRejectQuotation = async (quotation) => {
    setConfirmDialog({ type: 'reject', quotation });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;

    const { type, quotation } = confirmDialog;
    const quotationId = quotation.id;
    setActionLoading(true);

    try {
      const endpoint = type === 'accept' 
        ? `/quotations/${quotationId}/accept` 
        : `/quotations/${quotationId}/reject`;

      const res = await api.post(endpoint);

      if (res.data && res.data.status === 'success') {
        const newStatus = type === 'accept' ? 'accepted' : 'rejected';
        
        // Update local list state immediately
        setQuotations(prev => prev.map(q => q.id === quotationId ? { ...q, status: newStatus } : q));

        // Update modal state if open
        if (detailsData && detailsData.id === quotationId) {
          setDetailsData(prev => ({ ...prev, status: newStatus }));
        }

        triggerToast('success', type === 'accept' 
          ? '✓ Quotation accepted successfully! You can now book this venue.' 
          : 'Quotation request declined.'
        );

        setConfirmDialog(null);
      } else {
        triggerToast('warning', res.data?.message || `Failed to ${type} quotation.`);
      }
    } catch (err) {
      console.error(`Error during ${type} quotation:`, err);
      const apiMsg = err.response?.data?.message;
      triggerToast('warning', apiMsg || `An error occurred while attempting to ${type} quotation.`);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Booking Handlers
  const handleOpenBookModal = (quotation) => {
    setBookModal(quotation);
    setBookingError('');
  };

  const handleConfirmBooking = async () => {
    if (!bookModal) return;
    setBookingSubmitting(true);
    setBookingError('');

    try {
      const res = await api.post('/bookings', { quotation_id: bookModal.id });
      if (res.data && res.data.status === 'success') {
        triggerToast('success', '🎉 Booking confirmed successfully!');
        const createdBooking = res.data.data;
        setBookModal(null);
        fetchQuotations();
        navigate('/dashboard/bookings', { state: { newBookingId: createdBooking?.id } });
      } else {
        setBookingError(res.data?.message || 'Failed to create booking.');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setBookingError(
        err.response?.data?.message || 'An error occurred while creating your booking. Please try again.'
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

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

  // Filtering Logic
  const filteredQuotations = quotations.filter(q => {
    if (statusFilter === 'all') return true;
    return q.status === statusFilter;
  });

  // Formatting Helpers
  const formatCurrency = (amount) => {
    return amount != null && amount > 0 
      ? `₹${Number(amount).toLocaleString('en-IN')}` 
      : 'Quote Pending';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'accepted':
        return 'badge-success';
      case 'quoted':
        return 'badge-info';
      case 'pending':
        return 'badge-warning';
      case 'rejected':
      case 'expired':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'quoted': return 'Quote Received';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Declined';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="my-quotations-page">
      {/* Toast Notice Banner */}
      {toastNotice.text && (
        <div className={`toast-notice toast-${toastNotice.type}`}>
          {toastNotice.text}
        </div>
      )}

      <div className="container dashboard-container">
        
        {/* Mobile Sidebar Toggle Button */}
        <button
          className="dashboard-mobile-toggle"
          onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        >
          {sidebarMobileOpen ? '✕ Close Sidebar' : '☰ Dashboard Menu'}
        </button>

        {/* 1. Sidebar Navigation */}
        <aside className={`dashboard-sidebar glass-card ${sidebarMobileOpen ? 'is-open' : ''}`}>
          <div className="sidebar-profile">
            <div className="profile-avatar">
              {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'C'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{currentUser.full_name}</h3>
              <span className="profile-role-badge">Customer</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <Link to="/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📊 Overview
                </Link>
              </li>
              <li>
                <Link to="/dashboard/bookings" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📅 My Bookings
                </Link>
              </li>
              <li>
                <button type="button" className="sidebar-link active">
                  📝 My Quotations ({quotations.length})
                </button>
              </li>
              <li>
                <Link to="/dashboard/wishlist" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  ❤️ Wishlist
                </Link>
              </li>
              <li>
                <Link to="/dashboard/notifications" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  🔔 Notifications
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
          
          {/* Header Bar */}
          <div className="glass-card page-header-card">
            <div className="header-top-row">
              <Link to="/dashboard" className="back-link">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="page-header-title">
              My <span className="gradient-text">Quotation Requests</span>
            </h1>
            <p className="page-header-subtitle">
              Review custom venue quotation proposals, inspect itemized pricing line items, and accept your best match.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchQuotations}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* 3. Status Filter Tabs */}
          <div className="glass-card filter-tabs-card">
            <div className="filter-tabs-container">
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({quotations.length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({quotations.filter(q => q.status === 'pending').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'quoted' ? 'active' : ''}`}
                onClick={() => setStatusFilter('quoted')}
              >
                Quoted ({quotations.filter(q => q.status === 'quoted').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'accepted' ? 'active' : ''}`}
                onClick={() => setStatusFilter('accepted')}
              >
                Accepted ({quotations.filter(q => q.status === 'accepted').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                Declined ({quotations.filter(q => q.status === 'rejected').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'expired' ? 'active' : ''}`}
                onClick={() => setStatusFilter('expired')}
              >
                Expired ({quotations.filter(q => q.status === 'expired').length})
              </button>
            </div>
          </div>

          {/* 4. Quotations List Section */}
          {loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading your quotation requests...</p>
            </div>
          ) : filteredQuotations.length > 0 ? (
            <div className="quotation-cards-stack">
              {filteredQuotations.map((q) => (
                <div key={q.id} className="glass-card quotation-full-card">
                  <div className="qcard-header">
                    <div className="qcard-title-group">
                      <span className="qcard-icon">🏰</span>
                      <div>
                        <h3 className="qcard-venue-name">{q.venue_name || `Venue #${q.venue_id}`}</h3>
                        <span className="qcard-location">📍 {q.venue_city || 'Location N/A'}</span>
                      </div>
                    </div>

                    <div className="qcard-status-box">
                      <span className={`status-pill ${getStatusBadgeClass(q.status)}`}>
                        ● {getStatusLabel(q.status)}
                      </span>
                    </div>
                  </div>

                  <div className="qcard-body-grid">
                    <div className="qspec-item">
                      <span className="qspec-label">Event Type</span>
                      <span className="qspec-val">🎉 {q.event_type_name || 'Event'}</span>
                    </div>

                    <div className="qspec-item">
                      <span className="qspec-label">Planned Event Date</span>
                      <span className="qspec-val">📅 {q.event_date}</span>
                    </div>

                    <div className="qspec-item">
                      <span className="qspec-label">Guest Capacity</span>
                      <span className="qspec-val">👥 {q.guest_count} Guests</span>
                    </div>

                    <div className="qspec-item">
                      <span className="qspec-label">Total Amount</span>
                      <span className="qspec-val price-val">{formatCurrency(q.total_amount)}</span>
                    </div>
                  </div>

                  {q.message && (
                    <div className="qcard-message-box">
                      <span className="msg-label">Customer Note:</span>
                      <p className="msg-text">"{q.message}"</p>
                    </div>
                  )}

                  <div className="qcard-footer-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenDetails(q.id)}
                    >
                      🔍 View Details & Items
                    </button>

                    {q.status === 'quoted' && (
                      <div className="quoted-action-btns">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleAcceptQuotation(q)}
                        >
                          ✓ Accept Quotation
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.4)' }}
                          onClick={() => handleRejectQuotation(q)}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    )}

                    {q.status === 'accepted' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                        onClick={() => handleOpenBookModal(q)}
                      >
                        ⚡ Book Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card empty-quotations-card">
              <div className="empty-qicon">📝</div>
              <h3 className="empty-qtitle">
                {statusFilter === 'all' ? 'No Quotation Requests Yet' : `No ${getStatusLabel(statusFilter)} Quotations`}
              </h3>
              <p className="empty-qtext">
                {statusFilter === 'all' 
                  ? 'Request custom quotes directly from venue owners to receive itemized price breakdowns.'
                  : `You currently have no quotation requests with status "${getStatusLabel(statusFilter)}".`}
              </p>
              <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                🔍 Find Venues to Quote
              </Link>
            </div>
          )}

        </main>
      </div>

      {/* 5. Quotation Details & Itemized Pricing Modal */}
      {selectedQuotationId && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="glass-card modal-content qdetails-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Quotation Details #{selectedQuotationId}
                </h2>
                {detailsData && (
                  <span className="modal-subtitle-venue">
                    For {detailsData.venue_name} ({detailsData.venue_city})
                  </span>
                )}
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseDetails}>
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className="loading-container" style={{ padding: '3rem 0' }}>
                <div className="loading-spinner"></div>
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Fetching itemized details...</p>
              </div>
            ) : detailsError ? (
              <div className="filter-validation-error">
                ⚠️ {detailsError}
              </div>
            ) : detailsData ? (
              <div className="qdetails-body">
                {/* Basic Meta Summary */}
                <div className="qdetails-meta-grid">
                  <div className="qmeta-item">
                    <span className="qmeta-label">Venue</span>
                    <span className="qmeta-val">{detailsData.venue_name}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Event Type</span>
                    <span className="qmeta-val">{detailsData.event_type_name || 'Event'}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Planned Event Date</span>
                    <span className="qmeta-val">{detailsData.event_date}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Guest Count</span>
                    <span className="qmeta-val">{detailsData.guest_count} Guests</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Status</span>
                    <span className={`status-pill ${getStatusBadgeClass(detailsData.status)}`}>
                      ● {getStatusLabel(detailsData.status)}
                    </span>
                  </div>
                </div>

                {detailsData.message && (
                  <div className="qcard-message-box" style={{ marginTop: '1rem' }}>
                    <span className="msg-label">Customer Message:</span>
                    <p className="msg-text">"{detailsData.message}"</p>
                  </div>
                )}

                {/* Itemized Pricing Table */}
                <div className="itemized-section">
                  <h3 className="itemized-heading">Itemized Cost Breakdown</h3>
                  {detailsData.items && detailsData.items.length > 0 ? (
                    <div className="pricing-table-container">
                      <table className="pricing-table">
                        <thead>
                          <tr>
                            <th>Item Description</th>
                            <th>Unit Price</th>
                            <th>Qty</th>
                            <th>Total Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsData.items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.item_name}</td>
                              <td>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                              <td>{item.quantity}</td>
                              <td className="price-cell">₹{Number(item.total_price).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-section-text">
                      {detailsData.status === 'pending'
                        ? 'The venue owner has not submitted line items yet. You will be notified when a quotation response is provided.'
                        : 'No itemized line items recorded for this quotation.'}
                    </p>
                  )}
                </div>

                {/* Authoritative Total */}
                <div className="qdetails-total-box">
                  <span className="total-box-label">Authoritative Total Amount:</span>
                  <span className="total-box-val">{formatCurrency(detailsData.total_amount)}</span>
                </div>

                {/* Modal Footer Actions */}
                <div className="modal-footer-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseDetails}>
                    Close
                  </button>

                  {detailsData.status === 'quoted' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.4)' }}
                        onClick={() => {
                          handleCloseDetails();
                          handleRejectQuotation(detailsData);
                        }}
                      >
                        ✕ Decline Quote
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          handleCloseDetails();
                          handleAcceptQuotation(detailsData);
                        }}
                      >
                        ✓ Accept Quotation
                      </button>
                    </>
                  )}

                  {detailsData.status === 'accepted' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                      onClick={() => {
                        handleCloseDetails();
                        handleOpenBookModal(detailsData);
                      }}
                    >
                      ⚡ Book Now
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 6. Accept / Reject Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="glass-card modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {confirmDialog.type === 'accept' ? '✓ Accept Quotation?' : '✕ Decline Quotation?'}
              </h2>
              <button type="button" className="modal-close-btn" onClick={() => setConfirmDialog(null)}>
                ✕
              </button>
            </div>

            <div className="confirm-body">
              <p className="confirm-text">
                {confirmDialog.type === 'accept' ? (
                  <>
                    Are you sure you want to <strong>accept</strong> the quotation for{' '}
                    <strong>{confirmDialog.quotation.venue_name || `Venue #${confirmDialog.quotation.venue_id}`}</strong>{' '}
                    amounting to <strong>{formatCurrency(confirmDialog.quotation.total_amount)}</strong>?
                  </>
                ) : (
                  <>
                    Are you sure you want to <strong>decline</strong> the quotation request for{' '}
                    <strong>{confirmDialog.quotation.venue_name || `Venue #${confirmDialog.quotation.venue_id}`}</strong>?
                  </>
                )}
              </p>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.type === 'accept' ? 'btn-primary' : 'btn-outline'}`}
                style={confirmDialog.type === 'reject' ? { color: '#fca5a5', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)' } : {}}
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                {actionLoading 
                  ? 'Processing...' 
                  : confirmDialog.type === 'accept' ? 'Yes, Accept Quotation' : 'Yes, Decline Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Booking Confirmation Modal */}
      {bookModal && (
        <div className="modal-overlay" onClick={() => setBookModal(null)}>
          <div className="glass-card modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">🏰 Confirm Venue Booking</h2>
                <span className="modal-subtitle-venue">For {bookModal.venue_name || `Venue #${bookModal.venue_id}`}</span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setBookModal(null)}>
                ✕
              </button>
            </div>

            <div className="confirm-body">
              {bookingError && (
                <div className="filter-validation-error" style={{ marginBottom: '1rem' }}>
                  ⚠️ {bookingError}
                </div>
              )}

              <div className="book-summary-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                margin: '1rem 0',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Venue Location</span>
                  <strong>{bookModal.venue_name || `Venue #${bookModal.venue_id}`} ({bookModal.venue_city || 'Location N/A'})</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Event Date</span>
                  <strong>📅 {bookModal.event_date}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Guest Count</span>
                  <strong>👥 {bookModal.guest_count} Guests</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Accepted Total Amount</span>
                  <strong style={{ color: 'var(--accent-glow)', fontSize: '1.1rem' }}>
                    ₹{Number(bookModal.total_amount).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <p className="confirm-text" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                ℹ️ Confirming this booking will reserve the venue for your event date. The date status will be updated to "booked" in the system.
              </p>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBookModal(null)}
                disabled={bookingSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                onClick={handleConfirmBooking}
                disabled={bookingSubmitting}
              >
                {bookingSubmitting ? 'Confirming Booking...' : '✓ Confirm & Book Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyQuotations;
