import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  const [stats, setStats] = useState({
    total_users: 0,
    total_venues: 0,
    pending_venues: 0,
    total_bookings: 0,
    total_quotations: 0,
    total_reviews: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 2. Fetch Real Dashboard Data
  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Fetch stats and recent entities in parallel
      const [statsRes, venuesRes, bookingsRes, reviewsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/venues'),
        api.get('/admin/bookings'),
        api.get('/admin/reviews')
      ]);

      if (statsRes.data && statsRes.data.status === 'success') {
        setStats(statsRes.data.data);
      }

      // Build recent activity timeline from real fetched data
      let activities = [];
      
      const allVenues = (venuesRes.data && venuesRes.data.data) || [];
      const allBookings = (bookingsRes.data && bookingsRes.data.data) || [];
      const allReviews = (reviewsRes.data && reviewsRes.data.data) || [];

      allVenues.slice(0, 3).forEach(v => {
        activities.push({
          id: `v-${v.id}`,
          type: 'venue',
          title: `New Venue Added: "${v.name}"`,
          subtitle: `By ${v.owner_name || 'Owner'} in ${v.city}`,
          status: v.status,
          date: v.created_at,
          icon: '🏰',
          link: '/admin/venues'
        });
      });

      allBookings.slice(0, 3).forEach(b => {
        activities.push({
          id: `b-${b.id}`,
          type: 'booking',
          title: `Booking #${b.id} (${b.status})`,
          subtitle: `${b.customer_name} at ${b.venue_name} (₹${b.total_amount?.toLocaleString()})`,
          status: b.status,
          date: b.created_at,
          icon: '📅',
          link: '/admin/bookings'
        });
      });

      allReviews.slice(0, 3).forEach(r => {
        activities.push({
          id: `r-${r.id}`,
          type: 'review',
          title: `Review #${r.id} (${r.rating}★)`,
          subtitle: `By ${r.customer_name} for ${r.venue_name}`,
          status: 'posted',
          date: r.created_at,
          icon: '⭐',
          link: '/admin/reviews'
        });
      });

      // Sort activities descending by date
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivities(activities.slice(0, 6));

    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load system dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchDashboardData();
    }
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab="dashboard" 
        mobileOpen={mobileSidebarOpen} 
        toggleMobileSidebar={(val) => setMobileSidebarOpen(typeof val === 'boolean' ? val : !mobileSidebarOpen)} 
      />

      <main className="admin-main-content">
        <div className="admin-header-bar">
          <div className="admin-title-area">
            <button 
              className="admin-mobile-toggle-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              ☰
            </button>
            <div>
              <h1 className="admin-page-title">Admin Dashboard</h1>
              <p className="admin-page-subtitle">Welcome back, {currentUser?.full_name || 'Admin'}!</p>
            </div>
          </div>
          
          <button 
            className="btn btn-secondary btn-sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            🔄 Refresh Data
          </button>
        </div>

        {errorMessage && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="admin-loading-container">
            <div className="spinner"></div>
            <p>Loading system statistics...</p>
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className="admin-stats-grid">
              <Link to="/admin/users" className="admin-stat-card card-purple">
                <div className="stat-card-header">
                  <span className="stat-icon">👥</span>
                  <span className="stat-badge">Platform</span>
                </div>
                <div className="stat-card-value">{stats.total_users}</div>
                <div className="stat-card-label">Total Users</div>
              </Link>

              <Link to="/admin/venues" className="admin-stat-card card-blue">
                <div className="stat-card-header">
                  <span className="stat-icon">🏰</span>
                  <span className="stat-badge">Venues</span>
                </div>
                <div className="stat-card-value">{stats.total_venues}</div>
                <div className="stat-card-label">Total Venues</div>
              </Link>

              <Link to="/admin/venues" className="admin-stat-card card-amber">
                <div className="stat-card-header">
                  <span className="stat-icon">⏳</span>
                  <span className="stat-badge warning">Action Needed</span>
                </div>
                <div className="stat-card-value">{stats.pending_venues}</div>
                <div className="stat-card-label">Pending Approvals</div>
              </Link>

              <Link to="/admin/bookings" className="admin-stat-card card-emerald">
                <div className="stat-card-header">
                  <span className="stat-icon">📅</span>
                  <span className="stat-badge success">Active</span>
                </div>
                <div className="stat-card-value">{stats.total_bookings}</div>
                <div className="stat-card-label">Total Bookings</div>
              </Link>

              <Link to="/admin/quotations" className="admin-stat-card card-indigo">
                <div className="stat-card-header">
                  <span className="stat-icon">📜</span>
                  <span className="stat-badge">Requests</span>
                </div>
                <div className="stat-card-value">{stats.total_quotations}</div>
                <div className="stat-card-label">Total Quotations</div>
              </Link>

              <Link to="/admin/reviews" className="admin-stat-card card-rose">
                <div className="stat-card-header">
                  <span className="stat-icon">⭐</span>
                  <span className="stat-badge">Feedback</span>
                </div>
                <div className="stat-card-value">{stats.total_reviews}</div>
                <div className="stat-card-label">Total Reviews</div>
              </Link>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="admin-dashboard-row">
              {/* Quick Admin Actions */}
              <div className="admin-glass-card quick-actions-card">
                <h3 className="card-section-title">⚡ Quick Management</h3>
                <div className="quick-actions-list">
                  <Link to="/admin/venues" className="quick-action-btn">
                    <span className="action-icon">🔍</span>
                    <div>
                      <div className="action-title">Review Pending Venues</div>
                      <div className="action-desc">{stats.pending_venues} venue(s) awaiting approval</div>
                    </div>
                  </Link>

                  <Link to="/admin/users" className="quick-action-btn">
                    <span className="action-icon">👤</span>
                    <div>
                      <div className="action-title">User Accounts</div>
                      <div className="action-desc">Manage {stats.total_users} registered accounts</div>
                    </div>
                  </Link>

                  <Link to="/admin/bookings" className="quick-action-btn">
                    <span className="action-icon">📊</span>
                    <div>
                      <div className="action-title">Monitor Bookings</div>
                      <div className="action-desc">Inspect {stats.total_bookings} venue bookings</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="admin-glass-card recent-activity-card">
                <h3 className="card-section-title">🕒 Recent System Activity</h3>
                {recentActivities.length === 0 ? (
                  <p className="empty-state-text">No recent system activity found.</p>
                ) : (
                  <div className="activity-timeline">
                    {recentActivities.map(act => (
                      <Link to={act.link} key={act.id} className="activity-item">
                        <div className="activity-icon-badge">{act.icon}</div>
                        <div className="activity-details">
                          <div className="activity-title-row">
                            <span className="activity-title">{act.title}</span>
                            <span className={`status-pill status-${act.status}`}>{act.status}</span>
                          </div>
                          <div className="activity-subtitle">{act.subtitle}</div>
                          <div className="activity-date">{act.date}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
