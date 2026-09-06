import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import AdminSidebar from '../components/AdminSidebar';
import './AdminDashboard.css';
import './AdminUsers.css';
import './AdminBookings.css';
import './AdminReviews.css';

const AdminReviews = () => {
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

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters & Modal
  const [filterRating, setFilterRating] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/admin/reviews');
      if (res.data && res.data.status === 'success') {
        setReviews(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch platform reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchReviews();
    }
  }, []);

  // Filter Logic
  const filteredReviews = reviews.filter(r => {
    if (filterRating !== 'all' && r.rating !== parseInt(filterRating)) return false;
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase();
      const matchCustomer = r.customer_name?.toLowerCase().includes(sq);
      const matchVenue = r.venue_name?.toLowerCase().includes(sq);
      const matchComment = r.comment?.toLowerCase().includes(sq);
      const matchId = r.id?.toString().includes(sq) || r.booking_id?.toString().includes(sq);
      return matchCustomer || matchVenue || matchComment || matchId;
    }
    return true;
  });

  // Render Stars Helper
  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab="reviews" 
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
              <h1 className="admin-page-title">Reviews Inspection</h1>
              <p className="admin-page-subtitle">Inspect customer reviews, star ratings, and feedback comments across all venues</p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchReviews} disabled={loading}>
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
            <label className="filter-label">Search Reviews:</label>
            <input 
              type="text" 
              className="admin-input-search"
              placeholder="Search customer, venue, comment keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Star Rating:</label>
            <select 
              className="admin-select"
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
            >
              <option value="all">All Ratings ({reviews.length})</option>
              <option value="5">5 Stars ({reviews.filter(r => r.rating === 5).length})</option>
              <option value="4">4 Stars ({reviews.filter(r => r.rating === 4).length})</option>
              <option value="3">3 Stars ({reviews.filter(r => r.rating === 3).length})</option>
              <option value="2">2 Stars ({reviews.filter(r => r.rating === 2).length})</option>
              <option value="1">1 Star ({reviews.filter(r => r.rating === 1).length})</option>
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        {loading ? (
          <div className="admin-loading-container">
            <div className="spinner"></div>
            <p>Loading review records...</p>
          </div>
        ) : (
          <div className="admin-glass-card table-wrapper-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Review ID</th>
                    <th>Venue</th>
                    <th>Customer</th>
                    <th>Star Rating</th>
                    <th>Comment</th>
                    <th>Booking ID</th>
                    <th>Date Posted</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-table-cell">
                        No reviews found matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map(r => (
                      <tr key={r.id}>
                        <td className="font-mono">#{r.id}</td>
                        <td className="font-semibold">{r.venue_name || `Venue #${r.venue_id}`}</td>
                        <td className="font-semibold">{r.customer_name || `Customer #${r.customer_id}`}</td>
                        <td>
                          <span className="star-rating-display" title={`${r.rating} out of 5 stars`}>
                            {renderStars(r.rating)}
                          </span>
                        </td>
                        <td>
                          <div className="comment-preview-text">
                            {r.comment ? (r.comment.length > 50 ? `${r.comment.substring(0, 50)}...` : r.comment) : <em className="text-muted">No comment text</em>}
                          </div>
                        </td>
                        <td className="font-mono">#{r.booking_id}</td>
                        <td className="text-muted">{r.created_at || 'N/A'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-action btn-view-detail"
                            onClick={() => setSelectedReview(r)}
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

        {/* Review Detail Modal */}
        {selectedReview && (
          <div className="modal-backdrop" onClick={() => setSelectedReview(null)}>
            <div className="modal-content admin-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Review Details — #{selectedReview.id}</h3>
                <button className="modal-close" onClick={() => setSelectedReview(null)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="detail-grid" style={{ marginBottom: '20px' }}>
                  <div className="detail-item">
                    <span className="detail-label">Review ID</span>
                    <span className="detail-value font-mono">#{selectedReview.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Booking ID</span>
                    <span className="detail-value font-mono">#{selectedReview.booking_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Name</span>
                    <span className="detail-value font-semibold">{selectedReview.customer_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Venue</span>
                    <span className="detail-value font-semibold">{selectedReview.venue_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Star Rating</span>
                    <span className="detail-value star-rating-display" style={{ fontSize: '18px' }}>
                      {renderStars(selectedReview.rating)} ({selectedReview.rating}/5)
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Posted Date</span>
                    <span className="detail-value">{selectedReview.created_at || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Customer Comment</span>
                  <div className="review-comment-full-box">
                    {selectedReview.comment || <em>No text comment submitted.</em>}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedReview(null)}>
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

export default AdminReviews;
