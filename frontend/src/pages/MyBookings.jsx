import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './MyBookings.css';

const MyBookings = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Guard
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Booking Details Modal State
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Review Submission Modal State
  const [reviewBooking, setReviewBooking] = useState(null); // Booking object to review
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewedBookingIds, setReviewedBookingIds] = useState([]); // Track bookings reviewed
  const [existingReviewsMap, setExistingReviewsMap] = useState({}); // Map of bookingId -> review obj

  // View Submitted Review Modal State
  const [viewReviewModal, setViewReviewModal] = useState(null); // { booking, review }

  // Toast Notification State
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // 2. Fetch Customer Bookings List and Existing Reviews
  const fetchBookings = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/bookings/my');
      if (res.data && res.data.status === 'success') {
        const bList = Array.isArray(res.data.data) ? res.data.data : [];
        setBookings(bList);

        // Fetch existing reviews for completed bookings
        const completedList = bList.filter(b => b.status === 'completed');
        if (completedList.length > 0) {
          const venueIds = [...new Set(completedList.map(b => b.venue_id))];
          const reviewPromises = venueIds.map(vId => 
            api.get(`/venues/${vId}/reviews`).catch(() => ({ data: { data: { reviews: [] } } }))
          );
          const reviewResults = await Promise.all(reviewPromises);

          const reviewedIds = [];
          const reviewsMap = {};

          reviewResults.forEach(rRes => {
            if (rRes.data && rRes.data.status === 'success') {
              const vData = rRes.data.data || {};
              const revList = vData.reviews || [];
              revList.forEach(rev => {
                if (rev.customer_id === currentUser?.id) {
                  // Find completed bookings for this venue
                  const matches = completedList.filter(b => b.venue_id === vData.venue_id);
                  matches.forEach(m => {
                    reviewedIds.push(m.id);
                    reviewsMap[m.id] = rev;
                  });
                }
              });
            }
          });

          setReviewedBookingIds([...new Set(reviewedIds)]);
          setExistingReviewsMap(reviewsMap);
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to load booking history.');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch booking history. Please check if the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'customer') {
      fetchBookings();
      window.scrollTo(0, 0);
    }
  }, []);

  // 3. Fetch Single Booking Details with Itemized Line Items
  const handleOpenDetails = async (bookingId) => {
    setSelectedBookingId(bookingId);
    setDetailsLoading(true);
    setDetailsError('');
    setDetailsData(null);

    try {
      const res = await api.get(`/bookings/${bookingId}`);
      if (res.data && res.data.status === 'success') {
        setDetailsData(res.data.data);
      } else {
        setDetailsError(res.data?.message || 'Failed to fetch booking details.');
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setDetailsError(
        err.response?.data?.message || 'An error occurred while loading booking details.'
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedBookingId(null);
    setDetailsData(null);
    setDetailsError('');
  };

  // 4. Open Review Form Modal
  const handleOpenReview = (booking) => {
    setReviewBooking(booking);
    setRating(5);
    setComment('');
    setReviewError('');
  };

  const handleCloseReview = () => {
    setReviewBooking(null);
    setRating(5);
    setComment('');
    setReviewError('');
  };

  // View Submitted Review Handler
  const handleViewSubmittedReview = (booking) => {
    const rev = existingReviewsMap[booking.id];
    setViewReviewModal({
      booking,
      review: rev || { rating: 5, comment: 'Review submitted for this completed event.' }
    });
  };

  // 5. Submit Review Handler
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBooking) return;

    if (rating < 1 || rating > 5) {
      setReviewError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');

    try {
      const payload = {
        booking_id: reviewBooking.id,
        rating: Number(rating),
        comment: comment.trim() || undefined
      };

      const res = await api.post('/reviews', payload);

      if (res.data && res.data.status === 'success') {
        triggerToast('success', '🌟 Review submitted successfully! Thank you for your feedback.');
        setReviewedBookingIds(prev => [...prev, reviewBooking.id]);
        setExistingReviewsMap(prev => ({
          ...prev,
          [reviewBooking.id]: {
            rating: Number(rating),
            comment: comment.trim() || undefined,
            created_at: new Date().toISOString().split('T')[0]
          }
        }));
        handleCloseReview();
      } else {
        setReviewError(res.data?.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      if (err.response?.status === 409) {
        setReviewError('A review has already been submitted for this booking.');
        setReviewedBookingIds(prev => [...prev, reviewBooking.id]);
      } else {
        setReviewError(
          err.response?.data?.message || 'An error occurred while submitting your review. Please try again.'
        );
      }
    } finally {
      setReviewSubmitting(false);
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

  // Filtering & Sorting Logic
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingBookings = bookings
    .filter(b => b.event_date >= todayStr && b.status !== 'cancelled')
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const filteredBookings = bookings.filter(b => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') {
      return b.event_date >= todayStr && b.status !== 'cancelled';
    }
    return b.status === statusFilter;
  });

  // Formatting Helpers
  const formatCurrency = (amount) => {
    return amount != null && amount >= 0 
      ? `₹${Number(amount).toLocaleString('en-IN')}` 
      : '₹0';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'badge-success';
      case 'completed':
        return 'badge-info';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="my-bookings-page">
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
                <button type="button" className="sidebar-link active">
                  📅 My Bookings ({bookings.length})
                </button>
              </li>
              <li>
                <Link to="/dashboard/quotations" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📝 My Quotations
                </Link>
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
              My <span className="gradient-text">Venue Bookings</span>
            </h1>
            <p className="page-header-subtitle">
              Manage your confirmed venue bookings, inspect itemized pricing breakdowns, and leave reviews for completed events.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchBookings}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* 3. Dedicated Upcoming Bookings Section */}
          <section className="glass-card dashboard-section upcoming-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">✨ Upcoming Bookings</h2>
              <span className="count-tag">{upcomingBookings.length} Future Events</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="upcoming-cards-grid">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="glass-card upcoming-card-item">
                    <div className="ucard-header">
                      <span className="ucard-badge">🏰 Confirmed Venue</span>
                      <span className={`status-pill ${getStatusBadgeClass(b.status)}`}>
                        ● {getStatusLabel(b.status)}
                      </span>
                    </div>

                    <h3 className="ucard-title">{b.venue_name}</h3>
                    <p className="ucard-location">📍 {b.venue_city}</p>

                    <div className="ucard-meta-grid">
                      <div className="umeta-item">
                        <span className="umeta-label">Event Date</span>
                        <span className="umeta-val">📅 {b.event_date}</span>
                      </div>
                      <div className="umeta-item">
                        <span className="umeta-label">Guest Capacity</span>
                        <span className="umeta-val">👥 {b.guest_count} Guests</span>
                      </div>
                      <div className="umeta-item">
                        <span className="umeta-label">Total Amount</span>
                        <span className="umeta-val price-val">{formatCurrency(b.total_amount)}</span>
                      </div>
                    </div>

                    <div className="ucard-footer">
                      <button
                        type="button"
                        className="btn btn-secondary btn-block"
                        onClick={() => handleOpenDetails(b.id)}
                      >
                        🔍 View Booking Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">No Upcoming Bookings</h3>
                <p className="empty-state-text">
                  You have no scheduled future venue bookings. Explore our curated venues to plan your next event.
                </p>
                <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  🔍 Explore Venues
                </Link>
              </div>
            )}
          </section>

          {/* 4. Status Filter Tabs */}
          <div className="glass-card filter-tabs-card">
            <div className="filter-tabs-container">
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setStatusFilter('upcoming')}
              >
                Upcoming ({upcomingBookings.length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'confirmed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('confirmed')}
              >
                Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Completed ({bookings.filter(b => b.status === 'completed').length})
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
              </button>
            </div>
          </div>

          {/* 5. Booking List Section */}
          {loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading your booking records...</p>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="booking-cards-stack">
              {filteredBookings.map((b) => (
                <div key={b.id} className="glass-card booking-full-card">
                  <div className="bcard-header">
                    <div className="bcard-title-group">
                      <span className="bcard-icon">🏰</span>
                      <div>
                        <h3 className="bcard-venue-name">{b.venue_name}</h3>
                        <span className="bcard-location">📍 {b.venue_city} • Booking #{b.id}</span>
                      </div>
                    </div>

                    <div className="bcard-status-box">
                      <span className={`status-pill ${getStatusBadgeClass(b.status)}`}>
                        ● {getStatusLabel(b.status)}
                      </span>
                    </div>
                  </div>

                  <div className="bcard-body-grid">
                    <div className="bspec-item">
                      <span className="bspec-label">Event Date</span>
                      <span className="bspec-val">📅 {b.event_date}</span>
                    </div>

                    <div className="bspec-item">
                      <span className="bspec-label">Guest Capacity</span>
                      <span className="bspec-val">👥 {b.guest_count} Guests</span>
                    </div>

                    <div className="bspec-item">
                      <span className="bspec-label">Advance Paid</span>
                      <span className="bspec-val">{formatCurrency(b.advance_paid)}</span>
                    </div>

                    <div className="bspec-item">
                      <span className="bspec-label">Total Amount</span>
                      <span className="bspec-val price-val">{formatCurrency(b.total_amount)}</span>
                    </div>
                  </div>

                  <div className="bcard-footer-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenDetails(b.id)}
                    >
                      🔍 View Details & Items
                    </button>

                    {b.status === 'completed' && (
                      reviewedBookingIds.includes(b.id) ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ borderColor: '#22c55e', color: '#4ade80' }}
                          onClick={() => handleViewSubmittedReview(b)}
                        >
                          ✓ Review Submitted
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleOpenReview(b)}
                        >
                          ⭐ Write a Review
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card empty-quotations-card">
              <div className="empty-qicon">📅</div>
              <h3 className="empty-qtitle">
                {statusFilter === 'all' ? 'No Booking Records Found' : `No ${getStatusLabel(statusFilter)} Bookings`}
              </h3>
              <p className="empty-qtext">
                {statusFilter === 'all' 
                  ? 'Accept a custom quotation from your requested venues to confirm your booking date.'
                  : `You currently have no booking records with status "${getStatusLabel(statusFilter)}".`}
              </p>
              <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                🔍 Browse Venues
              </Link>
            </div>
          )}

        </main>
      </div>

      {/* 6. Booking Details & Itemized Quotation Modal */}
      {selectedBookingId && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="glass-card modal-content qdetails-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Booking Details #{selectedBookingId}
                </h2>
                {detailsData && (
                  <span className="modal-subtitle-venue">
                    {detailsData.venue_name} ({detailsData.venue_city})
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
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Fetching booking details...</p>
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
                    <span className="qmeta-label">Booking ID</span>
                    <span className="qmeta-val">#{detailsData.id}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Venue</span>
                    <span className="qmeta-val">{detailsData.venue_name} ({detailsData.venue_city})</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Event Date</span>
                    <span className="qmeta-val">{detailsData.event_date}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Guest Count</span>
                    <span className="qmeta-val">{detailsData.guest_count} Guests</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Advance Paid</span>
                    <span className="qmeta-val">{formatCurrency(detailsData.advance_paid)}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Booking Status</span>
                    <span className={`status-pill ${getStatusBadgeClass(detailsData.status)}`}>
                      ● {getStatusLabel(detailsData.status)}
                    </span>
                  </div>
                </div>

                {/* Itemized Quotation Table */}
                <div className="itemized-section">
                  <h3 className="itemized-heading">Itemized Quotation Breakdown</h3>
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
                      No itemized breakdown associated with this booking.
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

                  {detailsData.status === 'completed' && (
                    !reviewedBookingIds.includes(detailsData.id) ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          handleCloseDetails();
                          handleOpenReview(detailsData);
                        }}
                      >
                        ⭐ Write a Review
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ borderColor: '#22c55e', color: '#4ade80' }}
                        onClick={() => {
                          handleCloseDetails();
                          handleViewSubmittedReview(detailsData);
                        }}
                      >
                        ✓ View Submitted Review
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 7. Write a Review Modal */}
      {reviewBooking && (
        <div className="modal-overlay" onClick={handleCloseReview}>
          <div className="glass-card modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">⭐ Write a Review</h2>
                <span className="modal-subtitle-venue">For {reviewBooking.venue_name}</span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseReview}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="review-form-body">
                {reviewError && (
                  <div className="filter-validation-error" style={{ marginBottom: '1rem' }}>
                    ⚠️ {reviewError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Rating (1 to 5 Stars) *</label>
                  <div className="star-rating-picker">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= rating ? 'selected' : ''}`}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    ))}
                    <span className="rating-num-label">{rating} / 5 Stars</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.2rem' }}>
                  <label htmlFor="review-comment" className="form-label">
                    Your Review & Experience (Optional)
                  </label>
                  <textarea
                    id="review-comment"
                    className="form-control"
                    rows="4"
                    placeholder="Share details about the venue service, ambiance, hospitality, and event experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={reviewSubmitting}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseReview}
                  disabled={reviewSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. View Submitted Review Modal */}
      {viewReviewModal && (
        <div className="modal-overlay" onClick={() => setViewReviewModal(null)}>
          <div className="glass-card modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">⭐ Your Submitted Review</h2>
                <span className="modal-subtitle-venue">For {viewReviewModal.booking.venue_name}</span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setViewReviewModal(null)}>
                ✕
              </button>
            </div>

            <div className="confirm-body" style={{ padding: '1rem 0' }}>
              <div className="submitted-review-box" style={{
                padding: '1.25rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem', color: '#ffd700', fontWeight: 'bold' }}>
                    {'★'.repeat(viewReviewModal.review?.rating || 5)}{'☆'.repeat(5 - (viewReviewModal.review?.rating || 5))}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: '600' }}>
                    ✓ Verified Review
                  </span>
                </div>
                {viewReviewModal.review?.comment ? (
                  <p style={{ fontStyle: 'italic', color: '#e2e8f0', lineHeight: 1.5, margin: 0 }}>
                    "{viewReviewModal.review.comment}"
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    No written comment provided.
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setViewReviewModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
