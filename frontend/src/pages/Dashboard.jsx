import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // Authentication & Access Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'customer') {
      // Redirect non-customer users (e.g. venue owners/admin) for Stage 1
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  // Data States
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [bookings, setBookings] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Active Section / Tab for Sidebar Navigation
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Fetch Real Customer Dashboard Data from Backend
  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Execute all 4 customer dashboard endpoints in parallel
      const [bookingsRes, quotationsRes, wishlistRes, notifRes] = await Promise.allSettled([
        api.get('/bookings/my'),
        api.get('/quotations/my'),
        api.get('/wishlist/my'),
        api.get('/notifications/unread-count')
      ]);

      // 1. Process Bookings
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data?.status === 'success') {
        setBookings(Array.isArray(bookingsRes.value.data.data) ? bookingsRes.value.data.data : []);
      }

      // 2. Process Quotations
      if (quotationsRes.status === 'fulfilled' && quotationsRes.value.data?.status === 'success') {
        setQuotations(Array.isArray(quotationsRes.value.data.data) ? quotationsRes.value.data.data : []);
      }

      // 3. Process Wishlist Count
      if (wishlistRes.status === 'fulfilled' && wishlistRes.value.data?.status === 'success') {
        const list = wishlistRes.value.data.data || [];
        setWishlistCount(list.length);
      }

      // 4. Process Unread Notifications Count
      if (notifRes.status === 'fulfilled' && notifRes.value.data?.status === 'success') {
        setUnreadNotifCount(notifRes.value.data.data?.unread_count || 0);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setErrorMessage('Failed to load dashboard data. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'customer') {
      fetchDashboardData();
      window.scrollTo(0, 0);
    }
  }, []);

  // Compute Metrics Summaries
  const todayStr = new Date().toISOString().split('T')[0];

  // Upcoming bookings: future event date and non-cancelled status
  const upcomingBookings = bookings.filter(b => {
    return b.event_date >= todayStr && b.status !== 'cancelled';
  }).sort((a, b) => a.event_date.localeCompare(b.event_date));

  // Active quotations: pending or quoted status
  const activeQuotationsCount = quotations.filter(q => {
    return q.status === 'pending' || q.status === 'quoted';
  }).length;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    setSidebarMobileOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatCurrency = (amount) => {
    return amount != null && amount > 0 
      ? `₹${Number(amount).toLocaleString('en-IN')}` 
      : 'Quote Pending';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'badge-success';
      case 'quoted':
        return 'badge-info';
      case 'pending':
        return 'badge-warning';
      case 'cancelled':
      case 'rejected':
      case 'expired':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'accepted': return 'Accepted';
      case 'quoted': return 'Quote Received';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Declined';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="dashboard-page">
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
          {/* Customer Profile Summary */}
          <div className="sidebar-profile">
            <div className="profile-avatar">
              {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'C'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{currentUser.full_name}</h3>
              <span className="profile-role-badge">Customer</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <ul>
              <li>
                <button
                  type="button"
                  className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => scrollToSection('overview')}
                >
                  📊 Overview
                </button>
              </li>
              <li>
                <Link
                  to="/dashboard/bookings"
                  className="sidebar-link"
                  onClick={() => setSidebarMobileOpen(false)}
                >
                  📅 My Bookings ({upcomingBookings.length})
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/quotations"
                  className="sidebar-link"
                  onClick={() => setSidebarMobileOpen(false)}
                >
                  📝 My Quotations ({quotations.length})
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/wishlist"
                  className="sidebar-link"
                  onClick={() => setSidebarMobileOpen(false)}
                >
                  ❤️ Wishlist ({wishlistCount})
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/notifications"
                  className="sidebar-link"
                  onClick={() => setSidebarMobileOpen(false)}
                >
                  🔔 Notifications ({unreadNotifCount})
                </Link>
              </li>
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* 2. Main Content Area */}
        <main className="dashboard-main-content">
          
          {/* Welcome Header Banner */}
          <div id="overview" className="glass-card welcome-header-card">
            <div className="welcome-text">
              <h1 className="welcome-title">
                Welcome back, <span className="gradient-text">{currentUser.full_name}</span>!
              </h1>
              <p className="welcome-subtitle">
                Manage your event venues, quotations, bookings, and celebration plans from one central dashboard.
              </p>
            </div>
          </div>

          {/* Error Banner if API fails */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchDashboardData}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Refresh
              </button>
            </div>
          )}

          {/* 3. Metrics Summary Cards Grid */}
          <div className="metrics-cards-grid">
            {/* Card 1: Upcoming Bookings */}
            <div className="glass-card metric-card" onClick={() => scrollToSection('upcoming-bookings')}>
              <div className="metric-icon-box icon-purple">📅</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : upcomingBookings.length}</span>
                <span className="metric-label">Upcoming Bookings</span>
              </div>
            </div>

            {/* Card 2: Active Quotations */}
            <div className="glass-card metric-card" onClick={() => scrollToSection('recent-quotations')}>
              <div className="metric-icon-box icon-blue">📝</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : activeQuotationsCount}</span>
                <span className="metric-label">Active Quotations</span>
              </div>
            </div>

            {/* Card 3: Wishlist Count */}
            <div className="glass-card metric-card" onClick={() => navigate('/venues')}>
              <div className="metric-icon-box icon-pink">❤️</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : wishlistCount}</span>
                <span className="metric-label">Wishlist Venues</span>
              </div>
            </div>

            {/* Card 4: Unread Notifications */}
            <div className="glass-card metric-card">
              <div className="metric-icon-box icon-amber">🔔</div>
              <div className="metric-details">
                <span className="metric-value">{loading ? '...' : unreadNotifCount}</span>
                <span className="metric-label">Unread Alerts</span>
              </div>
            </div>
          </div>

          {/* 4. Quick Actions Panel */}
          <section className="glass-card dashboard-section">
            <h2 className="dashboard-section-title">⚡ Quick Actions</h2>
            <div className="quick-actions-grid">
              <Link to="/venues" className="btn btn-secondary quick-action-btn">
                🔍 Find Venues
              </Link>
              <Link to="/compare" className="btn btn-secondary quick-action-btn">
                ⚖️ Compare Venues
              </Link>
              <Link to="/dashboard/quotations" className="btn btn-secondary quick-action-btn">
                📝 View My Quotations
              </Link>
              <Link to="/dashboard/bookings" className="btn btn-secondary quick-action-btn">
                📅 View My Bookings
              </Link>
            </div>
          </section>

          {/* 5. Upcoming Bookings Section */}
          <section id="upcoming-bookings" className="glass-card dashboard-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">📅 Upcoming Bookings</h2>
              <span className="count-tag">{upcomingBookings.length} Booked</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="bookings-list">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="booking-card-item">
                    <div className="item-main-info">
                      <div className="item-icon-badge">🏰</div>
                      <div>
                        <h3 className="item-title">{b.venue_name}</h3>
                        <p className="item-subtext">📍 {b.venue_city} • {b.guest_count} Guests</p>
                      </div>
                    </div>

                    <div className="item-spec-col">
                      <span className="spec-meta-label">Event Date</span>
                      <span className="spec-meta-val">{b.event_date}</span>
                    </div>

                    <div className="item-spec-col">
                      <span className="spec-meta-label">Total Amount</span>
                      <span className="spec-meta-val price-val">₹{Number(b.total_amount).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="item-status-col">
                      <span className={`status-pill ${getStatusBadgeClass(b.status)}`}>
                        ● {getStatusLabel(b.status)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.4rem' }}
                        onClick={() => navigate(`/venues/${b.venue_id}`)}
                      >
                        View Venue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">No Upcoming Bookings</h3>
                <p className="empty-state-text">
                  You don't have any upcoming venue bookings confirmed yet. Browse our top banquet halls to book your date.
                </p>
                <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  🔍 Explore Venues
                </Link>
              </div>
            )}
          </section>

          {/* 6. Recent Quotations Section */}
          <section id="recent-quotations" className="glass-card dashboard-section">
            <div className="section-header-row">
              <h2 className="dashboard-section-title">📝 My Quotation Requests</h2>
              <span className="count-tag">{quotations.length} Requests</span>
            </div>

            {loading ? (
              <div className="loading-container" style={{ padding: '2rem 0' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : quotations.length > 0 ? (
              <div className="quotations-list">
                {quotations.map((q) => (
                  <div key={q.id} className="quotation-card-item">
                    <div className="item-main-info">
                      <div className="item-icon-badge">📝</div>
                      <div>
                        <h3 className="item-title">{q.venue_name || `Venue #${q.venue_id}`}</h3>
                        <p className="item-subtext">
                          🎉 {q.event_type_name || 'Event'} • 📍 {q.venue_city || ''} • {q.guest_count} Guests
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
                        ● {getStatusLabel(q.status)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.4rem' }}
                        onClick={() => navigate(`/venues/${q.venue_id}`)}
                      >
                        View Venue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="empty-state-icon">📝</div>
                <h3 className="empty-state-title">No Quotation Requests Yet</h3>
                <p className="empty-state-text">
                  Request custom quotations from venue owners to receive itemized price breakdowns for your event.
                </p>
                <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  🔍 Request Quotations
                </Link>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
};

export default Dashboard;
