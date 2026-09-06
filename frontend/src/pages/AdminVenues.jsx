import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';
import './AdminUsers.css';
import './AdminVenues.css';

const AdminVenues = () => {
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

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [filterApproval, setFilterApproval] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchVenues = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/admin/venues');
      if (res.data && res.data.status === 'success') {
        setVenues(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch venues:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch platform venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchVenues();
    }
  }, []);

  // Handle Approval Status Change (Approved, Rejected, Pending)
  const handleUpdateApproval = async (venue, newStatus) => {
    const actionLabel = newStatus === 'approved' ? 'APPROVE' : (newStatus === 'rejected' ? 'REJECT' : 'set to PENDING');
    const confirmMsg = `Are you sure you want to ${actionLabel} venue "${venue.name}" (#${venue.id})?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(venue.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.put(`/admin/venues/${venue.id}/status`, { status: newStatus });
      if (res.data && res.data.status === 'success') {
        setSuccessMessage(`Successfully updated "${venue.name}" approval status to '${newStatus}'.`);
        setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, status: newStatus } : v));
      }
    } catch (err) {
      console.error('Failed to update venue approval status:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to update venue approval status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Active/Inactive Toggle
  const handleToggleActive = async (venue) => {
    const newActive = !venue.is_active;
    const confirmMsg = `Are you sure you want to mark venue "${venue.name}" as ${newActive ? 'ACTIVE' : 'INACTIVE'}?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(venue.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.put(`/admin/venues/${venue.id}/active`, { is_active: newActive });
      if (res.data && res.data.status === 'success') {
        setSuccessMessage(`Successfully marked "${venue.name}" as ${newActive ? 'active' : 'inactive'}.`);
        setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, is_active: newActive } : v));
      }
    } catch (err) {
      console.error('Failed to toggle venue active state:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to toggle venue active state.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter Logic
  const filteredVenues = venues.filter(venue => {
    if (filterApproval !== 'all' && venue.status !== filterApproval) return false;
    if (filterActive !== 'all') {
      const isActiveBool = filterActive === 'active';
      if (venue.is_active !== isActiveBool) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = venue.name?.toLowerCase().includes(q);
      const matchCity = venue.city?.toLowerCase().includes(q);
      const matchOwner = venue.owner_name?.toLowerCase().includes(q) || venue.owner_email?.toLowerCase().includes(q);
      return matchName || matchCity || matchOwner;
    }
    return true;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab="venues" 
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
              <h1 className="admin-page-title">Venue Approval & Control</h1>
              <p className="admin-page-subtitle">Approve pending venues, manage venue visibility, and inspect owner listings</p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchVenues} disabled={loading}>
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

        {/* Filter & Control Bar */}
        <div className="admin-glass-card admin-filter-bar">
          <div className="filter-group">
            <label className="filter-label">Search Venues:</label>
            <input 
              type="text" 
              className="admin-input-search"
              placeholder="Search by venue name, city, owner..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Approval Status:</label>
            <select 
              className="admin-select"
              value={filterApproval}
              onChange={(e) => setFilterApproval(e.target.value)}
            >
              <option value="all">All Approvals ({venues.length})</option>
              <option value="pending">Pending ({venues.filter(v => v.status === 'pending').length})</option>
              <option value="approved">Approved ({venues.filter(v => v.status === 'approved').length})</option>
              <option value="rejected">Rejected ({venues.filter(v => v.status === 'rejected').length})</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Active Flag:</label>
            <select 
              className="admin-select"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="all">All Visibility</option>
              <option value="active">Active ({venues.filter(v => v.is_active).length})</option>
              <option value="inactive">Inactive ({venues.filter(v => !v.is_active).length})</option>
            </select>
          </div>
        </div>

        {/* Venues Table */}
        {loading ? (
          <div className="admin-loading-container">
            <div className="spinner"></div>
            <p>Loading venue records...</p>
          </div>
        ) : (
          <div className="admin-glass-card table-wrapper-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Venue ID</th>
                    <th>Venue Name</th>
                    <th>Owner</th>
                    <th>City</th>
                    <th>Capacity</th>
                    <th>Base Price</th>
                    <th>Approval Status</th>
                    <th>Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-table-cell">
                        No venue records found matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVenues.map(v => (
                      <tr key={v.id}>
                        <td className="font-mono">#{v.id}</td>
                        <td>
                          <Link to={`/venues/${v.id}`} className="venue-name-link" target="_blank">
                            {v.name}
                          </Link>
                        </td>
                        <td>
                          <div className="owner-info">
                            <span className="font-semibold">{v.owner_name || `Owner #${v.owner_id}`}</span>
                            <span className="owner-email">{v.owner_email || ''}</span>
                          </div>
                        </td>
                        <td>{v.city}</td>
                        <td>{v.capacity_min} - {v.capacity_max} guests</td>
                        <td className="font-mono">₹{v.base_price?.toLocaleString()}</td>
                        <td>
                          <span className={`status-pill status-${v.status}`}>
                            {v.status}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${v.is_active ? 'status-active' : 'status-inactive'}`}>
                            {v.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons-group">
                            {v.status === 'pending' && (
                              <>
                                <button
                                  className="btn-action btn-approve"
                                  onClick={() => handleUpdateApproval(v, 'approved')}
                                  disabled={updatingId === v.id}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-action btn-reject"
                                  onClick={() => handleUpdateApproval(v, 'rejected')}
                                  disabled={updatingId === v.id}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {v.status === 'approved' && (
                              <button
                                className="btn-action btn-reject"
                                onClick={() => handleUpdateApproval(v, 'rejected')}
                                disabled={updatingId === v.id}
                              >
                                Revoke (Reject)
                              </button>
                            )}

                            {v.status === 'rejected' && (
                              <button
                                className="btn-action btn-approve"
                                onClick={() => handleUpdateApproval(v, 'approved')}
                                disabled={updatingId === v.id}
                              >
                                Approve
                              </button>
                            )}

                            <button
                              className={`btn-action ${v.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                              onClick={() => handleToggleActive(v)}
                              disabled={updatingId === v.id}
                              title="Toggle active status"
                            >
                              {v.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
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

export default AdminVenues;
