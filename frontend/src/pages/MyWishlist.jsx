import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './MyWishlist.css';

const MyWishlist = () => {
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
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingIds, setDeletingIds] = useState([]);

  // Toast Notification State
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // 2. Fetch Customer Wishlist & Enrich with Rating/Facilities
  const fetchWishlist = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/wishlist/my');
      if (res.data && res.data.status === 'success') {
        const rawItems = Array.isArray(res.data.data) ? res.data.data : [];

        // Enrich items with reviews & details concurrently
        const enrichedPromises = rawItems.map(async (item) => {
          try {
            const [revRes, detRes] = await Promise.all([
              api.get(`/venues/${item.venue_id}/reviews`).catch(() => ({ data: { average_rating: 0 } })),
              api.get(`/venues/${item.venue_id}/details`).catch(() => ({ data: { data: { facilities: [] } } }))
            ]);

            const revData = revRes.data?.data || revRes.data || {};
            const detData = detRes.data?.data || {};

            return {
              ...item,
              rating: revData.average_rating || 0,
              facilities: detData.facilities || []
            };
          } catch (e) {
            return { ...item, rating: 0, facilities: [] };
          }
        });

        const finalItems = await Promise.all(enrichedPromises);
        setWishlistItems(finalItems);
      } else {
        setErrorMessage(res.data?.message || 'Failed to load wishlist.');
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch saved venues. Please check if the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'customer') {
      fetchWishlist();
      window.scrollTo(0, 0);
    }
  }, []);

  // 3. Remove Item from Wishlist
  const handleRemoveFromWishlist = async (venueId) => {
    if (deletingIds.includes(venueId)) return;

    setDeletingIds(prev => [...prev, venueId]);

    try {
      const res = await api.delete(`/wishlist/${venueId}`);
      if (res.data && res.data.status === 'success') {
        setWishlistItems(prev => prev.filter(item => item.venue_id !== venueId));
        triggerToast('success', '❤️ Venue removed from your wishlist.');
        window.dispatchEvent(new Event('wishlistUpdated'));
      } else {
        triggerToast('warning', res.data?.message || 'Failed to remove venue from wishlist.');
      }
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      triggerToast('warning', err.response?.data?.message || 'An error occurred while removing venue.');
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== venueId));
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

  const formatCurrency = (amount) => {
    return amount != null && amount >= 0 
      ? `₹${Number(amount).toLocaleString('en-IN')}` 
      : 'Price on request';
  };

  if (!currentUser) return null;

  return (
    <div className="my-wishlist-page">
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
                <Link to="/dashboard/quotations" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📝 My Quotations
                </Link>
              </li>
              <li>
                <button type="button" className="sidebar-link active">
                  ❤️ Wishlist ({wishlistItems.length})
                </button>
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
              My <span className="gradient-text">Saved Wishlist</span>
            </h1>
            <p className="page-header-subtitle">
              Your favorite event venues saved for quick access, comparison, and booking requests.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchWishlist}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* 3. Wishlist Cards Grid / List */}
          {loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading your saved wishlist venues...</p>
            </div>
          ) : wishlistItems.length > 0 ? (
            <div className="wishlist-grid">
              {wishlistItems.map((item) => (
                <div key={item.id} className="glass-card wishlist-card">
                  <div className="wcard-header">
                    <div className="wcard-title-group">
                      <span className="wcard-icon">🏰</span>
                      <div>
                        <h3 className="wcard-venue-name">{item.venue_name}</h3>
                        <span className="wcard-location">
                          📍 {item.venue_city}{item.venue_address ? `, ${item.venue_address}` : ''}
                        </span>
                      </div>
                    </div>
                    {item.rating > 0 && (
                      <div className="wcard-rating" title={`${item.rating} star rating`}>
                        ⭐ {item.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div className="wcard-body-specs">
                    <div className="wspec-item">
                      <span className="wspec-label">Capacity</span>
                      <span className="wspec-val">👥 {item.capacity_min} - {item.capacity_max} Guests</span>
                    </div>

                    <div className="wspec-item">
                      <span className="wspec-label">Starting Price</span>
                      <span className="wspec-val price-val">{formatCurrency(item.base_price)}</span>
                    </div>
                  </div>

                  {item.facilities && item.facilities.length > 0 && (
                    <div className="wcard-facilities">
                      <span className="wspec-label">Facilities: </span>
                      <span className="facilities-tags">
                        {item.facilities.slice(0, 3).map(f => f.name).join(', ')}
                        {item.facilities.length > 3 ? '...' : ''}
                      </span>
                    </div>
                  )}

                  <div className="wcard-footer-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(`/venues/${item.venue_id}`)}
                    >
                      🔍 View Details
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-remove-wishlist"
                      disabled={deletingIds.includes(item.venue_id)}
                      onClick={() => handleRemoveFromWishlist(item.venue_id)}
                    >
                      {deletingIds.includes(item.venue_id) ? 'Removing...' : '💔 Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card empty-quotations-card">
              <div className="empty-qicon">❤️</div>
              <h3 className="empty-qtitle">No Saved Venues Yet</h3>
              <p className="empty-qtext">
                Save venues you like and compare them later. Explore our venue directory to discover perfect event spaces.
              </p>
              <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                🔍 Explore Venues
              </Link>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default MyWishlist;
