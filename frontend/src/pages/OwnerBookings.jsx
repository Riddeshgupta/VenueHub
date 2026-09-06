import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './OwnerBookings.css';

const OwnerBookings = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'venue_owner') {
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  // Primary State
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Booking Detail Modal State
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // UI State
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // 2. Fetch Owner Venues & Aggregate Incoming Bookings
  const fetchOwnerBookings = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Step A: Fetch all venues owned by current user
      const venuesRes = await api.get('/venues/my');
      const ownerVenues = venuesRes.data?.data || venuesRes.data?.venues || [];
      setVenues(ownerVenues);

      if (ownerVenues.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Step B: Fetch bookings for each venue concurrently using Promise.allSettled
      const bookingPromises = ownerVenues.map(venue => 
        api.get(`/venues/${venue.id}/bookings`)
          .then(res => {
            const list = res.data?.data || res.data?.bookings || [];
            // Attach venue metadata if not present in row
            return list.map(b => ({
              ...b,
              venue_name: b.venue_name || venue.name,
              venue_city: b.venue_city || venue.city
            }));
          })
          .catch(err => {
            console.error(`Error fetching bookings for venue #${venue.id}:`, err);
            return [];
          })
      );

      const results = await Promise.allSettled(bookingPromises);
      const aggregated = [];

      results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          aggregated.push(...res.value);
        }
      });

      // Sort by event date ascending (upcoming events first), then booking ID desc
      aggregated.sort((a, b) => {
        if (a.event_date === b.event_date) {
          return b.id - a.id;
        }
        return a.event_date.localeCompare(b.event_date);
      });

      setBookings(aggregated);
    } catch (err) {
      console.error('Error fetching owner bookings:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to load bookings for your venues.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'venue_owner') {
      fetchOwnerBookings();
      window.scrollTo(0, 0);
    }
  }, []);

  // 3. Fetch Single Booking Detail (With Itemized Breakdown)
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

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // Helper Calculations & Filters
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingBookings = bookings.filter(b => b.event_date >= todayStr && b.status !== 'cancelled');

  const filteredBookings = bookings.filter(b => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'confirmed') return b.status === 'confirmed';
    if (statusFilter === 'completed') return b.status === 'completed';
    if (statusFilter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

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
    <div className="owner-bookings-page">
      {/* Toast Notice */}
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
              {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'O'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{currentUser.full_name}</h3>
              <span className="profile-role-badge">Venue Owner</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📊 Overview
                </Link>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  🏰 My Venues ({venues.length})
                </Link>
              </li>
              <li>
                <Link to="/owner/quotations" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📝 Quotation Requests
                </Link>
              </li>
              <li>
                <button type="button" className="sidebar-link active">
                  📅 Bookings ({bookings.length})
                </button>
              </li>
            </ul>
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* 2. Main Content Area */}
        <main className="dashboard-main-content">
          
          {/* Header Card */}
          <div className="glass-card page-header-card">
            <div className="header-top-row">
              <Link to="/owner/dashboard" className="back-link">
                ← Back to Owner Dashboard
              </Link>
            </div>
            <h1 className="page-header-title">
              Venue <span className="gradient-text">Bookings Management</span>
            </h1>
            <p className="page-header-subtitle">
              Monitor incoming confirmed venue bookings, track upcoming event dates, and view itemized customer line items.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchOwnerBookings}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Retry
              </button>
            </div>
          )}

          {/* 3. Upcoming Bookings Highlight Section */}
          <section className="glass-card dashboard-section upcoming-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">✨ Upcoming Venue Events</h2>
              <span className="count-tag">{upcomingBookings.length} Upcoming</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="upcoming-cards-grid">
                {upcomingBookings.map(b => (
                  <div key={b.id} className="glass-card upcoming-card-item">
                    <div className="ucard-header">
                      <span className="ucard-badge">🏰 {b.venue_name}</span>
                      <span className={`status-pill ${getStatusBadgeClass(b.status)}`}>
                        ● {getStatusLabel(b.status)}
                      </span>
                    </div>

                    <h3 className="ucard-title">{b.customer_name || `Customer #${b.customer_id}`}</h3>
                    <p className="ucard-location">📞 {b.customer_phone || 'Phone N/A'}</p>

                    <div className="ucard-meta-grid">
                      <div className="umeta-item">
                        <span className="umeta-label">Event Date</span>
                        <span className="umeta-val">📅 {b.event_date}</span>
                      </div>
                      <div className="umeta-item">
                        <span className="umeta-label">Guest Count</span>
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
                <h3 className="empty-state-title">No Upcoming Events Scheduled</h3>
                <p className="empty-state-text">
                  You have no upcoming event bookings across your venues. Incoming customer bookings will appear here.
                </p>
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

          {/* 5. Booking Cards Stack */}
          {loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading venue bookings...</p>
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
                      <span className="bspec-label">Customer Name</span>
                      <span className="bspec-val">👤 {b.customer_name || `User #${b.customer_id}`}</span>
                    </div>

                    <div className="bspec-item">
                      <span className="bspec-label">Event Date</span>
                      <span className="bspec-val">📅 {b.event_date}</span>
                    </div>

                    <div className="bspec-item">
                      <span className="bspec-label">Guest Count</span>
                      <span className="bspec-val">👥 {b.guest_count} Guests</span>
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
                      🔍 View Booking & Quotation Details
                    </button>
                    {b.quotation_id && (
                      <span className="bcard-quote-tag">
                        Quotation #{b.quotation_id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card empty-quotations-card">
              <div className="empty-qicon">📅</div>
              <h3 className="empty-qtitle">
                {venues.length === 0 ? 'No Venues Listed' : 'No Bookings Found'}
              </h3>
              <p className="empty-qtext">
                {venues.length === 0 
                  ? 'Add your first venue listing to start receiving quotation requests and confirmed bookings.'
                  : 'When customers accept your custom quotations and confirm bookings, they will appear here.'}
              </p>
              {venues.length === 0 && (
                <Link to="/owner/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  ➕ Manage My Venues
                </Link>
              )}
            </div>
          )}

        </main>
      </div>

      {/* 6. Booking Detail Modal */}
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
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading booking records...</p>
              </div>
            ) : detailsError ? (
              <div className="filter-validation-error">
                ⚠️ {detailsError}
              </div>
            ) : detailsData ? (
              <div className="qdetails-body">
                {/* Meta Grid */}
                <div className="qdetails-meta-grid">
                  <div className="qmeta-item">
                    <span className="qmeta-label">Customer Name</span>
                    <span className="qmeta-val">{detailsData.customer_name || `User #${detailsData.customer_id}`}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Customer Contact</span>
                    <span className="qmeta-val">{detailsData.customer_phone || detailsData.customer_email || 'N/A'}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Event Date</span>
                    <span className="qmeta-val">{detailsData.event_date}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Guest Capacity</span>
                    <span className="qmeta-val">{detailsData.guest_count} Guests</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Quotation Ref</span>
                    <span className="qmeta-val">{detailsData.quotation_id ? `#${detailsData.quotation_id}` : 'Direct'}</span>
                  </div>
                  <div className="qmeta-item">
                    <span className="qmeta-label">Booking Status</span>
                    <span className={`status-pill ${getStatusBadgeClass(detailsData.status)}`}>
                      ● {getStatusLabel(detailsData.status)}
                    </span>
                  </div>
                </div>

                {/* Itemized Line Items Table */}
                <div className="itemized-section">
                  <h3 className="itemized-heading">Quotation Line Items</h3>
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
                      No itemized quotation breakdown recorded for this booking.
                    </p>
                  )}
                </div>

                {/* Authoritative Total Box */}
                <div className="qdetails-total-box">
                  <span className="total-box-label">Booking Total Amount:</span>
                  <span className="total-box-val">{formatCurrency(detailsData.total_amount)}</span>
                </div>

                <div className="modal-footer-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseDetails}>
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;
