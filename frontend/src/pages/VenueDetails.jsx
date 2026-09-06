import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import './VenueDetails.css';

const VenueDetails = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();

  // Primary Data State
  const [venueData, setVenueData] = useState(null);
  const [pricingItems, setPricingItems] = useState([]);
  const [reviewsData, setReviewsData] = useState({ average_rating: 0, total_reviews: 0, reviews: [] });
  const [masterEventTypes, setMasterEventTypes] = useState([]);

  // Component States
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Interactive Feature States
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isInCompare, setIsInCompare] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState({ type: '', text: '' });

  // Availability Checker State
  const todayStr = new Date().toISOString().split('T')[0];
  const [checkDate, setCheckDate] = useState('');
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Quotation Modal & Form State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    event_type_id: '',
    event_date: '',
    guest_count: '',
    message: ''
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteSuccess, setQuoteSuccess] = useState('');

  const currentUser = getUser();
  const userIsCustomer = isLoggedIn() && currentUser?.role === 'customer';

  // 1. Fetch Venue Details, Pricing, Reviews, and Wishlist Status
  const fetchVenueDetails = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Execute primary requests in parallel
      const [detailsRes, pricingRes, reviewsRes, masterEtRes] = await Promise.all([
        api.get(`/venues/${venueId}/details`),
        api.get(`/venues/${venueId}/pricing`).catch(() => ({ data: { data: [] } })),
        api.get(`/venues/${venueId}/reviews`).catch(() => ({ data: { data: { average_rating: 0, total_reviews: 0, reviews: [] } } })),
        api.get('/event-types').catch(() => ({ data: { data: [] } }))
      ]);

      if (detailsRes.data && detailsRes.data.status === 'success') {
        setVenueData(detailsRes.data.data);
      } else {
        setErrorMessage(detailsRes.data?.message || 'Failed to load venue details.');
      }

      if (pricingRes.data && pricingRes.data.status === 'success') {
        setPricingItems(pricingRes.data.data || []);
      }

      if (reviewsRes.data && reviewsRes.data.status === 'success') {
        setReviewsData(reviewsRes.data.data || { average_rating: 0, total_reviews: 0, reviews: [] });
      }

      if (masterEtRes.data && masterEtRes.data.status === 'success') {
        setMasterEventTypes(masterEtRes.data.data || []);
      }

      // Check wishlist status if customer is logged in
      if (userIsCustomer) {
        try {
          const wishlistRes = await api.get('/wishlist/my');
          if (wishlistRes.data && wishlistRes.data.status === 'success') {
            const myWishlist = wishlistRes.data.data || [];
            const found = myWishlist.some(item => String(item.venue_id) === String(venueId));
            setIsWishlisted(found);
          }
        } catch (e) {
          console.error('Error fetching wishlist:', e);
        }
      }

      // Check Compare status from localStorage
      checkCompareStatus();

    } catch (err) {
      console.error('Error loading venue details:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to load venue details. Please ensure the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenueDetails();
    window.scrollTo(0, 0);
  }, [venueId]);

  // 2. LocalStorage Compare helper
  const getCompareList = () => {
    try {
      const stored = localStorage.getItem('venuehub_compare');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  };

  const checkCompareStatus = () => {
    const list = getCompareList();
    const found = list.some(id => String(id) === String(venueId));
    setIsInCompare(found);
  };

  const handleToggleCompare = () => {
    let list = getCompareList();
    const idStr = String(venueId);
    
    if (list.some(id => String(id) === idStr)) {
      // Remove from compare
      list = list.filter(id => String(id) !== idStr);
      localStorage.setItem('venuehub_compare', JSON.stringify(list));
      window.dispatchEvent(new Event('compareUpdated'));
      setIsInCompare(false);
      triggerNotice('info', 'Removed venue from comparison list.');
    } else {
      // Add to compare (limit max 3 venues)
      if (list.length >= 3) {
        triggerNotice('warning', 'You can compare up to 3 venues at a time.');
        return;
      }
      list.push(Number(venueId));
      localStorage.setItem('venuehub_compare', JSON.stringify(list));
      window.dispatchEvent(new Event('compareUpdated'));
      setIsInCompare(true);
      triggerNotice('success', '✓ Venue added to comparison list successfully!');
    }
  };

  // 3. Wishlist Toggle Handler
  const handleToggleWishlist = async () => {
    if (!isLoggedIn()) {
      triggerNotice('warning', 'Please log in as a customer to add venues to your wishlist.');
      return;
    }

    if (!userIsCustomer) {
      triggerNotice('warning', 'Only customer accounts can add venues to wishlist.');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        // Remove from wishlist
        const res = await api.delete(`/wishlist/${venueId}`);
        if (res.data && res.data.status === 'success') {
          setIsWishlisted(false);
          triggerNotice('info', 'Removed from your wishlist.');
        }
      } else {
        // Add to wishlist
        const res = await api.post('/wishlist', { venue_id: Number(venueId) });
        if (res.data && res.data.status === 'success') {
          setIsWishlisted(true);
          triggerNotice('success', '❤️ Added venue to your wishlist!');
        }
      }
    } catch (err) {
      console.error('Wishlist action error:', err);
      const msg = err.response?.data?.message || 'Failed to update wishlist.';
      triggerNotice('warning', msg);
    } finally {
      setWishlistLoading(false);
    }
  };

  // 4. Availability Check Handler
  const handleCheckAvailability = async (e) => {
    if (e) e.preventDefault();
    if (!checkDate) {
      setAvailabilityResult({ status: 'warning', text: 'Please select a date to check availability.' });
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityResult(null);

    try {
      const res = await api.get(`/venues/${venueId}/availability/${checkDate}`);
      if (res.data && res.data.status === 'success') {
        const record = res.data.data || {};
        const status = record.status || 'available';
        setAvailabilityResult({
          status: status,
          date: checkDate,
          notes: record.notes || ''
        });
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityResult({
        status: 'error',
        text: err.response?.data?.message || 'Failed to verify date availability.'
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

  // 5. Quotation Modal Handlers
  const handleOpenQuoteModal = () => {
    if (!isLoggedIn()) {
      triggerNotice('warning', 'Please log in as a customer to request a quotation.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    if (!userIsCustomer) {
      triggerNotice('warning', 'Only customer accounts can request venue quotations.');
      return;
    }

    // Pre-populate quotation form with venue defaults if available
    const supportedEt = venueData?.event_types || [];
    setQuoteForm({
      event_type_id: supportedEt.length > 0 ? String(supportedEt[0].id) : '',
      event_date: checkDate || '',
      guest_count: venueData?.venue?.capacity_min ? String(venueData.venue.capacity_min) : '',
      message: ''
    });
    setQuoteError('');
    setQuoteSuccess('');
    setShowQuoteModal(true);
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setQuoteError('');
    setQuoteSuccess('');

    // Frontend Validations
    if (!quoteForm.event_type_id) {
      setQuoteError('Please select an event type.');
      return;
    }

    if (!quoteForm.event_date) {
      setQuoteError('Please select your planned event date.');
      return;
    }

    if (!quoteForm.guest_count || parseInt(quoteForm.guest_count, 10) <= 0) {
      setQuoteError('Please enter a valid positive guest count.');
      return;
    }

    const guests = parseInt(quoteForm.guest_count, 10);
    const minCap = venueData?.venue?.capacity_min || 0;
    const maxCap = venueData?.venue?.capacity_max || 99999;

    if (guests < minCap || guests > maxCap) {
      setQuoteError(`Guest count must be between ${minCap} and ${maxCap} for this venue.`);
      return;
    }

    setQuoteSubmitting(true);

    try {
      const payload = {
        venue_id: Number(venueId),
        event_type_id: Number(quoteForm.event_type_id),
        event_date: quoteForm.event_date,
        guest_count: guests,
        message: quoteForm.message.trim() || undefined
      };

      const res = await api.post('/quotations', payload);
      if (res.data && res.data.status === 'success') {
        setQuoteSuccess('✓ Quotation request submitted successfully! The venue owner will review and respond with a customized quote.');
        setTimeout(() => {
          setShowQuoteModal(false);
          setQuoteSuccess('');
        }, 3000);
      }
    } catch (err) {
      console.error('Error submitting quotation:', err);
      const apiMsg = err.response?.data?.message;
      setQuoteError(apiMsg || 'Failed to submit quotation request. Please check your inputs.');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  // Temporary notice banner trigger
  const triggerNotice = (type, text) => {
    setNoticeMessage({ type, text });
    setTimeout(() => {
      setNoticeMessage({ type: '', text: '' });
    }, 4000);
  };

  // Helper formatting functions
  const formatCurrency = (amount) => {
    return amount != null ? `₹${Number(amount).toLocaleString('en-IN')}` : 'On Request';
  };

  const formatPricingType = (type) => {
    const labels = {
      venue_rental: 'Venue Rental',
      food_per_person: 'Food (Per Person)',
      decoration: 'Decoration',
      dj_music: 'DJ & Sound System',
      parking: 'Parking Fee',
      other: 'Other Services',
      tax: 'Taxes & Levies'
    };
    return labels[type] || type.replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="venue-details-page">
        <div className="container">
          <div className="glass-card loading-container" style={{ margin: '4rem 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading venue details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !venueData) {
    return (
      <div className="venue-details-page">
        <div className="container">
          <div className="glass-card error-state-card" style={{ margin: '4rem 0' }}>
            <div style={{ fontSize: '2.5rem' }}>⚠️</div>
            <h3 className="error-state-title">Venue Not Found</h3>
            <p className="error-state-desc">{errorMessage || 'The requested venue could not be found.'}</p>
            <Link to="/venues" className="btn btn-primary">
              ⬅ Back to Venues Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { venue, event_types = [], facilities = [] } = venueData;

  return (
    <div className="venue-details-page">
      {/* Toast Notice Banner */}
      {noticeMessage.text && (
        <div className={`toast-notice toast-${noticeMessage.type}`}>
          {noticeMessage.text}
        </div>
      )}

      <div className="container">
        {/* Navigation Breadcrumb */}
        <div className="details-breadcrumb">
          <Link to="/venues">Venues Catalog</Link> &gt; <span>{venue.name}</span>
        </div>

        {/* 1. Hero Header Banner */}
        <div className="glass-card venue-hero-card">
          <div className="hero-banner-placeholder">
            <div className="hero-icon-badge">🏛️</div>
            <span className="hero-city-tag">📍 {venue.city}, {venue.state}</span>
          </div>

          <div className="venue-hero-content">
            <div className="venue-title-row">
              <div>
                <h1 className="venue-title-name">{venue.name}</h1>
                <p className="venue-address-text">
                  📍 {[venue.address, venue.city, venue.state, venue.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
              
              <div className="hero-actions-group">
                <button
                  type="button"
                  className={`btn ${isWishlisted ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  title="Add to Wishlist"
                >
                  {isWishlisted ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                </button>

                <button
                  type="button"
                  className={`btn ${isInCompare ? 'btn-outline' : 'btn-secondary'}`}
                  onClick={handleToggleCompare}
                  title="Add to Compare"
                >
                  {isInCompare ? '✓ In Compare List' : '⚖️ Add to Compare'}
                </button>
              </div>
            </div>

            {/* Quick Specs Highlight */}
            <div className="quick-specs-bar">
              <div className="quick-spec-item">
                <span className="spec-label">Capacity Range</span>
                <span className="spec-value">{venue.capacity_min} - {venue.capacity_max} Guests</span>
              </div>

              <div className="quick-spec-item">
                <span className="spec-label">Starting Base Price</span>
                <span className="spec-value price-highlight">{formatCurrency(venue.base_price)}</span>
              </div>

              <div className="quick-spec-item">
                <span className="spec-label">Average Rating</span>
                <span className="spec-value rating-highlight">
                  ⭐ {reviewsData.average_rating > 0 ? `${reviewsData.average_rating} / 5` : 'New Venue'} 
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    ({reviewsData.total_reviews} {reviewsData.total_reviews === 1 ? 'review' : 'reviews'})
                  </small>
                </span>
              </div>
            </div>

            {/* CTA Banner Row */}
            <div className="cta-banner-row">
              <button 
                type="button" 
                className="btn btn-primary cta-quote-btn"
                onClick={handleOpenQuoteModal}
              >
                📝 Request Instant Quotation
              </button>
            </div>
          </div>
        </div>

        {/* Details Grid Layout (Main Content + Sidebar) */}
        <div className="details-layout">
          {/* Main Column */}
          <div className="details-main-col">
            
            {/* Description Section */}
            <section className="glass-card details-section">
              <h2 className="section-heading">About {venue.name}</h2>
              <p className="description-text">
                {venue.description || 'No description available for this venue listing.'}
              </p>
            </section>

            {/* 2. Supported Event Types */}
            <section className="glass-card details-section">
              <h2 className="section-heading">Supported Event Types</h2>
              {event_types.length > 0 ? (
                <div className="event-types-list">
                  {event_types.map((et) => (
                    <span key={et.id} className="event-type-badge">
                      🎉 {et.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-section-text">No specific event types assigned yet.</p>
              )}
            </section>

            {/* 3. Facilities & Amenities */}
            <section className="glass-card details-section">
              <h2 className="section-heading">Available Facilities & Amenities</h2>
              {facilities.length > 0 ? (
                <div className="facilities-grid">
                  {facilities.map((fac) => (
                    <div key={fac.id} className="facility-card">
                      <span className="facility-icon">{fac.icon || '✨'}</span>
                      <span className="facility-name">{fac.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-section-text">No facilities listed for this venue.</p>
              )}
            </section>

            {/* 4. Pricing Breakdown */}
            <section className="glass-card details-section">
              <h2 className="section-heading">Itemized Pricing Structure</h2>
              {pricingItems.length > 0 ? (
                <div className="pricing-table-container">
                  <table className="pricing-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.item_name}</td>
                          <td>
                            <span className="pricing-type-tag">
                              {formatPricingType(item.pricing_type)}
                            </span>
                          </td>
                          <td>
                            {item.is_optional ? (
                              <span className="optional-tag">Optional</span>
                            ) : (
                              <span className="mandatory-tag">Mandatory / Base</span>
                            )}
                          </td>
                          <td className="price-cell">{formatCurrency(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-section-text">
                  Starting base price is <strong>{formatCurrency(venue.base_price)}</strong>. Itemized pricing details will be provided in custom quotations.
                </p>
              )}
            </section>

            {/* 6. Customer Reviews */}
            <section className="glass-card details-section">
              <div className="reviews-header-row">
                <h2 className="section-heading">Customer Reviews & Ratings</h2>
                <span className="reviews-summary-badge">
                  ⭐ {reviewsData.average_rating > 0 ? reviewsData.average_rating : '0.0'} ({reviewsData.total_reviews} {reviewsData.total_reviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>

              {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
                <div className="reviews-list">
                  {reviewsData.reviews.map((rev) => (
                    <div key={rev.id} className="review-card">
                      <div className="review-header">
                        <div className="review-author">
                          <div className="author-avatar">
                            {rev.customer_name ? rev.customer_name[0].toUpperCase() : 'C'}
                          </div>
                          <div>
                            <span className="author-name">{rev.customer_name || 'Verified Customer'}</span>
                            <span className="review-date">{rev.created_at ? rev.created_at.split(' ')[0] : ''}</span>
                          </div>
                        </div>
                        <div className="review-rating-stars">
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                        </div>
                      </div>
                      {rev.comment && <p className="review-comment">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-reviews-box">
                  <div style={{ fontSize: '2rem' }}>💬</div>
                  <p className="empty-section-text">No reviews have been submitted for this venue yet.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="details-sidebar-col">
            
            {/* 5. Date Availability Checker Widget */}
            <div className="glass-card sidebar-widget">
              <h3 className="widget-title">📅 Check Date Availability</h3>
              <p className="widget-subtitle">
                Select your intended event date to check real-time availability:
              </p>

              <form onSubmit={handleCheckAvailability} className="availability-form">
                <div className="form-group">
                  <label htmlFor="avail-date-input">Event Date</label>
                  <input
                    id="avail-date-input"
                    type="date"
                    min={todayStr}
                    className="form-control"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  disabled={checkingAvailability}
                >
                  {checkingAvailability ? 'Checking...' : 'Check Availability'}
                </button>
              </form>

              {/* Availability Result Display */}
              {availabilityResult && (
                <div className={`availability-badge-card status-${availabilityResult.status}`}>
                  {availabilityResult.status === 'available' && (
                    <>
                      <div className="status-icon">✅</div>
                      <div>
                        <strong>Available</strong>
                        <p>Venue is available for booking on {availabilityResult.date}.</p>
                      </div>
                    </>
                  )}

                  {availabilityResult.status === 'booked' && (
                    <>
                      <div className="status-icon">❌</div>
                      <div>
                        <strong>Booked</strong>
                        <p>Venue is already booked on {availabilityResult.date}.</p>
                      </div>
                    </>
                  )}

                  {availabilityResult.status === 'blocked' && (
                    <>
                      <div className="status-icon">⚠️</div>
                      <div>
                        <strong>Blocked / Unavailable</strong>
                        <p>Venue is blocked for maintenance or private events on {availabilityResult.date}.</p>
                      </div>
                    </>
                  )}

                  {availabilityResult.status === 'warning' && (
                    <p>{availabilityResult.text}</p>
                  )}

                  {availabilityResult.status === 'error' && (
                    <p>{availabilityResult.text}</p>
                  )}
                </div>
              )}
            </div>

            {/* Direct Quotation Sidebar CTA */}
            <div className="glass-card sidebar-widget quote-sidebar-card">
              <h3 className="widget-title">Ready to Book?</h3>
              <p className="widget-subtitle">
                Get an official itemized price quote tailored to your guest count and event requirements.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
                onClick={handleOpenQuoteModal}
              >
                📝 Request Quotation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 9. Request Quotation Modal */}
      {showQuoteModal && (
        <div className="modal-overlay" onClick={() => setShowQuoteModal(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Request Quotation for <span className="gradient-text">{venue.name}</span></h2>
              <button type="button" className="modal-close-btn" onClick={() => setShowQuoteModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleQuoteSubmit} className="modal-body-form">
              {quoteError && (
                <div className="filter-validation-error" style={{ marginBottom: '1rem' }}>
                  ⚠️ {quoteError}
                </div>
              )}

              {quoteSuccess && (
                <div className="toast-notice toast-success" style={{ position: 'static', marginBottom: '1rem' }}>
                  {quoteSuccess}
                </div>
              )}

              {/* Event Type Select */}
              <div className="form-group">
                <label htmlFor="quote-event-type">Select Event Type *</label>
                <select
                  id="quote-event-type"
                  className="form-control"
                  value={quoteForm.event_type_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, event_type_id: e.target.value })}
                  disabled={quoteSubmitting}
                  required
                >
                  <option value="">-- Choose Event Type --</option>
                  {(venueData.event_types.length > 0 ? venueData.event_types : masterEventTypes).map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Date Input */}
              <div className="form-group">
                <label htmlFor="quote-event-date">Planned Event Date *</label>
                <input
                  id="quote-event-date"
                  type="date"
                  min={todayStr}
                  className="form-control"
                  value={quoteForm.event_date}
                  onChange={(e) => setQuoteForm({ ...quoteForm, event_date: e.target.value })}
                  disabled={quoteSubmitting}
                  required
                />
              </div>

              {/* Guest Count Input */}
              <div className="form-group">
                <label htmlFor="quote-guest-count">
                  Expected Guest Count * ({venue.capacity_min} - {venue.capacity_max} guests)
                </label>
                <input
                  id="quote-guest-count"
                  type="number"
                  min={venue.capacity_min}
                  max={venue.capacity_max}
                  placeholder={`e.g. ${venue.capacity_min}`}
                  className="form-control"
                  value={quoteForm.guest_count}
                  onChange={(e) => setQuoteForm({ ...quoteForm, guest_count: e.target.value })}
                  disabled={quoteSubmitting}
                  required
                />
              </div>

              {/* Special Message / Requirements */}
              <div className="form-group">
                <label htmlFor="quote-message">Special Notes / Message (Optional)</label>
                <textarea
                  id="quote-message"
                  rows="3"
                  className="form-control"
                  placeholder="Mention catering preferences, stage setup, or questions..."
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  disabled={quoteSubmitting}
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQuoteModal(false)}
                  disabled={quoteSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={quoteSubmitting}
                >
                  {quoteSubmitting ? 'Sending Request...' : 'Submit Quotation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueDetails;
