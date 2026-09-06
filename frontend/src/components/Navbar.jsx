import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getUser, isLoggedIn, logout } from '../utils/auth';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [compareCount, setCompareCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Sync compare count helper
  const syncCompareCount = () => {
    try {
      const stored = localStorage.getItem('venuehub_compare');
      const list = stored ? JSON.parse(stored) : [];
      setCompareCount(Array.isArray(list) ? list.length : 0);
    } catch (e) {
      setCompareCount(0);
    }
  };

  // Sync unread notification count helper
  const fetchUnreadCount = async () => {
    if (!isLoggedIn()) {
      setUnreadNotifCount(0);
      return;
    }
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data && res.data.status === 'success') {
        setUnreadNotifCount(res.data.data?.unread_count || 0);
      }
    } catch (err) {
      setUnreadNotifCount(0);
    }
  };

  // Sync authentication, compare state, and unread notifications on route changes
  useEffect(() => {
    try {
      const loggedIn = isLoggedIn();
      const user = getUser();
      setAuthenticated(loggedIn);
      setCurrentUser(user);
      syncCompareCount();

      if (loggedIn) {
        fetchUnreadCount();
      } else {
        setUnreadNotifCount(0);
      }
    } catch (error) {
      console.error('Error fetching authentication state in Navbar:', error);
      setAuthenticated(false);
      setCurrentUser(null);
    }
  }, [location.pathname]);

  // Listen to window storage, compare, and notification events
  useEffect(() => {
    const handleStorageChange = () => {
      const loggedIn = isLoggedIn();
      setAuthenticated(loggedIn);
      setCurrentUser(getUser());
      syncCompareCount();
      if (loggedIn) fetchUnreadCount();
    };

    const handleNotifUpdate = () => {
      if (isLoggedIn()) fetchUnreadCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('compareUpdated', syncCompareCount);
    window.addEventListener('notificationsUpdated', handleNotifUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('compareUpdated', syncCompareCount);
      window.removeEventListener('notificationsUpdated', handleNotifUpdate);
    };
  }, []);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  // Logout Handler
  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setCurrentUser(null);
    setUnreadNotifCount(0);
    closeMenu();
    navigate('/', { replace: true });
  };

  // Helper to extract first initial for avatar
  const getInitial = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <div className="logo-badge">V</div>
          <span>Venue<span className="gradient-text">Hub</span></span>
        </Link>

        {/* Mobile Toggle Button */}
        <button 
          className="mobile-toggle" 
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Nav Menu */}
        <div className={`nav-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
          <nav>
            <ul className="nav-links">
              <li>
                <NavLink 
                  to="/" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMenu}
                  end
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/venues" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Venues
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/compare" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Compare {compareCount > 0 && `(${compareCount})`}
                </NavLink>
              </li>
              {authenticated && currentUser?.role === 'customer' && (
                <li>
                  <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    Dashboard
                  </NavLink>
                </li>
              )}
              {authenticated && currentUser?.role === 'venue_owner' && (
                <li>
                  <NavLink 
                    to="/owner/dashboard" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    Owner Dashboard
                  </NavLink>
                </li>
              )}
              {authenticated && currentUser?.role === 'admin' && (
                <li>
                  <NavLink 
                    to="/admin/dashboard" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenu}
                  >
                    Admin Dashboard
                  </NavLink>
                </li>
              )}
              {authenticated && (
                <li>
                  <NavLink 
                    to="/dashboard/notifications" 
                    className={({ isActive }) => `nav-link nav-notif-link ${isActive ? 'active' : ''}`}
                    onClick={closeMenu}
                    title="Notifications"
                  >
                    🔔
                    {unreadNotifCount > 0 && (
                      <span className="nav-notif-badge">{unreadNotifCount}</span>
                    )}
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          {/* Conditional Action Buttons based on Auth State */}
          <div className="nav-actions">
            {authenticated && currentUser ? (
              <>
                <div className="user-profile-badge" title={currentUser.email || ''}>
                  <div className="user-avatar">
                    {getInitial(currentUser.full_name)}
                  </div>
                  <span className="user-name">{currentUser.full_name || 'User'}</span>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={closeMenu}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
