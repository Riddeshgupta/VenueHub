import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './OwnerDashboard.css';

const OwnerDashboard = () => {
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

  // Primary Data States
  const [venues, setVenues] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [reviewStats, setReviewStats] = useState({ totalReviews: 0, weightedRating: 0 });
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  // 2. Fetch Real Owner Dashboard Data from Backend
  const fetchOwnerDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Fetch Owner's Venues
      const venuesRes = await api.get('/venues/my');
      if (venuesRes.data && venuesRes.data.status === 'success') {
        const ownerVenues = Array.isArray(venuesRes.data.data) ? venuesRes.data.data : [];
        setVenues(ownerVenues);

        if (ownerVenues.length > 0) {
          // 2. Fetch Quotations, Bookings, and Reviews for all owner venues in parallel
          const venueIds = ownerVenues.map(v => v.id);

          const quotationsPromises = venueIds.map(id => api.get(`/venues/${id}/quotations`));
          const bookingsPromises = venueIds.map(id => api.get(`/venues/${id}/bookings`));
          const reviewsPromises = venueIds.map(id => api.get(`/venues/${id}/reviews`));

          const [quotationsResults, bookingsResults, reviewsResults] = await Promise.all([
            Promise.allSettled(quotationsPromises),
            Promise.allSettled(bookingsPromises),
            Promise.allSettled(reviewsPromises)
          ]);

          // Aggregate Quotations
          let aggregatedQuotations = [];
          quotationsResults.forEach(res => {
            if (res.status === 'fulfilled' && res.value.data?.status === 'success') {
              const list = Array.isArray(res.value.data.data) ? res.value.data.data : [];
              aggregatedQuotations = aggregatedQuotations.concat(list);
            }
          });
          setAllQuotations(aggregatedQuotations);

          // Aggregate Bookings
          let aggregatedBookings = [];
          bookingsResults.forEach(res => {
            if (res.status === 'fulfilled' && res.value.data?.status === 'success') {
              const list = Array.isArray(res.value.data.data) ? res.value.data.data : [];
              aggregatedBookings = aggregatedBookings.concat(list);
            }
          });
          setAllBookings(aggregatedBookings);

          // Compute Weighted Average Rating
          let totalReviewCount = 0;
          let weightedRatingSum = 0;

          reviewsResults.forEach(res => {
            if (res.status === 'fulfilled' && res.value.data?.status === 'success') {
              const data = res.value.data.data || {};
              const count = Number(data.total_reviews) || 0;
              const avg = Number(data.average_rating) || 0;
              if (count > 0) {
                totalReviewCount += count;
                weightedRatingSum += (avg * count);
              }
            }
          });

          const finalWeightedRating = totalReviewCount > 0 
            ? (weightedRatingSum / totalReviewCount).toFixed(1) 
            : 0;

          setReviewStats({
            totalReviews: totalReviewCount,
            weightedRating: finalWeightedRating
          });
        }
      } else {
        setErrorMessage(venuesRes.data?.message || 'Failed to load owner venue data.');
      }
    } catch (err) {
      console.error('Error fetching owner dashboard data:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch owner dashboard metrics. Please check network connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'venue_owner') {
      fetchOwnerDashboardData();
      window.scrollTo(0, 0);
    }
  }, []);

  // Compute Metrics & Subsets
  const todayStr = new Date().toISOString().split('T')[0];

  const pendingQuotations = allQuotations.filter(q => q.status === 'pending');
  const upcomingBookings = allBookings
    .filter(b => b.event_date >= todayStr && b.status === 'confirmed')
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const showPlaceholderNotice = (featureName) => {
    setNoticeMessage(`"${featureName}" will be available in Stage 7.`);
    setTimeout(() => setNoticeMessage(''), 3500);
  };

  const formatCurrency = (amount) => {
    return amount != null && amount >= 0 
      ? `₹${Number(amount).toLocaleString('en-IN')}` 
      : '₹0';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return 'badge-success';
      case 'pending':
      case 'quoted':
        return 'badge-warning';
      case 'rejected':
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  if (!currentUser) return null;

  return (
    <div className="owner-dashboard-page">
      {/* Toast Notice Banner */}
      {noticeMessage && (
        <div className="toast-notice toast-info">
          ℹ️ {noticeMessage}
        </div>
      )}

      <div className="container dashboard-container">
        
        {/* Mobile Sidebar Toggle Button */}
        <button
          className="dashboard-mobile-toggle"
          onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        >
          {sidebarMobileOpen ? '✕ Close Sidebar' : '☰ Owner Dashboard Menu'}
        </button>

        {/* 1. Sidebar Navigation */}
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
                <button type="button" className="sidebar-link active">
                  📊 Overview Dashboard
                </button>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link">
                  🏰 My Venues ({venues.length})
                </Link>
              </li>
              <li>
                <Link to="/owner/quotations" className="sidebar-link">
                  📝 Quotation Requests ({pendingQuotations.length})
                </Link>
              </li>
              <li>
                <Link to="/owner/bookings" className="sidebar-link">
                  📅 Bookings ({allBookings.length})
                </Link>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link">
                  🗓️ Availability
                </Link>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link">
                  💰 Pricing
                </Link>
              </li>
              <li>
                <button 
                  type="button" 
                  className="sidebar-link" 
                  onClick={() => showPlaceholderNotice('Venue Reviews')}
                >
                  ⭐ Reviews ({reviewStats.totalReviews})
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  className="sidebar-link" 
                  onClick={() => showPlaceholderNotice('Owner Notifications')}
                >
                  🔔 Notifications
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

        {/* 2. Main Content */}
        <main className="dashboard-main-content">
          
          {/* Welcome Header Card */}
          <div className="glass-card welcome-header-card owner-welcome-card">
            <div className="welcome-text">
              <h1 className="welcome-title">
                Welcome back, <span className="gradient-text">{currentUser.full_name}</span>!
              </h1>
              <p className="welcome-subtitle">
                Venue Owner Control Center — Monitor venue performance, respond to custom price requests, and oversee upcoming event bookings.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchOwnerDashboardData}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Refresh
              </button>
            </div>
          )}

          {/* 3. Overview Metrics Grid */}
          <div className="metrics-cards-grid">
            {/* Card 1: My Venues */}
            <div className="glass-card metric-card" onClick={() => navigate('/owner/venues')}>
              <div className="metric-icon-box icon-purple">🏰</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : venues.length}</span>
                <span className="metric-label">My Listed Venues</span>
              </div>
            </div>

            {/* Card 2: Pending Quotations */}
            <div className="glass-card metric-card" onClick={() => navigate('/owner/quotations')}>
              <div className="metric-icon-box icon-amber">📝</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : pendingQuotations.length}</span>
                <span className="metric-label">Pending Quotations</span>
              </div>
            </div>

            {/* Card 3: Upcoming Bookings */}
            <div className="glass-card metric-card" onClick={() => navigate('/owner/bookings')}>
              <div className="metric-icon-box icon-blue">📅</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : upcomingBookings.length}</span>
                <span className="metric-label">Upcoming Bookings</span>
              </div>
            </div>

            {/* Card 4: Average Rating */}
            <div className="glass-card metric-card" onClick={() => showPlaceholderNotice('Reviews')}>
              <div className="metric-icon-box icon-pink">⭐</div>
              <div className="metric-details">
                <span className="metric-value">
                  {loading ? '...' : reviewStats.totalReviews > 0 ? `${reviewStats.weightedRating} ★` : 'No reviews'}
                </span>
                <span className="metric-label">
                  {reviewStats.totalReviews > 0 ? `From ${reviewStats.totalReviews} reviews` : 'No ratings yet'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Quick Actions Panel */}
          <section className="glass-card dashboard-section">
            <h2 className="dashboard-section-title">⚡ Owner Quick Actions</h2>
            <div className="quick-actions-grid">
              <Link to="/owner/venues" className="btn btn-primary quick-action-btn">
                ➕ Add New Venue
              </Link>
              <Link to="/owner/quotations" className="btn btn-secondary quick-action-btn">
                📝 View Quotation Requests
              </Link>
              <Link to="/owner/bookings" className="btn btn-secondary quick-action-btn">
                📅 View Bookings
              </Link>
              <Link to="/owner/venues" className="btn btn-secondary quick-action-btn">
                🗓️ Manage Availability
              </Link>
            </div>
          </section>

          {/* 5. My Venues Inventory Section */}
          <section className="glass-card dashboard-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">🏰 My Listed Venues</h2>
              <span className="count-tag">{venues.length} Total</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : venues.length > 0 ? (
              <div className="owner-venues-grid">
                {venues.map((v) => (
                  <div key={v.id} className="glass-card owner-venue-card">
                    <div className="ov-header">
                      <h3 className="ov-title">{v.name}</h3>
                      <div className="ov-badges">
                        <span className={`status-pill ${getStatusBadgeClass(v.status)}`}>
                          ● {v.status}
                        </span>
                        <span className={`status-pill ${v.is_active ? 'badge-info' : 'badge-secondary'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <p className="ov-location">📍 {v.city}, {v.state}</p>

                    <div className="ov-specs">
                      <div className="ovspec-item">
                        <span className="ovspec-label">Capacity</span>
                        <span className="ovspec-val">👥 {v.capacity_min} - {v.capacity_max}</span>
                      </div>
                      <div className="ovspec-item">
                        <span className="ovspec-label">Base Price</span>
                        <span className="ovspec-val price-val">{formatCurrency(v.base_price)}</span>
                      </div>
                    </div>

                    <div className="ov-footer">
                      <Link to={`/venues/${v.id}`} className="btn btn-secondary btn-block">
                        🔍 View Public Page
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="empty-state-icon">🏰</div>
                <h3 className="empty-state-title">No Venues Listed Yet</h3>
                <p className="empty-state-text">
                  List your banquet hall, lawn, or auditorium to receive quotation requests and bookings from customers.
                </p>
                <Link
                  to="/owner/venues"
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                >
                  ➕ List Your First Venue
                </Link>
              </div>
            )}
          </section>

          {/* 6. Recent Quotation Requests Section */}
          <section className="glass-card dashboard-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">📝 Recent Quotation Requests</h2>
              <span className="count-tag">{allQuotations.length} Requests</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : allQuotations.length > 0 ? (
              <div className="quotations-list">
                {allQuotations.slice(0, 5).map((q) => (
                  <div key={q.id} className="quotation-card-item">
                    <div className="item-main-info">
                      <div className="item-icon-badge">📝</div>
                      <div>
                        <h3 className="item-title">{q.venue_name || `Venue #${q.venue_id}`}</h3>
                        <p className="item-subtext">
                          🎉 {q.event_type_name || 'Event'} • 👥 {q.guest_count} Guests
                        </p>
                      </div>
                    </div>

                    <div className="item-spec-col">
                      <span className="spec-meta-label">Planned Date</span>
                      <span className="spec-meta-val">{q.event_date}</span>
                    </div>

                    <div className="item-spec-col">
                      <span className="spec-meta-label">Quoted Total</span>
                      <span className="spec-meta-val price-val">{formatCurrency(q.total_amount)}</span>
                    </div>

                    <div className="item-status-col">
                      <span className={`status-pill ${getStatusBadgeClass(q.status)}`}>
                        ● {q.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="empty-state-icon">📝</div>
                <h3 className="empty-state-title">No Quotation Requests</h3>
                <p className="empty-state-text">
                  You haven't received any quotation requests for your venues yet.
                </p>
              </div>
            )}
          </section>

          {/* 7. Upcoming Bookings Section */}
          <section className="glass-card dashboard-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">📅 Upcoming Confirmed Bookings</h2>
              <span className="count-tag">{upcomingBookings.length} Confirmed</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="bookings-list">
                {upcomingBookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="booking-card-item">
                    <div className="item-main-info">
                      <div className="item-icon-badge">📅</div>
                      <div>
                        <h3 className="item-title">{b.venue_name}</h3>
                        <p className="item-subtext">
                          👤 {b.customer_name || 'Customer'} ({b.customer_phone || b.customer_email || 'Verified'})
                        </p>
                      </div>
                    </div>

                    <div className="item-spec-col">
                      <span className="spec-meta-label">Event Date</span>
                      <span className="spec-meta-val">{b.event_date}</span>
                    </div>

                    <div className="item-spec-col">
                      <span className="spec-meta-label">Total Amount</span>
                      <span className="spec-meta-val price-val">{formatCurrency(b.total_amount)}</span>
                    </div>

                    <div className="item-status-col">
                      <span className={`status-pill ${getStatusBadgeClass(b.status)}`}>
                        ● {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">No Upcoming Bookings</h3>
                <p className="empty-state-text">
                  There are no upcoming confirmed bookings scheduled for your venues.
                </p>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
};

export default OwnerDashboard;
