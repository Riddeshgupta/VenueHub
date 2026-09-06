import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';
import './AdminUsers.css';
import './AdminBookings.css';
import './AdminQuotations.css';

const AdminQuotations = () => {
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

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters & Modal
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchQuotations = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/admin/quotations');
      if (res.data && res.data.status === 'success') {
        setQuotations(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch platform quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchQuotations();
    }
  }, []);

  // Filter Logic
  const filteredQuotations = quotations.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase();
      const matchCustomer = q.customer_name?.toLowerCase().includes(sq) || q.customer_email?.toLowerCase().includes(sq);
      const matchVenue = q.venue_name?.toLowerCase().includes(sq);
      const matchId = q.id?.toString().includes(sq);
      const matchEventType = q.event_type_name?.toLowerCase().includes(sq);
      return matchCustomer || matchVenue || matchId || matchEventType;
    }
    return true;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab="quotations" 
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
              <h1 className="admin-page-title">Quotations Monitoring</h1>
              <p className="admin-page-subtitle">Track customer event quotation requests, owner offers, and acceptance statuses</p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchQuotations} disabled={loading}>
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
            <label className="filter-label">Search Quotations:</label>
            <input 
              type="text" 
              className="admin-input-search"
              placeholder="Search customer, venue, quotation ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Quotation Status:</label>
            <select 
              className="admin-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses ({quotations.length})</option>
              <option value="pending">Pending ({quotations.filter(q => q.status === 'pending').length})</option>
              <option value="quoted">Quoted ({quotations.filter(q => q.status === 'quoted').length})</option>
              <option value="accepted">Accepted ({quotations.filter(q => q.status === 'accepted').length})</option>
              <option value="rejected">Rejected ({quotations.filter(q => q.status === 'rejected').length})</option>
              <option value="expired">Expired ({quotations.filter(q => q.status === 'expired').length})</option>
            </select>
          </div>
        </div>

        {/* Quotations Table */}
        {loading ? (
          <div className="admin-loading-container">
            <div className="spinner"></div>
            <p>Loading quotation records...</p>
          </div>
        ) : (
          <div className="admin-glass-card table-wrapper-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Quotation ID</th>
                    <th>Customer</th>
                    <th>Venue</th>
                    <th>Event Type</th>
                    <th>Event Date</th>
                    <th>Guests</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-table-cell">
                        No quotation requests found matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map(q => (
                      <tr key={q.id}>
                        <td className="font-mono">#{q.id}</td>
                        <td>
                          <div className="customer-info">
                            <span className="font-semibold">{q.customer_name || `Customer #${q.customer_id}`}</span>
                            <span className="customer-email">{q.customer_email || ''}</span>
                          </div>
                        </td>
                        <td className="font-semibold">{q.venue_name || `Venue #${q.venue_id}`}</td>
                        <td>{q.event_type_name || 'Standard Event'}</td>
                        <td>{q.event_date}</td>
                        <td>{q.guest_count} guests</td>
                        <td className="font-mono font-semibold">
                          {q.total_amount ? `₹${q.total_amount.toLocaleString()}` : '—'}
                        </td>
                        <td>
                          <span className={`status-pill status-${q.status}`}>
                            {q.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-action btn-view-detail"
                            onClick={() => setSelectedQuotation(q)}
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

        {/* Quotation Detail Modal */}
        {selectedQuotation && (
          <div className="modal-backdrop" onClick={() => setSelectedQuotation(null)}>
            <div className="modal-content admin-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Quotation Details — #{selectedQuotation.id}</h3>
                <button className="modal-close" onClick={() => setSelectedQuotation(null)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Quotation ID</span>
                    <span className="detail-value font-mono">#{selectedQuotation.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`status-pill status-${selectedQuotation.status}`}>
                      {selectedQuotation.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Name</span>
                    <span className="detail-value font-semibold">{selectedQuotation.customer_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Email</span>
                    <span className="detail-value">{selectedQuotation.customer_email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Venue</span>
                    <span className="detail-value font-semibold">{selectedQuotation.venue_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Event Type</span>
                    <span className="detail-value">{selectedQuotation.event_type_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Event Date</span>
                    <span className="detail-value">{selectedQuotation.event_date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Guest Count</span>
                    <span className="detail-value">{selectedQuotation.guest_count} guests</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Amount</span>
                    <span className="detail-value font-mono font-semibold" style={{ color: '#10b981', fontSize: '18px' }}>
                      {selectedQuotation.total_amount ? `₹${selectedQuotation.total_amount.toLocaleString()}` : 'Awaiting Price Quote'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Requested On</span>
                    <span className="detail-value">{selectedQuotation.created_at || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedQuotation(null)}>
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

export default AdminQuotations;
