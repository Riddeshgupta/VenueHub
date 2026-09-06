import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';
import './AdminUsers.css';
import './AdminBookings.css';

const AdminBookings = () => {
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

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters & Modal
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/admin/bookings');
      if (res.data && res.data.status === 'success') {
        setBookings(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch platform bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchBookings();
    }
  }, []);

  // Filter Logic
  const filteredBookings = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCustomer = b.customer_name?.toLowerCase().includes(q) || b.customer_email?.toLowerCase().includes(q);
      const matchVenue = b.venue_name?.toLowerCase().includes(q);
      const matchId = b.id?.toString().includes(q) || b.quotation_id?.toString().includes(q);
      return matchCustomer || matchVenue || matchId;
    }
    return true;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab="bookings" 
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
              <h1 className="admin-page-title">Platform Bookings Monitoring</h1>
              <p className="admin-page-subtitle">Monitor customer venue bookings, confirmed schedules, and completed events</p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchBookings} disabled={loading}>
            🔄 Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="admin-glass-card admin-filter-bar">
          <div className="filter-group">
            <label className="filter-label">Search Bookings:</label>
            <input 
              type="text" 
              className="admin-input-search"
              placeholder="Search customer name, venue, booking ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Booking Status:</label>
            <select 
              className="admin-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses ({bookings.length})</option>
              <option value="confirmed">Confirmed ({bookings.filter(b => b.status === 'confirmed').length})</option>
              <option value="completed">Completed ({bookings.filter(b => b.status === 'completed').length})</option>
              <option value="cancelled">Cancelled ({bookings.filter(b => b.status === 'cancelled').length})</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="admin-loading-container">
            <div className="spinner"></div>
            <p>Loading booking records...</p>
          </div>
        ) : (
          <div className="admin-glass-card table-wrapper-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer</th>
                    <th>Venue</th>
                    <th>Event Date</th>
                    <th>Guest Count</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Quotation</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-table-cell">
                        No booking records found matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(b => (
                      <tr key={b.id}>
                        <td className="font-mono">#{b.id}</td>
                        <td>
                          <div className="customer-info">
                            <span className="font-semibold">{b.customer_name || `Customer #${b.customer_id}`}</span>
                            <span className="customer-email">{b.customer_email || ''}</span>
                          </div>
                        </td>
                        <td className="font-semibold">{b.venue_name || `Venue #${b.venue_id}`}</td>
                        <td>{b.event_date}</td>
                        <td>{b.guest_count} guests</td>
                        <td className="font-mono font-semibold">₹{b.total_amount?.toLocaleString()}</td>
                        <td>
                          <span className={`status-pill status-${b.status}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="font-mono">
                          {b.quotation_id ? `#${b.quotation_id}` : 'Direct'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-action btn-view-detail"
                            onClick={() => setSelectedBooking(b)}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Booking Detail Modal */}
        {selectedBooking && (
          <div className="modal-backdrop" onClick={() => setSelectedBooking(null)}>
            <div className="modal-content admin-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Booking Details — #{selectedBooking.id}</h3>
                <button className="modal-close" onClick={() => setSelectedBooking(null)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Booking ID</span>
                    <span className="detail-value font-mono">#{selectedBooking.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`status-pill status-${selectedBooking.status}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Name</span>
                    <span className="detail-value font-semibold">{selectedBooking.customer_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Email</span>
                    <span className="detail-value">{selectedBooking.customer_email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Venue</span>
                    <span className="detail-value font-semibold">{selectedBooking.venue_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Event Date</span>
                    <span className="detail-value">{selectedBooking.event_date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Guest Count</span>
                    <span className="detail-value">{selectedBooking.guest_count} guests</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Amount</span>
                    <span className="detail-value font-mono font-semibold" style={{ color: '#10b981', fontSize: '18px' }}>
                      ₹{selectedBooking.total_amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Quotation ID</span>
                    <span className="detail-value font-mono">
                      {selectedBooking.quotation_id ? `#${selectedBooking.quotation_id}` : 'None'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created At</span>
                    <span className="detail-value">{selectedBooking.created_at || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedBooking(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminBookings;
