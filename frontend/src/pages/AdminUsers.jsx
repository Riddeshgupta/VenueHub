import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';
import './AdminUsers.css';

const AdminUsers = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // Access Control Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/admin/users');
      if (res.data && res.data.status === 'success') {
        setUsers(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, []);

  // Handle Toggle User Active/Inactive Status
  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      alert('Security Protection: You cannot deactivate your own admin account.');
      return;
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = `Are you sure you want to mark user "${user.full_name}" (${user.email}) as ${newStatus.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(user.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.put(`/admin/users/${user.id}/status`, { status: newStatus });
      if (res.data && res.data.status === 'success') {
        setSuccessMessage(`Successfully updated ${user.full_name}'s status to '${newStatus}'.`);
        // Refresh users state
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    // Role filter
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    // Status filter
    if (filterStatus !== 'all' && user.status !== filterStatus) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = user.full_name?.toLowerCase().includes(q);
      const matchEmail = user.email?.toLowerCase().includes(q);
      const matchPhone = user.phone?.toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab="users" 
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
              <h1 className="admin-page-title">User Account Management</h1>
              <p className="admin-page-subtitle">View and manage registered customers, venue owners, and platform administrators</p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchUsers} disabled={loading}>
            🔄 Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <span>✓ {successMessage}</span>
          </div>
        )}

        {/* Filters & Search Control Bar */}
        <div className="admin-glass-card admin-filter-bar">
          <div className="filter-group">
            <label className="filter-label">Search Users:</label>
            <input 
              type="text" 
              className="admin-input-search"
              placeholder="Search by name, email, phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Role:</label>
            <select 
              className="admin-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles ({users.length})</option>
              <option value="customer">Customers ({users.filter(u => u.role === 'customer').length})</option>
              <option value="venue_owner">Venue Owners ({users.filter(u => u.role === 'venue_owner').length})</option>
              <option value="admin">Admins ({users.filter(u => u.role === 'admin').length})</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Account Status:</label>
            <select 
              className="admin-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active ({users.filter(u => u.status === 'active').length})</option>
              <option value="inactive">Inactive ({users.filter(u => u.status === 'inactive').length})</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="admin-loading-container">
            <div className="spinner"></div>
            <p>Loading user accounts...</p>
          </div>
        ) : (
          <div className="admin-glass-card table-wrapper-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-table-cell">
                        No user accounts found matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td className="font-mono">#{user.id}</td>
                        <td className="font-semibold">{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>{user.phone || 'N/A'}</td>
                        <td>
                          <span className={`role-badge role-${user.role}`}>
                            {user.role === 'venue_owner' ? 'Venue Owner' : user.role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill status-${user.status}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="text-muted">{user.created_at || 'N/A'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {user.id === currentUser?.id ? (
                            <span className="self-badge" title="Your account">Current Admin</span>
                          ) : (
                            <button
                              className={`btn-action ${user.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                              onClick={() => handleToggleStatus(user)}
                              disabled={updatingId === user.id}
                            >
                              {updatingId === user.id ? 'Updating...' : (user.status === 'active' ? 'Deactivate' : 'Activate')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUsers;
