import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './OwnerVenueManage.css';

const ALLOWED_PRICING_TYPES = [
  { value: 'venue_rental', label: 'Venue Rental' },
  { value: 'food_per_person', label: 'Food (Per Person)' },
  { value: 'decoration', label: 'Decoration Package' },
  { value: 'dj_music', label: 'DJ / Music System' },
  { value: 'parking', label: 'Parking Charge' },
  { value: 'tax', label: 'Taxes / Service Fee' },
  { value: 'other', label: 'Other Charge' }
];

const OwnerVenueManage = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const currentUser = getUser();

  // 1. Access Control Check
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
  const [venue, setVenue] = useState(null);
  const [pricingItems, setPricingItems] = useState([]);
  const [allEventTypes, setAllEventTypes] = useState([]);
  const [allFacilities, setAllFacilities] = useState([]);

  // Form / Selection States
  const [selectedEventTypeIds, setSelectedEventTypeIds] = useState([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState([]);

  // Active Tab: 'pricing' | 'event-types' | 'facilities'
  const [activeTab, setActiveTab] = useState('pricing');

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Pricing Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null); // null if adding, item if editing
  const [pricingType, setPricingType] = useState('venue_rental');
  const [pricingItemName, setPricingItemName] = useState('');
  const [pricingPrice, setPricingPrice] = useState('');
  const [pricingIsOptional, setPricingIsOptional] = useState(false);
  const [pricingFormError, setPricingFormError] = useState('');

  // Delete Pricing Confirmation State
  const [deletingPricingId, setDeletingPricingId] = useState(null);

  // 2. Fetch Venue Details, Pricing, Event Types & Facilities
  const fetchVenueManagementData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Parallel API calls
      const [venueRes, pricingRes, etRes, facRes] = await Promise.all([
        api.get(`/venues/${venueId}`),
        api.get(`/venues/${venueId}/pricing`),
        api.get('/event-types'),
        api.get('/facilities')
      ]);

      // Process Venue Details
      if (venueRes.data && venueRes.data.status === 'success') {
        const venueData = venueRes.data.data?.venue || venueRes.data.data;
        
        // Ownership verification check
        if (currentUser && venueData.owner_id !== currentUser.id && currentUser.role !== 'admin') {
          setErrorMessage('Access denied. You do not own this venue.');
          setLoading(false);
          return;
        }

        setVenue(venueData);

        // Pre-fill event types and facilities selections
        const assignedEts = venueRes.data.data?.event_types || [];
        const assignedFacs = venueRes.data.data?.facilities || [];
        setSelectedEventTypeIds(assignedEts.map(e => e.id));
        setSelectedFacilityIds(assignedFacs.map(f => f.id));
      } else {
        setErrorMessage(venueRes.data?.message || 'Failed to load venue details.');
      }

      // Process Pricing Items
      if (pricingRes.data && pricingRes.data.status === 'success') {
        setPricingItems(Array.isArray(pricingRes.data.data) ? pricingRes.data.data : []);
      }

      // Process System Event Types & Facilities
      if (etRes.data && etRes.data.status === 'success') {
        setAllEventTypes(Array.isArray(etRes.data.data) ? etRes.data.data : []);
      }
      if (facRes.data && facRes.data.status === 'success') {
        setAllFacilities(Array.isArray(facRes.data.data) ? facRes.data.data : []);
      }

    } catch (err) {
      console.error('Error fetching venue management data:', err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        setErrorMessage(err.response?.data?.message || 'Venue not found or access denied.');
      } else {
        setErrorMessage(err.response?.data?.message || 'Unable to load venue management parameters.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'venue_owner' && venueId) {
      fetchVenueManagementData();
      window.scrollTo(0, 0);
    }
  }, [venueId]);

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
      case 'approved': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'rejected': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // ----------------------------------------------------
  // PRICING MANAGEMENT HANDLERS
  // ----------------------------------------------------
  const handleOpenAddPricingModal = () => {
    setEditingPricing(null);
    setPricingType('venue_rental');
    setPricingItemName('');
    setPricingPrice('');
    setPricingIsOptional(false);
    setPricingFormError('');
    setShowPricingModal(true);
  };

  const handleOpenEditPricingModal = (item) => {
    setEditingPricing(item);
    setPricingType(item.pricing_type || 'venue_rental');
    setPricingItemName(item.item_name || '');
    setPricingPrice(item.price != null ? item.price : '');
    setPricingIsOptional(Boolean(item.is_optional));
    setPricingFormError('');
    setShowPricingModal(true);
  };

  const handleClosePricingModal = () => {
    setShowPricingModal(false);
    setEditingPricing(null);
    setPricingFormError('');
  };

  const handleSavePricingItem = async (e) => {
    e.preventDefault();
    setPricingFormError('');

    if (!pricingType) {
      setPricingFormError('Pricing Type is required.');
      return;
    }
    if (!pricingItemName.trim()) {
      setPricingFormError('Item Name is required.');
      return;
    }
    const parsedPrice = Number(pricingPrice);
    if (pricingPrice === '' || isNaN(parsedPrice) || parsedPrice < 0) {
      setPricingFormError('Please enter a valid non-negative price amount.');
      return;
    }

    setActionLoading(true);
    const payload = {
      pricing_type: pricingType,
      item_name: pricingItemName.trim(),
      price: parsedPrice,
      is_optional: pricingIsOptional
    };

    try {
      if (editingPricing) {
        // Edit Pricing Item
        const res = await api.put(`/venues/${venueId}/pricing/${editingPricing.id}`, payload);
        if (res.data && res.data.status === 'success') {
          triggerToast('success', '✓ Pricing package item updated successfully!');
          handleClosePricingModal();
          // Refresh pricing items
          const refreshRes = await api.get(`/venues/${venueId}/pricing`);
          if (refreshRes.data?.status === 'success') {
            setPricingItems(refreshRes.data.data);
          }
        } else {
          setPricingFormError(res.data?.message || 'Failed to update pricing item.');
        }
      } else {
        // Add New Pricing Item
        const res = await api.post(`/venues/${venueId}/pricing`, payload);
        if (res.data && res.data.status === 'success') {
          triggerToast('success', '✨ New pricing item added successfully!');
          handleClosePricingModal();
          // Refresh pricing items
          const refreshRes = await api.get(`/venues/${venueId}/pricing`);
          if (refreshRes.data?.status === 'success') {
            setPricingItems(refreshRes.data.data);
          }
        } else {
          setPricingFormError(res.data?.message || 'Failed to add pricing item.');
        }
      }
    } catch (err) {
      console.error('Error saving pricing item:', err);
      setPricingFormError(err.response?.data?.message || 'An error occurred while saving pricing item.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePricingItem = async (pricingId) => {
    setActionLoading(true);
    try {
      const res = await api.delete(`/venues/${venueId}/pricing/${pricingId}`);
      if (res.data && res.data.status === 'success') {
        triggerToast('success', '🗑️ Pricing item deleted successfully.');
        setPricingItems(prev => prev.filter(p => p.id !== pricingId));
      } else {
        triggerToast('warning', res.data?.message || 'Failed to delete pricing item.');
      }
    } catch (err) {
      console.error('Error deleting pricing item:', err);
      triggerToast('warning', err.response?.data?.message || 'An error occurred while deleting pricing item.');
    } finally {
      setActionLoading(false);
      setDeletingPricingId(null);
    }
  };

  // ----------------------------------------------------
  // EVENT TYPES MANAGEMENT HANDLERS
  // ----------------------------------------------------
  const handleEventTypeToggle = (etId) => {
    setSelectedEventTypeIds(prev =>
      prev.includes(etId) ? prev.filter(id => id !== etId) : [...prev, etId]
    );
  };

  const handleSaveEventTypes = async () => {
    if (selectedEventTypeIds.length === 0) {
      triggerToast('warning', '⚠️ Please keep at least one supported event type selected.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.put(`/venues/${venueId}/event-types`, {
        event_type_ids: selectedEventTypeIds
      });

      if (res.data && res.data.status === 'success') {
        triggerToast('success', '🎉 Supported event types updated successfully!');
      } else {
        triggerToast('warning', res.data?.message || 'Failed to update event types.');
      }
    } catch (err) {
      console.error('Error saving event types:', err);
      triggerToast('warning', err.response?.data?.message || 'An error occurred while updating event types.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // FACILITIES MANAGEMENT HANDLERS
  // ----------------------------------------------------
  const handleFacilityToggle = (facId) => {
    setSelectedFacilityIds(prev =>
      prev.includes(facId) ? prev.filter(id => id !== facId) : [...prev, facId]
    );
  };

  const handleSaveFacilities = async () => {
    setActionLoading(true);
    try {
      const res = await api.put(`/venues/${venueId}/facilities`, {
        facility_ids: selectedFacilityIds
      });

      if (res.data && res.data.status === 'success') {
        triggerToast('success', '🏊 Venue facilities & amenities updated successfully!');
      } else {
        triggerToast('warning', res.data?.message || 'Failed to update facilities.');
      }
    } catch (err) {
      console.error('Error saving facilities:', err);
      triggerToast('warning', err.response?.data?.message || 'An error occurred while updating facilities.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="owner-venue-manage-page">
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
                <Link to="/owner/venues" className="sidebar-link active">
                  🏰 My Venues
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📝 Quotation Requests
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
                  📅 Bookings
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link">
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
          
          {/* Back Navigation Bar */}
          <div className="manage-top-bar" style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <Link to="/owner/venues" className="back-link">
              ← Back to My Venues
            </Link>
            {venueId && (
              <Link to={`/owner/venues/${venueId}/availability`} className="back-link">
                🗓️ Manage Date Availability
              </Link>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage ? (
            <div className="glass-card filter-validation-error" style={{ margin: '1rem 0 2rem' }}>
              ⚠️ {errorMessage}
              <div style={{ marginTop: '1rem' }}>
                <Link to="/owner/venues" className="btn btn-secondary btn-sm">
                  Return to My Venues
                </Link>
              </div>
            </div>
          ) : loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0', margin: '1rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading venue configuration...</p>
            </div>
          ) : venue ? (
            <>
              {/* Context Header Card */}
              <div className="glass-card venue-manage-header-card">
                <div className="vm-header-left">
                  <div className="vm-title-icon font-gradient">🏰</div>
                  <div>
                    <h1 className="vm-title">{venue.name}</h1>
                    <p className="vm-subtitle">
                      📍 {venue.city}, {venue.state} • Base Price: <strong className="price-val">{formatCurrency(venue.base_price)}</strong>
                    </p>
                  </div>
                </div>

                <div className="vm-header-right">
                  <span className={`status-pill ${getStatusBadgeClass(venue.status)}`}>
                    ● Approval: {venue.status}
                  </span>
                  <span className={`status-pill ${venue.is_active ? 'badge-info' : 'badge-secondary'}`}>
                    {venue.is_active ? 'Active Listing' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Management Tabs Navigation */}
              <div className="glass-card manage-tabs-card">
                <button
                  type="button"
                  className={`manage-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pricing')}
                >
                  💰 Pricing Packages ({pricingItems.length})
                </button>
                <button
                  type="button"
                  className={`manage-tab-btn ${activeTab === 'event-types' ? 'active' : ''}`}
                  onClick={() => setActiveTab('event-types')}
                >
                  🎉 Event Types ({selectedEventTypeIds.length})
                </button>
                <button
                  type="button"
                  className={`manage-tab-btn ${activeTab === 'facilities' ? 'active' : ''}`}
                  onClick={() => setActiveTab('facilities')}
                >
                  🏊 Facilities ({selectedFacilityIds.length})
                </button>
              </div>

              {/* ---------------------------------------------------- */}
              {/* TAB 1: PRICING MANAGEMENT */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'pricing' && (
                <section className="glass-card manage-section-card">
                  <div className="section-header-flex">
                    <div>
                      <h2 className="manage-section-heading">💰 Pricing Breakdown & Packages</h2>
                      <p className="manage-section-subtext">
                        Configure specific pricing items (rental fees, per-head food, decoration, tax) used for custom quotation generation.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-add-pricing"
                      onClick={handleOpenAddPricingModal}
                    >
                      ➕ Add Pricing Item
                    </button>
                  </div>

                  {pricingItems.length > 0 ? (
                    <div className="pricing-table-wrapper">
                      <table className="pricing-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>Category Type</th>
                            <th>Price Rate</th>
                            <th>Optional?</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingItems.map((item) => {
                            const typeObj = ALLOWED_PRICING_TYPES.find(t => t.value === item.pricing_type);
                            return (
                              <tr key={item.id}>
                                <td className="pricing-item-name-cell">
                                  <strong>{item.item_name}</strong>
                                </td>
                                <td>
                                  <span className="pricing-type-tag">
                                    {typeObj ? typeObj.label : item.pricing_type}
                                  </span>
                                </td>
                                <td className="pricing-price-cell">
                                  {formatCurrency(item.price)}
                                </td>
                                <td>
                                  {item.is_optional ? (
                                    <span className="status-pill badge-info">Optional Add-on</span>
                                  ) : (
                                    <span className="status-pill badge-secondary">Included / Mandatory</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="action-buttons-group">
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-xs"
                                      onClick={() => handleOpenEditPricingModal(item)}
                                      disabled={actionLoading}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger-soft btn-xs"
                                      onClick={() => setDeletingPricingId(item.id)}
                                      disabled={actionLoading}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="manage-empty-state">
                      <div className="empty-micon">💰</div>
                      <h3 className="empty-mtitle">No Pricing Items Configured</h3>
                      <p className="empty-mtext">
                        Add rental rates, per-person dining packages, or decoration add-ons to help customers generate transparent quotes.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ marginTop: '0.75rem' }}
                        onClick={handleOpenAddPricingModal}
                      >
                        ➕ Add First Pricing Item
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 2: EVENT TYPES MANAGEMENT */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'event-types' && (
                <section className="glass-card manage-section-card">
                  <div className="section-header-flex">
                    <div>
                      <h2 className="manage-section-heading">🎉 Supported Event Types</h2>
                      <p className="manage-section-subtext">
                        Select all event types that your venue space is suitable for (e.g. Weddings, Corporate Events, Birthdays).
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveEventTypes}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving...' : '💾 Save Event Types'}
                    </button>
                  </div>

                  <div className="event-types-toggle-grid">
                    {allEventTypes.map((et) => {
                      const isSelected = selectedEventTypeIds.includes(et.id);
                      return (
                        <div
                          key={et.id}
                          className={`toggle-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => handleEventTypeToggle(et.id)}
                        >
                          <div className="toggle-card-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                            />
                          </div>
                          <div className="toggle-card-info">
                            <h4 className="toggle-card-title">{et.name}</h4>
                            {et.description && (
                              <p className="toggle-card-desc">{et.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="save-bar-bottom">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveEventTypes}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving Changes...' : '💾 Save Event Types'}
                    </button>
                  </div>
                </section>
              )}

              {/* ---------------------------------------------------- */}
              {/* TAB 3: FACILITIES & AMENITIES MANAGEMENT */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'facilities' && (
                <section className="glass-card manage-section-card">
                  <div className="section-header-flex">
                    <div>
                      <h2 className="manage-section-heading">🏊 Facilities & Amenities</h2>
                      <p className="manage-section-subtext">
                        Toggle amenities available at your venue (e.g. Parking, Air Conditioning, Power Backup, Catering, DJ).
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveFacilities}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving...' : '💾 Save Facilities'}
                    </button>
                  </div>

                  <div className="facilities-toggle-grid">
                    {allFacilities.map((fac) => {
                      const isSelected = selectedFacilityIds.includes(fac.id);
                      return (
                        <div
                          key={fac.id}
                          className={`facility-toggle-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => handleFacilityToggle(fac.id)}
                        >
                          <div className="facility-card-icon">{fac.icon || '✨'}</div>
                          <div className="facility-card-info">
                            <h4 className="facility-card-title">{fac.name}</h4>
                          </div>
                          <div className="facility-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="save-bar-bottom">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveFacilities}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving Changes...' : '💾 Save Facilities'}
                    </button>
                  </div>
                </section>
              )}

            </>
          ) : null}

        </main>
      </div>

      {/* 3. Add / Edit Pricing Modal */}
      {showPricingModal && (
        <div className="modal-overlay" onClick={handleClosePricingModal}>
          <div className="glass-card modal-content owner-pricing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingPricing ? '✏️ Edit Pricing Item' : '➕ Add Pricing Package Item'}
                </h2>
                <span className="modal-subtitle-venue">
                  Specify category, item name, and price for custom client quotation calculations.
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleClosePricingModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePricingItem}>
              <div className="venue-form-body">
                {pricingFormError && (
                  <div className="filter-validation-error" style={{ marginBottom: '1.2rem' }}>
                    ⚠️ {pricingFormError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Pricing Type / Category *</label>
                  <select
                    className="form-control"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value)}
                    disabled={actionLoading}
                    required
                  >
                    {ALLOWED_PRICING_TYPES.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Item Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Basic Hall Rental, Veg Buffet Deluxe, Flower Decoration"
                    value={pricingItemName}
                    onChange={(e) => setPricingItemName(e.target.value)}
                    disabled={actionLoading}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Price Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 50000"
                    value={pricingPrice}
                    onChange={(e) => setPricingPrice(e.target.value)}
                    disabled={actionLoading}
                    min="0"
                    step="any"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="checkbox-item-label">
                    <input
                      type="checkbox"
                      checked={pricingIsOptional}
                      onChange={(e) => setPricingIsOptional(e.target.checked)}
                      disabled={actionLoading}
                    />
                    <span>Is Optional Add-on? (Customer can choose whether to include this in quote)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer-actions" style={{ marginTop: '1.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClosePricingModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving Item...' : editingPricing ? 'Save Changes' : 'Add Pricing Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPricingId && (
        <div className="modal-overlay" onClick={() => setDeletingPricingId(null)}>
          <div className="glass-card modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Pricing Item?</h3>
            <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
              Are you sure you want to remove this pricing item from your venue package? This action cannot be undone.
            </p>
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingPricingId(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger-soft"
                onClick={() => handleDeletePricingItem(deletingPricingId)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerVenueManage;
