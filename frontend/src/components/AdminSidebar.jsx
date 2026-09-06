import React from 'react';
import { NavLink } from 'react-router-dom';
import './AdminSidebar.css';

const AdminSidebar = ({ activeTab, mobileOpen, toggleMobileSidebar }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { id: 'users', label: 'User Management', path: '/admin/users', icon: '👥' },
    { id: 'venues', label: 'Venue Control', path: '/admin/venues', icon: '🏰' },
    { id: 'bookings', label: 'Bookings Monitoring', path: '/admin/bookings', icon: '📅' },
    { id: 'quotations', label: 'Quotations Monitoring', path: '/admin/quotations', icon: '📜' },
    { id: 'reviews', label: 'Reviews Inspection', path: '/admin/reviews', icon: '⭐' }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="admin-sidebar-backdrop" 
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-badge">ADMIN PORTAL</div>
          <h3 className="admin-sidebar-title">Management System</h3>
        </div>

        <nav className="admin-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `admin-sidebar-link ${isActive || activeTab === item.id ? 'active' : ''}`
                  }
                  onClick={() => toggleMobileSidebar && toggleMobileSidebar(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-status-indicator">
            <span className="status-dot online"></span>
            <span className="status-text">System Active</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
