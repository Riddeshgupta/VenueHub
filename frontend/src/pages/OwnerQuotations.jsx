import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './OwnerQuotations.css';

const OwnerQuotations = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Guard
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }
    if (currentUser?.role !== 'venue_owner') {
      navigate('/', { replace: true });
    }
  }, [navigate, currentUser]);

  // Primary Data States
  const [ownerVenues, setOwnerVenues] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  
  // Active Filter: 'all' | 'pending' | 'quoted' | 'accepted' | 'rejected' | 'expired'
  const [activeFilter, setActiveFilter] = useState('all');

  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Selected Quotation Modal States
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [dateAvailability, setDateAvailability] = useState(null);
  const [dateAvailLoading, setDateAvailLoading] = useState(false);

  // Quotation Builder Modal States
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderItems, setBuilderItems] = useState([
    { item_name: 'Venue Rental Fee', unit_price: 100000, quantity: 1 }
  ]);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [venuePricingTemplates, setVenuePricingTemplates] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  // View Itemized Quotation Modal State
  const [showViewQuoteModal, setShowViewQuoteModal] = useState(false);
  const [quoteDetailsData, setQuoteDetailsData] = useState(null);
  const [quoteDetailsLoading, setQuoteDetailsLoading] = useState(false);

  // 2. Fetch Owner's Venues & Aggregated Incoming Quotations
  const fetchOwnerQuotationsData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Fetch Owner's Venues
      const venuesRes = await api.get('/venues/my');
      if (venuesRes.data && venuesRes.data.status === 'success') {
        const venuesList = Array.isArray(venuesRes.data.data) ? venuesRes.data.data : [];
        setOwnerVenues(venuesList);

        if (venuesList.length > 0) {
          // 2. Fetch Quotations for all owner venues in parallel
          const venuePromises = venuesList.map(v => api.get(`/venues/${v.id}/quotations`));
          const results = await Promise.allSettled(venuePromises);

          let aggregatedQuotations = [];
          results.forEach((res, index) => {
            if (res.status === 'fulfilled' && res.value.data?.status === 'success') {
              const list = Array.isArray(res.value.data.data) ? res.value.data.data : [];
              const vInfo = venuesList[index];
              // Attach venue info to each quotation if missing
              const enriched = list.map(q => ({
                ...q,
                venue_id: q.venue_id || vInfo.id,
                venue_name: q.venue_name || vInfo.name,
                venue_city: q.venue_city || vInfo.city
              }));
              aggregatedQuotations = aggregatedQuotations.concat(enriched);
            }
          });

          // Sort by creation date descending
          aggregatedQuotations.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          setAllQuotations(aggregatedQuotations);
        }
      } else {
        setErrorMessage(venuesRes.data?.message || 'Failed to load owner venues.');
      }
    } catch (err) {
      console.error('Error fetching owner quotations:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch quotation requests. Please check network connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'venue_owner') {
      fetchOwnerQuotationsData();
      window.scrollTo(0, 0);
    }
  }, []);

  // Toast Helper
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

  const formatCurrency = (amount) => {
    return amount != null && amount >= 0 
      ? `₹${Number(amount).toLocaleString('en-IN')}` 
      : '₹0';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'accepted': return 'badge-success';
      case 'quoted': return 'badge-info';
      case 'pending': return 'badge-warning';
      case 'rejected':
      case 'expired': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // ----------------------------------------------------
  // CLIENT-SIDE FILTERING & STATUS COUNTS
  // ----------------------------------------------------
  const filteredQuotations = allQuotations.filter(q => {
    if (activeFilter === 'all') return true;
    return q.status === activeFilter;
  });

  const countPending = allQuotations.filter(q => q.status === 'pending').length;
  const countQuoted = allQuotations.filter(q => q.status === 'quoted').length;
  const countAccepted = allQuotations.filter(q => q.status === 'accepted').length;
  const countRejected = allQuotations.filter(q => q.status === 'rejected').length;
  const countExpired = allQuotations.filter(q => q.status === 'expired').length;

  // ----------------------------------------------------
  // REQUEST DETAILS & AVAILABILITY CONTEXT MODAL
  // ----------------------------------------------------
  const handleOpenDetailsModal = async (quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
    setDateAvailability(null);
    setDateAvailLoading(true);

    try {
      const availRes = await api.get(`/venues/${quotation.venue_id}/availability/${quotation.event_date}`);
      if (availRes.data && availRes.data.status === 'success') {
        setDateAvailability(availRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching date availability context:', err);
    } finally {
      setDateAvailLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedQuotation(null);
    setDateAvailability(null);
  };

  // ----------------------------------------------------
  // QUOTATION BUILDER MODAL HANDLERS
  // ----------------------------------------------------
  const handleOpenBuilderModal = async (quotation) => {
    setSelectedQuotation(quotation);
    setShowBuilderModal(true);
    setBuilderError('');
    
    // Default initial line item (venue base price if present)
    const basePrice = quotation.base_price || 100000;
    setBuilderItems([
      { item_name: 'Venue Space Rental Fee', unit_price: basePrice, quantity: 1 },
      { item_name: 'Dining & Food Package', unit_price: 800, quantity: quotation.guest_count || 100 }
    ]);

    // Fetch venue pricing templates for quick import
    setTemplateLoading(true);
    try {
      const pricingRes = await api.get(`/venues/${quotation.venue_id}/pricing`);
      if (pricingRes.data && pricingRes.data.status === 'success') {
        setVenuePricingTemplates(Array.isArray(pricingRes.data.data) ? pricingRes.data.data : []);
      }
    } catch (err) {
      console.error('Error loading venue pricing templates:', err);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleCloseBuilderModal = () => {
    setShowBuilderModal(false);
    setSelectedQuotation(null);
    setBuilderError('');
  };

  const handleAddItemRow = () => {
    setBuilderItems(prev => [
      ...prev,
      { item_name: '', unit_price: 0, quantity: 1 }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    if (builderItems.length === 1) {
      setBuilderError('At least one quotation line item is required.');
      return;
    }
    setBuilderItems(prev => prev.filter((_, idx) => idx !== index));
    setBuilderError('');
  };

  const handleItemChange = (index, field, value) => {
    setBuilderItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleImportTemplateItem = (templateItem) => {
    setBuilderItems(prev => [
      ...prev,
      {
        item_name: templateItem.item_name,
        unit_price: templateItem.price || 0,
        quantity: templateItem.pricing_type === 'food_per_person' ? (selectedQuotation?.guest_count || 100) : 1
      }
    ]);
    triggerToast('info', `Imported "${templateItem.item_name}" into quotation builder.`);
  };

  // Preview subtotal calculation
  const calculatedSubtotal = builderItems.reduce((sum, item) => {
    const p = Number(item.unit_price) || 0;
    const q = Number(item.quantity) || 0;
    return sum + (p * q);
  }, 0);

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setBuilderError('');

    // Validations
    if (builderItems.length === 0) {
      setBuilderError('At least one line item is required to generate a quotation.');
      return;
    }

    for (let idx = 0; idx < builderItems.length; idx++) {
      const item = builderItems[idx];
      if (!item.item_name || !item.item_name.trim()) {
        setBuilderError(`Item Name is required for item #${idx + 1}.`);
        return;
      }
      const price = Number(item.unit_price);
      if (item.unit_price === '' || isNaN(price) || price < 0) {
        setBuilderError(`Valid non-negative Unit Price is required for item #${idx + 1}.`);
        return;
      }
      const qty = Number(item.quantity);
      if (item.quantity === '' || isNaN(qty) || qty <= 0) {
        setBuilderError(`Quantity must be 1 or greater for item #${idx + 1}.`);
        return;
      }
    }

    setBuilderLoading(true);

    const payload = {
      items: builderItems.map(item => ({
        item_name: item.item_name.trim(),
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity)
      }))
    };

    try {
      const res = await api.post(`/quotations/${selectedQuotation.id}/quote`, payload);
      if (res.data && res.data.status === 'success') {
        triggerToast('success', '✨ Quotation response submitted successfully! Customer notified.');
        handleCloseBuilderModal();
        fetchOwnerQuotationsData();
      } else {
        setBuilderError(res.data?.message || 'Failed to submit quotation response.');
      }
    } catch (err) {
      console.error('Error submitting quotation response:', err);
      setBuilderError(
        err.response?.data?.message || 'An error occurred while submitting quotation.'
      );
    } finally {
      setBuilderLoading(false);
    }
  };

  // ----------------------------------------------------
  // VIEW ITEMIZED QUOTATION MODAL HANDLERS
  // ----------------------------------------------------
  const handleOpenViewQuoteModal = async (quotation) => {
    setSelectedQuotation(quotation);
    setShowViewQuoteModal(true);
    setQuoteDetailsData(null);
    setQuoteDetailsLoading(true);

    try {
      const res = await api.get(`/quotations/${quotation.id}`);
      if (res.data && res.data.status === 'success') {
        setQuoteDetailsData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching quotation details:', err);
    } finally {
      setQuoteDetailsLoading(false);
    }
  };

  const handleCloseViewQuoteModal = () => {
    setShowViewQuoteModal(false);
    setSelectedQuotation(null);
    setQuoteDetailsData(null);
  };

  if (!currentUser) return null;

  return (
    <div className="owner-quotations-page">
      {/* Toast Notice */}
      {toastNotice.text && (
        <div className={`toast-notice toast-${toastNotice.type}`}>
          {toastNotice.text}
        </div>
      )}

      <div className="container dashboard-container">
        
        {/* Mobile Toggle */}
        <button
          className="dashboard-mobile-toggle"
          onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        >
          {sidebarMobileOpen ? '✕ Close Menu' : '☰ Owner Navigation'}
        </button>

        {/* 1. Sidebar */}
        <aside className={`dashboard-sidebar glass-card ${sidebarMobileOpen ? 'is-open' : ''}`}>
          <div className="sidebar-profile">
            <div className="profile-avatar owner-avatar">
              {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'O'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{currentUser.full_name}</h3>
              <span className="profile-role-badge owner-role-badge">Venue Owner</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📊 Overview Dashboard
                </Link>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link">
                  🏰 My Venues ({ownerVenues.length})
                </Link>
              </li>
              <li>
                <button type="button" className="sidebar-link active">
                  📝 Quotation Requests ({countPending})
                </button>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📅 Bookings
                </Link>
              </li>
              <li>
                <Link to="/owner/venues" className="sidebar-link">
                  🗓️ Availability
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  ⭐ Reviews
                </Link>
              </li>
            </ul>
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* 2. Main Content Area */}
        <main className="dashboard-main-content">
          
          {/* Header Bar */}
          <div className="glass-card page-header-card owner-header-flex">
            <div>
              <div className="header-top-row">
                <Link to="/owner/dashboard" className="back-link">
                  ← Back to Owner Dashboard
                </Link>
              </div>
              <h1 className="page-header-title">
                Quotation <span className="gradient-text">Requests</span>
              </h1>
              <p className="page-header-subtitle">
                Review incoming client event requirements, inspect event date availability, and build itemized custom price quotes.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchOwnerQuotationsData}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* 3. Status Filters Bar */}
          <div className="glass-card quotations-filter-bar">
            <button
              type="button"
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Requests ({allQuotations.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveFilter('pending')}
            >
              ⏳ Pending ({countPending})
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === 'quoted' ? 'active' : ''}`}
              onClick={() => setActiveFilter('quoted')}
            >
              📝 Quoted ({countQuoted})
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === 'accepted' ? 'active' : ''}`}
              onClick={() => setActiveFilter('accepted')}
            >
              ✅ Accepted ({countAccepted})
            </button>
            <button
              type="button"
              className={`filter-btn ${activeFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveFilter('rejected')}
            >
              ❌ Rejected ({countRejected})
            </button>
            {countExpired > 0 && (
              <button
                type="button"
                className={`filter-btn ${activeFilter === 'expired' ? 'active' : ''}`}
                onClick={() => setActiveFilter('expired')}
              >
                ⏰ Expired ({countExpired})
              </button>
            )}
          </div>

          {/* 4. Quotations List / Grid */}
          {loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading quotation requests...</p>
            </div>
          ) : filteredQuotations.length > 0 ? (
            <div className="owner-quotations-stack">
              {filteredQuotations.map((q) => (
                <div key={q.id} className="glass-card owner-quotation-card">
                  
                  <div className="oqcard-header">
                    <div className="oqcard-title-group">
                      <span className="oqcard-icon">📝</span>
                      <div>
                        <h3 className="oqcard-title">
                          {q.venue_name || `Venue #${q.venue_id}`}
                        </h3>
                        <span className="oqcard-subtext">
                          Quotation Request #{q.id} • {q.venue_city || 'City'}
                        </span>
                      </div>
                    </div>

                    <div className="oqcard-badges">
                      <span className={`status-pill ${getStatusBadgeClass(q.status)}`}>
                        ● {q.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="oqcard-details-grid">
                    <div className="oqspec-box">
                      <span className="oqspec-label">Customer</span>
                      <span className="oqspec-val">{q.customer_name || 'Verified Customer'}</span>
                      {q.customer_phone && (
                        <span className="oqspec-sub">📞 {q.customer_phone}</span>
                      )}
                    </div>

                    <div className="oqspec-box">
                      <span className="oqspec-label">Event Type</span>
                      <span className="oqspec-val">🎉 {q.event_type_name || 'Event'}</span>
                    </div>

                    <div className="oqspec-box">
                      <span className="oqspec-label">Planned Event Date</span>
                      <span className="oqspec-val font-gold">📅 {q.event_date}</span>
                    </div>

                    <div className="oqspec-box">
                      <span className="oqspec-label">Guest Count</span>
                      <span className="oqspec-val">👥 {q.guest_count} Guests</span>
                    </div>
                  </div>

                  {q.message && (
                    <div className="oqcard-message-box">
                      <span className="msg-label">Customer Requirement Message:</span>
                      <p className="msg-text">"{q.message}"</p>
                    </div>
                  )}

                  {q.total_amount != null && q.total_amount > 0 && (
                    <div className="oqcard-total-strip">
                      <span>Quoted Total Amount:</span>
                      <strong className="quoted-price">{formatCurrency(q.total_amount)}</strong>
                    </div>
                  )}

                  <div className="oqcard-footer-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenDetailsModal(q)}
                    >
                      🔍 Request Details & Availability
                    </button>

                    {q.status === 'pending' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenBuilderModal(q)}
                      >
                        ⚡ Create Itemized Quotation
                      </button>
                    )}

                    {(q.status === 'quoted' || q.status === 'accepted' || q.status === 'rejected') && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenViewQuoteModal(q)}
                      >
                        📄 View Itemized Quote
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card empty-quotations-card">
              <div className="empty-qicon">📝</div>
              <h3 className="empty-qtitle">No Quotation Requests Found</h3>
              <p className="empty-qtext">
                {activeFilter !== 'all' 
                  ? `There are no quotation requests matching status "${activeFilter}".`
                  : "When customers request custom quotes for your venue, they will appear here for your review and response."}
              </p>
              <Link to="/owner/venues" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
                Manage My Venues
              </Link>
            </div>
          )}

        </main>
      </div>

      {/* 5. Request Details & Date Availability Context Modal */}
      {showDetailsModal && selectedQuotation && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="glass-card modal-content owner-request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  📋 Request Details: <span className="gradient-text">#{selectedQuotation.id}</span>
                </h2>
                <span className="modal-subtitle-venue">
                  Customer requirements and event date availability context.
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseDetailsModal}>
                ✕
              </button>
            </div>

            <div className="venue-form-body">
              {/* Customer Request Details Section */}
              <div className="request-section-box">
                <h4 className="req-subheading">👤 Customer Request Parameters</h4>
                
                <div className="req-details-grid">
                  <div className="req-detail-item">
                    <span className="rlabel">Customer Name</span>
                    <span className="rval">{selectedQuotation.customer_name}</span>
                  </div>
                  {selectedQuotation.customer_phone && (
                    <div className="req-detail-item">
                      <span className="rlabel">Phone Contact</span>
                      <span className="rval">📞 {selectedQuotation.customer_phone}</span>
                    </div>
                  )}
                  <div className="req-detail-item">
                    <span className="rlabel">Target Venue</span>
                    <span className="rval">{selectedQuotation.venue_name}</span>
                  </div>
                  <div className="req-detail-item">
                    <span className="rlabel">Event Type</span>
                    <span className="rval">🎉 {selectedQuotation.event_type_name}</span>
                  </div>
                  <div className="req-detail-item">
                    <span className="rlabel">Event Date</span>
                    <span className="rval font-gold">📅 {selectedQuotation.event_date}</span>
                  </div>
                  <div className="req-detail-item">
                    <span className="rlabel">Expected Guests</span>
                    <span className="rval">👥 {selectedQuotation.guest_count} Guests</span>
                  </div>
                </div>

                {selectedQuotation.message && (
                  <div className="req-message-full">
                    <span className="rlabel">Customer Special Instructions:</span>
                    <p>"{selectedQuotation.message}"</p>
                  </div>
                )}
              </div>

              {/* Event Date Availability Context */}
              <div className="avail-context-box" style={{ marginTop: '1.25rem' }}>
                <h4 className="req-subheading">🗓️ Event Date Availability Context</h4>
                
                {dateAvailLoading ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Checking date availability...</p>
                ) : dateAvailability ? (
                  <div className="avail-status-row">
                    <span>
                      Date <strong>{selectedQuotation.event_date}</strong> status:
                    </span>
                    <span className={`status-pill ${
                      dateAvailability.status === 'booked' ? 'badge-danger' :
                      dateAvailability.status === 'blocked' ? 'badge-warning' : 'badge-success'
                    }`}>
                      ● {dateAvailability.status.toUpperCase()}
                    </span>
                  </div>
                ) : null}

                <p className="avail-disclaimer-note">
                  ℹ️ <strong>Note:</strong> Date availability context is informational only. Submitting a quotation response does NOT automatically change or lock date availability.
                </p>
              </div>

            </div>

            <div className="modal-footer-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseDetailsModal}>
                Close
              </button>

              {selectedQuotation.status === 'pending' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleCloseDetailsModal();
                    handleOpenBuilderModal(selectedQuotation);
                  }}
                >
                  ⚡ Create Quotation
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 6. Quotation Builder Modal */}
      {showBuilderModal && selectedQuotation && (
        <div className="modal-overlay" onClick={handleCloseBuilderModal}>
          <div className="glass-card modal-content owner-builder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  ⚡ Build Custom Quotation for Request <span className="gradient-text">#{selectedQuotation.id}</span>
                </h2>
                <span className="modal-subtitle-venue">
                  Itemize rental fees, dining packages, and decoration charges for {selectedQuotation.customer_name}.
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseBuilderModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQuotation}>
              <div className="venue-form-body">
                {builderError && (
                  <div className="filter-validation-error" style={{ marginBottom: '1.2rem' }}>
                    ⚠️ {builderError}
                  </div>
                )}

                {/* Optional Pricing Template Importer */}
                {venuePricingTemplates.length > 0 && (
                  <div className="template-importer-box" style={{ marginBottom: '1.25rem' }}>
                    <span className="importer-label">⚡ Quick Import Venue Pricing Packages:</span>
                    <div className="template-pills-row">
                      {venuePricingTemplates.map(tItem => (
                        <button
                          key={tItem.id}
                          type="button"
                          className="btn btn-secondary btn-xs template-pill-btn"
                          onClick={() => handleImportTemplateItem(tItem)}
                        >
                          + {tItem.item_name} ({formatCurrency(tItem.price)})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                <div className="builder-items-wrapper">
                  <table className="builder-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Item Name</th>
                        <th style={{ width: '25%' }}>Unit Price (₹)</th>
                        <th style={{ width: '15%' }}>Qty</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Total (₹)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {builderItems.map((item, idx) => {
                        const rowTotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
                        return (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. Venue Rental Fee"
                                value={item.item_name}
                                onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                                disabled={builderLoading}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="0"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                disabled={builderLoading}
                                min="0"
                                step="any"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                disabled={builderLoading}
                                min="1"
                                required
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-gold)' }}>
                              {formatCurrency(rowTotal)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-remove-row"
                                onClick={() => handleRemoveItemRow(idx)}
                                title="Remove Line Item"
                                disabled={builderLoading}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="builder-actions-row" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddItemRow}
                    disabled={builderLoading}
                  >
                    ➕ Add Another Line Item
                  </button>
                </div>

                {/* Subtotal Preview Strip */}
                <div className="builder-subtotal-strip" style={{ marginTop: '1.25rem' }}>
                  <span>Estimated Total Amount:</span>
                  <strong className="subtotal-amount">{formatCurrency(calculatedSubtotal)}</strong>
                </div>
              </div>

              <div className="modal-footer-actions" style={{ marginTop: '1.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseBuilderModal}
                  disabled={builderLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={builderLoading}
                >
                  {builderLoading ? 'Submitting Quote...' : 'Submit Quotation to Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. View Itemized Quotation Modal */}
      {showViewQuoteModal && selectedQuotation && (
        <div className="modal-overlay" onClick={handleCloseViewQuoteModal}>
          <div className="glass-card modal-content owner-view-quote-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  📄 Itemized Quotation: <span className="gradient-text">#{selectedQuotation.id}</span>
                </h2>
                <span className="modal-subtitle-venue">
                  Submitted pricing breakdown for {selectedQuotation.customer_name}.
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseViewQuoteModal}>
                ✕
              </button>
            </div>

            <div className="venue-form-body">
              {quoteDetailsLoading ? (
                <div className="loading-container" style={{ padding: '2rem 0' }}>
                  <div className="loading-spinner"></div>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Loading itemized quote...</p>
                </div>
              ) : quoteDetailsData ? (
                <>
                  <div className="quote-status-banner">
                    {selectedQuotation.status === 'accepted' ? (
                      <div className="status-accepted-banner">
                        ✓ Accepted by Customer
                      </div>
                    ) : selectedQuotation.status === 'rejected' ? (
                      <div className="status-rejected-banner">
                        ✕ Rejected by Customer
                      </div>
                    ) : (
                      <div className="status-quoted-banner">
                        📝 Quoted — Awaiting Customer Response
                      </div>
                    )}
                  </div>

                  <div className="view-quote-table-wrapper" style={{ marginTop: '1rem' }}>
                    <table className="pricing-table">
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Unit Price (₹)</th>
                          <th>Qty</th>
                          <th style={{ textAlign: 'right' }}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(quoteDetailsData.items) && quoteDetailsData.items.map(item => (
                          <tr key={item.id}>
                            <td><strong>{item.item_name}</strong></td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>{item.quantity}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-gold)' }}>
                              {formatCurrency(item.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="authoritative-total-strip" style={{ marginTop: '1.25rem' }}>
                    <span>Authoritative Total Amount:</span>
                    <strong className="grand-total-amount">
                      {formatCurrency(quoteDetailsData.quotation?.total_amount || selectedQuotation.total_amount)}
                    </strong>
                  </div>
                </>
              ) : null}
            </div>

            <div className="modal-footer-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseViewQuoteModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerQuotations;
