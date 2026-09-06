import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Guard (Allows customer, venue_owner, admin)
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  // Primary State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [markingReadIds, setMarkingReadIds] = useState([]);

  // Toast Notification State
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // 2. Fetch Notifications List
  const fetchNotifications = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.status === 'success') {
        setNotifications(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setErrorMessage(res.data?.message || 'Failed to load notifications.');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch notifications. Please check if the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn()) {
      fetchNotifications();
      window.scrollTo(0, 0);
    }
  }, []);

  // 3. Mark Single Notification as Read
  const handleMarkAsRead = async (notificationId) => {
    if (markingReadIds.includes(notificationId)) return;

    setMarkingReadIds(prev => [...prev, notificationId]);

    try {
      const res = await api.put(`/notifications/${notificationId}/read`);
      if (res.data && res.data.status === 'success') {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        triggerToast('warning', res.data?.message || 'Failed to update notification status.');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      triggerToast('warning', err.response?.data?.message || 'Failed to mark notification as read.');
    } finally {
      setMarkingReadIds(prev => prev.filter(id => id !== notificationId));
    }
  };

  // 4. Mark All Notifications as Read
  const handleMarkAllAsRead = async () => {
    if (markingAll) return;

    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadCount === 0) return;

    setMarkingAll(true);

    try {
      const res = await api.put('/notifications/read-all');
      if (res.data && res.data.status === 'success') {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        triggerToast('success', '✓ All notifications marked as read.');
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        triggerToast('warning', res.data?.message || 'Failed to mark all as read.');
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
      triggerToast('warning', err.response?.data?.message || 'Failed to mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  // Handle Contextual Action Navigation (View Quotations / View Bookings)
  const handleContextualAction = async (n, targetPath) => {
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }
    navigate(targetPath);
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!currentUser) return null;

  // Infer contextual links from notification content safely
  const getContextualAction = (n) => {
    const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
    
    if (text.includes('quotation') || text.includes('quote')) {
      const path = currentUser?.role === 'venue_owner' ? '/owner/quotations' : '/dashboard/quotations';
      return { label: '📝 View Quotation', path };
    }

    if (text.includes('booking') || text.includes('reservation')) {
      const path = currentUser?.role === 'venue_owner' ? '/owner/bookings' : '/dashboard/bookings';
      return { label: '📅 View Booking', path };
    }

    if (text.includes('review') || text.includes('rating')) {
      if (currentUser?.role === 'admin') return { label: '⭐ View Reviews', path: '/admin/reviews' };
      if (currentUser?.role === 'venue_owner') return { label: '🏰 View Venue', path: '/owner/venues' };
    }

    return null;
  };

  return (
    <div className="notifications-page">
      {/* Toast Notice Banner */}
      {toastNotice.text && (
        <div className={`toast-notice toast-${toastNotice.type}`}>
          {toastNotice.text}
        </div>
      )}

      {currentUser.role === 'admin' ? (
        <div className="admin-layout">
          <AdminSidebar 
            activeTab="notifications" 
            mobileOpen={sidebarMobileOpen} 
            toggleMobileSidebar={(val) => setSidebarMobileOpen(typeof val === 'boolean' ? val : !sidebarMobileOpen)} 
          />
          <main className="admin-main-content">
            <NotificationsContent 
              notifications={notifications}
              loading={loading}
              errorMessage={errorMessage}
              unreadCount={unreadCount}
              markingAll={markingAll}
              markingReadIds={markingReadIds}
              handleMarkAllAsRead={handleMarkAllAsRead}
              handleMarkAsRead={handleMarkAsRead}
              handleContextualAction={handleContextualAction}
              getContextualAction={getContextualAction}
              fetchNotifications={fetchNotifications}
              currentUser={currentUser}
            />
          </main>
        </div>
      ) : (
        <div className="container dashboard-container">
          {/* Mobile Sidebar Toggle Button */}
          <button
            className="dashboard-mobile-toggle"
            onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
          >
            {sidebarMobileOpen ? '✕ Close Sidebar' : '☰ Dashboard Menu'}
          </button>

          {/* Sidebar Navigation for Customer / Owner */}
          <aside className={`dashboard-sidebar glass-card ${sidebarMobileOpen ? 'is-open' : ''}`}>
            <div className="sidebar-profile">
              <div className="profile-avatar">
                {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="profile-info">
                <h3 className="profile-name">{currentUser.full_name}</h3>
                <span className="profile-role-badge">
                  {currentUser.role === 'venue_owner' ? 'Venue Owner' : 'Customer'}
                </span>
              </div>
            </div>

            <nav className="sidebar-nav">
              <ul>
                {currentUser.role === 'venue_owner' ? (
                  <>
                    <li>
                      <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                        📊 Overview
                      </Link>
                    </li>
                    <li>
                      <Link to="/owner/venues" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                        🏰 My Venues
                      </Link>
                    </li>
                    <li>
                      <Link to="/owner/quotations" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                        📝 Quotation Requests
                      </Link>
                    </li>
                    <li>
                      <Link to="/owner/bookings" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                        📅 Bookings
                      </Link>
                    </li>
                    <li>
                      <button type="button" className="sidebar-link active">
                        🔔 Notifications ({unreadCount})
                      </button>
                    </li>
                  </>
                ) : (
                  <>
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
                      <Link to="/dashboard/wishlist" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                        ❤️ Wishlist
                      </Link>
                    </li>
                    <li>
                      <button type="button" className="sidebar-link active">
                        🔔 Notifications ({unreadCount})
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </nav>

            <div className="sidebar-footer">
              <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content Body */}
          <main className="dashboard-main-content">
            <NotificationsContent 
              notifications={notifications}
              loading={loading}
              errorMessage={errorMessage}
              unreadCount={unreadCount}
              markingAll={markingAll}
              markingReadIds={markingReadIds}
              handleMarkAllAsRead={handleMarkAllAsRead}
              handleMarkAsRead={handleMarkAsRead}
              handleContextualAction={handleContextualAction}
              getContextualAction={getContextualAction}
              fetchNotifications={fetchNotifications}
              currentUser={currentUser}
            />
          </main>
        </div>
      )}
    </div>
  );
};

// Reusable Inner Content Component
const NotificationsContent = ({
  notifications,
  loading,
  errorMessage,
  unreadCount,
  markingAll,
  markingReadIds,
  handleMarkAllAsRead,
  handleMarkAsRead,
  handleContextualAction,
  getContextualAction,
  fetchNotifications,
  currentUser
}) => {
  const backLinkPath = currentUser.role === 'venue_owner' 
    ? '/owner/dashboard' 
    : (currentUser.role === 'admin' ? '/admin/dashboard' : '/dashboard');

  return (
    <>
      {/* Header Bar */}
      <div className="glass-card page-header-card">
        <div className="header-top-row">
          <Link to={backLinkPath} className="back-link">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="notif-header-flex">
          <div>
            <h1 className="page-header-title">
              Notifications <span className="gradient-text">Center</span>
            </h1>
            <p className="page-header-subtitle">
              Stay updated on venue quotations, booking confirmations, and event updates.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-mark-all"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? 'Processing...' : '✓ Mark All as Read'}
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
          ⚠️ {errorMessage}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchNotifications}
            style={{ marginLeft: '1rem' }}
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
          <div className="loading-spinner"></div>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading your notifications...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="notifications-cards-stack">
          {notifications.map((n) => {
            const action = getContextualAction(n);
            return (
              <div
                key={n.id}
                className={`glass-card notification-item-card ${n.is_read ? 'is-read' : 'is-unread'}`}
              >
                <div className="notif-card-header">
                  <div className="notif-icon-title-group">
                    <span className="notif-badge-icon">
                      {n.is_read ? '🔕' : '🔔'}
                    </span>
                    <div>
                      <h3 className="notif-item-title">{n.title}</h3>
                      <span className="notif-date-stamp">🕒 {n.created_at}</span>
                    </div>
                  </div>

                  <div className="notif-status-badge-box">
                    {!n.is_read ? (
                      <span className="status-pill badge-warning">
                        ● Unread
                      </span>
                    ) : (
                      <span className="status-pill badge-secondary">
                        Read
                      </span>
                    )}
                  </div>
                </div>

                <div className="notif-body-text">
                  <p>{n.message}</p>
                </div>

                <div className="notif-footer-actions" style={{ gap: '10px' }}>
                  {action && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleContextualAction(n, action.path)}
                    >
                      {action.label}
                    </button>
                  )}

                  {!n.is_read && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={markingReadIds.includes(n.id)}
                      onClick={() => handleMarkAsRead(n.id)}
                    >
                      {markingReadIds.includes(n.id) ? 'Updating...' : '✓ Mark as Read'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card empty-quotations-card">
          <div className="empty-qicon">🔔</div>
          <h3 className="empty-qtitle">You're All Caught Up!</h3>
          <p className="empty-qtext">
            You don't have any notifications yet. Updates on venue quotations and booking responses will appear here.
          </p>
          <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            🔍 Browse Venues
          </Link>
        </div>
      )}
    </>
  );
};

export default Notifications;
