import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser, logout } from '../utils/auth';
import './OwnerVenues.css';

const OwnerVenues = () => {
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
  const [venues, setVenues] = useState([]);
  const [eventTypesOptions, setEventTypesOptions] = useState([]);
  const [facilitiesOptions, setFacilitiesOptions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [togglingIds, setTogglingIds] = useState([]);

  // Modal State for Add / Edit Venue
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null); // null if adding, venue object if editing
  const [modalLoading, setModalLoading] = useState(false);

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formCapacityMin, setFormCapacityMin] = useState(50);
  const [formCapacityMax, setFormCapacityMax] = useState(500);
  const [formBasePrice, setFormBasePrice] = useState(100000);
  const [selectedEventTypeIds, setSelectedEventTypeIds] = useState([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState([]);
  const [formValidationError, setFormValidationError] = useState('');

  // Toast Notice State
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // 2. Fetch Owner Venues List and System Options
  const fetchOwnerVenues = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/venues/my');
      if (res.data && res.data.status === 'success') {
        setVenues(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setErrorMessage(res.data?.message || 'Failed to load listed venues.');
      }
    } catch (err) {
      console.error('Error fetching owner venues:', err);
      setErrorMessage(
        err.response?.data?.message || 'Unable to fetch your venues. Please check network connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemOptions = async () => {
    try {
      const [etRes, facRes] = await Promise.allSettled([
        api.get('/event-types'),
        api.get('/facilities')
      ]);

      if (etRes.status === 'fulfilled' && etRes.value.data?.status === 'success') {
        setEventTypesOptions(Array.isArray(etRes.value.data.data) ? etRes.value.data.data : []);
      }
      if (facRes.status === 'fulfilled' && facRes.value.data?.status === 'success') {
        setFacilitiesOptions(Array.isArray(facRes.value.data.data) ? facRes.value.data.data : []);
      }
    } catch (err) {
      console.error('Error fetching event types or facilities:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn() && currentUser?.role === 'venue_owner') {
      fetchOwnerVenues();
      fetchSystemOptions();
      window.scrollTo(0, 0);
    }
  }, []);

  // 3. Open Add Venue Modal
  const handleOpenAddModal = () => {
    setEditingVenue(null);
    setFormName('');
    setFormDescription('');
    setFormAddress('');
    setFormCity('');
    setFormState('');
    setFormPincode('');
    setFormCapacityMin(50);
    setFormCapacityMax(500);
    setFormBasePrice(100000);
    setSelectedEventTypeIds(eventTypesOptions.length > 0 ? [eventTypesOptions[0].id] : []);
    setSelectedFacilityIds([]);
    setFormValidationError('');
    setShowModal(true);
  };

  // 4. Open Edit Venue Modal
  const handleOpenEditModal = async (venue) => {
    setEditingVenue(venue);
    setFormName(venue.name || '');
    setFormDescription(venue.description || '');
    setFormAddress(venue.address || '');
    setFormCity(venue.city || '');
    setFormState(venue.state || '');
    setFormPincode(venue.pincode || '');
    setFormCapacityMin(venue.capacity_min || 0);
    setFormCapacityMax(venue.capacity_max || 0);
    setFormBasePrice(venue.base_price || 0);
    setFormValidationError('');
    setShowModal(true);

    // Fetch existing assigned event types and facilities for this venue
    try {
      const detailsRes = await api.get(`/venues/${venue.id}/details`);
      if (detailsRes.data && detailsRes.data.status === 'success') {
        const ets = detailsRes.data.data?.event_types || [];
        const facs = detailsRes.data.data?.facilities || [];
        setSelectedEventTypeIds(ets.map(e => e.id));
        setSelectedFacilityIds(facs.map(f => f.id));
      }
    } catch (err) {
      console.error('Error fetching existing venue associations:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVenue(null);
    setFormValidationError('');
  };

  // 5. Submit Add / Edit Venue Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormValidationError('');

    // Frontend Validations
    if (!formName.trim()) {
      setFormValidationError('Venue Name is required.');
      return;
    }
    if (!formDescription.trim()) {
      setFormValidationError('Description is required.');
      return;
    }
    if (!formAddress.trim()) {
      setFormValidationError('Address is required.');
      return;
    }
    if (!formCity.trim()) {
      setFormValidationError('City is required.');
      return;
    }
    if (!formState.trim()) {
      setFormValidationError('State is required.');
      return;
    }
    if (!formPincode.trim() || !/^\d{6}$/.test(formPincode.trim())) {
      setFormValidationError('Please provide a valid 6-digit Pincode.');
      return;
    }

    const minCap = Number(formCapacityMin);
    const maxCap = Number(formCapacityMax);
    const price = Number(formBasePrice);

    if (isNaN(minCap) || minCap < 0) {
      setFormValidationError('Minimum capacity must be 0 or greater.');
      return;
    }
    if (isNaN(maxCap) || maxCap <= minCap) {
      setFormValidationError('Maximum capacity must be greater than minimum capacity.');
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormValidationError('Base price must not be negative.');
      return;
    }
    if (selectedEventTypeIds.length === 0) {
      setFormValidationError('Please select at least one supported event type.');
      return;
    }

    setModalLoading(true);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim(),
      address: formAddress.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      pincode: formPincode.trim(),
      capacity_min: minCap,
      capacity_max: maxCap,
      base_price: price,
      event_type_ids: selectedEventTypeIds,
      facility_ids: selectedFacilityIds
    };

    try {
      if (editingVenue) {
        // Edit existing venue
        const res = await api.put(`/venues/${editingVenue.id}`, payload);
        if (res.data && res.data.status === 'success') {
          triggerToast('success', '✓ Venue updated successfully!');
          handleCloseModal();
          fetchOwnerVenues();
        } else {
          setFormValidationError(res.data?.message || 'Failed to update venue.');
        }
      } else {
        // Create new venue
        const res = await api.post('/venues', payload);
        if (res.data && res.data.status === 'success') {
          triggerToast('success', '✨ New venue created successfully! It is pending admin approval.');
          handleCloseModal();
          fetchOwnerVenues();
        } else {
          setFormValidationError(res.data?.message || 'Failed to create venue.');
        }
      }
    } catch (err) {
      console.error('Error submitting venue form:', err);
      setFormValidationError(
        err.response?.data?.message || 'An error occurred while saving venue details.'
      );
    } finally {
      setModalLoading(false);
    }
  };

  // 6. Toggle Venue Active Status Handler
  const handleToggleActiveStatus = async (venue) => {
    if (togglingIds.includes(venue.id)) return;

    setTogglingIds(prev => [...prev, venue.id]);
    const newActiveState = !venue.is_active;

    try {
      const res = await api.put(`/venues/${venue.id}/status`, { is_active: newActiveState });
      if (res.data && res.data.status === 'success') {
        setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, is_active: newActiveState } : v));
        triggerToast('success', `Venue status updated to ${newActiveState ? 'Active' : 'Inactive'}.`);
      } else {
        triggerToast('warning', res.data?.message || 'Failed to update active status.');
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
      triggerToast('warning', err.response?.data?.message || 'An error occurred while updating active status.');
    } finally {
      setTogglingIds(prev => prev.filter(id => id !== venue.id));
    }
  };

  const handleEventTypeCheckboxChange = (eventTypeId) => {
    setSelectedEventTypeIds(prev =>
      prev.includes(eventTypeId)
        ? prev.filter(id => id !== eventTypeId)
        : [...prev, eventTypeId]
    );
  };

  const handleFacilityCheckboxChange = (facilityId) => {
    setSelectedFacilityIds(prev =>
      prev.includes(facilityId)
        ? prev.filter(id => id !== facilityId)
        : [...prev, facilityId]
    );
  };

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

  if (!currentUser) return null;

  return (
    <div className="owner-venues-page">
      {/* Toast Notice Banner */}
      {toastNotice.text && (
        <div className={`toast-notice toast-${toastNotice.type}`}>
          {toastNotice.text}
        </div>
      )}

      <div className="container dashboard-container">
        
        {/* Mobile Sidebar Toggle Button */}
        <button
          className="dashboard-mobile-toggle"
          onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        >
          {sidebarMobileOpen ? '✕ Close Sidebar' : '☰ Owner Menu'}
        </button>

        {/* 1. Sidebar Navigation */}
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
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📊 Overview Dashboard
                </Link>
              </li>
              <li>
                <button type="button" className="sidebar-link active">
                  🏰 My Venues ({venues.length})
                </button>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📝 Quotation Requests
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  📅 Bookings
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  🗓️ Availability
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  💰 Pricing
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  ⭐ Reviews
                </Link>
              </li>
              <li>
                <Link to="/owner/dashboard" className="sidebar-link" onClick={() => setSidebarMobileOpen(false)}>
                  🔔 Notifications
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

        {/* 2. Main Content */}
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
                My <span className="gradient-text">Listed Venues</span>
              </h1>
              <p className="page-header-subtitle">
                Manage your event venue inventory, edit details, assign event types, and control active listings.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-add-venue"
              onClick={handleOpenAddModal}
            >
              ➕ Add New Venue
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="glass-card filter-validation-error" style={{ marginBottom: '1.5rem' }}>
              ⚠️ {errorMessage}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchOwnerVenues}
                style={{ marginLeft: '1rem' }}
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* 3. My Venues Stack / Cards */}
          {loading ? (
            <div className="glass-card loading-container" style={{ padding: '3rem 0' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Loading your listed venues...</p>
            </div>
          ) : venues.length > 0 ? (
            <div className="owner-venues-stack">
              {venues.map((v) => (
                <div key={v.id} className="glass-card owner-venue-full-card">
                  <div className="ovcard-header">
                    <div className="ovcard-title-group">
                      <span className="ovcard-icon">🏰</span>
                      <div>
                        <h3 className="ovcard-venue-name">{v.name}</h3>
                        <span className="ovcard-location">
                          📍 {v.city}, {v.state} • Pincode: {v.pincode || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="ovcard-status-badges">
                      <span className={`status-pill ${getStatusBadgeClass(v.status)}`}>
                        ● Approval: {v.status}
                      </span>
                      <span className={`status-pill ${v.is_active ? 'badge-info' : 'badge-secondary'}`}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="ovcard-description">
                    <p>"{v.description || 'No description provided.'}"</p>
                    <span className="ovcard-address font-muted">Address: {v.address}</span>
                  </div>

                  <div className="ovcard-specs-grid">
                    <div className="ovspec-box">
                      <span className="ovspec-label">Capacity Range</span>
                      <span className="ovspec-val">👥 {v.capacity_min} - {v.capacity_max} Guests</span>
                    </div>
                    <div className="ovspec-box">
                      <span className="ovspec-label">Base Price</span>
                      <span className="ovspec-val price-val">{formatCurrency(v.base_price)}</span>
                    </div>
                    <div className="ovspec-box">
                      <span className="ovspec-label">Venue ID</span>
                      <span className="ovspec-val">#{v.id}</span>
                    </div>
                  </div>

                  <div className="ovcard-footer-actions">
                    <div className="left-actions">
                      <Link to={`/venues/${v.id}`} className="btn btn-secondary btn-sm">
                        🔍 View Public Page
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEditModal(v)}
                      >
                        ✏️ Edit Details
                      </button>
                      <Link to={`/owner/venues/${v.id}/manage`} className="btn btn-primary btn-sm">
                        ⚙️ Manage Features & Pricing
                      </Link>
                      <Link to={`/owner/venues/${v.id}/availability`} className="btn btn-secondary btn-sm">
                        🗓️ Availability Calendar
                      </Link>
                    </div>

                    <div className="right-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${v.is_active ? 'btn-outline' : 'btn-primary'}`}
                        disabled={togglingIds.includes(v.id)}
                        onClick={() => handleToggleActiveStatus(v)}
                      >
                        {togglingIds.includes(v.id)
                          ? 'Updating...'
                          : v.is_active ? '⏸️ Deactivate Listing' : '▶️ Activate Listing'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card empty-quotations-card">
              <div className="empty-qicon">🏰</div>
              <h3 className="empty-qtitle">No Venues Listed Yet</h3>
              <p className="empty-qtext">
                Start adding your banquet halls, lawns, or conference venues to receive customer quotation requests and bookings.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
                onClick={handleOpenAddModal}
              >
                ➕ Add Your First Venue
              </button>
            </div>
          )}

        </main>
      </div>

      {/* 4. Add / Edit Venue Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="glass-card modal-content owner-venue-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingVenue ? `✏️ Edit Venue: ${editingVenue.name}` : '➕ Add New Venue Listing'}
                </h2>
                <span className="modal-subtitle-venue">
                  {editingVenue ? 'Update venue specifications, pricing, and associations.' : 'Fill in complete details to submit your venue for admin approval.'}
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="venue-form-body">
                {formValidationError && (
                  <div className="filter-validation-error" style={{ marginBottom: '1.2rem' }}>
                    ⚠️ {formValidationError}
                  </div>
                )}

                {/* Basic Information */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Venue Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Royal Palace Banquet & Lawn"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      disabled={modalLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Base Starting Price (₹) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 100000"
                      value={formBasePrice}
                      onChange={(e) => setFormBasePrice(e.target.value)}
                      disabled={modalLoading}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe your venue space, ambiance, dining capacity, parking facility, etc."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    disabled={modalLoading}
                    required
                  ></textarea>
                </div>

                {/* Location Fields */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Street Address *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 123 Main Palace Road"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    disabled={modalLoading}
                    required
                  />
                </div>

                <div className="form-grid-3" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bhilwara"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      disabled={modalLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rajasthan"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      disabled={modalLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 311001"
                      value={formPincode}
                      onChange={(e) => setFormPincode(e.target.value)}
                      disabled={modalLoading}
                      required
                    />
                  </div>
                </div>

                {/* Capacity Fields */}
                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Minimum Capacity (Guests) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formCapacityMin}
                      onChange={(e) => setFormCapacityMin(e.target.value)}
                      disabled={modalLoading}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Maximum Capacity (Guests) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formCapacityMax}
                      onChange={(e) => setFormCapacityMax(e.target.value)}
                      disabled={modalLoading}
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Supported Event Types Checkboxes */}
                <div className="checkbox-section-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label section-subheading">
                    Supported Event Types * (Select at least 1)
                  </label>
                  <div className="checkbox-options-grid">
                    {eventTypesOptions.map((et) => (
                      <label key={et.id} className="checkbox-item-label">
                        <input
                          type="checkbox"
                          checked={selectedEventTypeIds.includes(et.id)}
                          onChange={() => handleEventTypeCheckboxChange(et.id)}
                          disabled={modalLoading}
                        />
                        <span>{et.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Facilities Checkboxes */}
                <div className="checkbox-section-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label section-subheading">
                    Available Facilities & Amenities
                  </label>
                  <div className="checkbox-options-grid">
                    {facilitiesOptions.map((fac) => (
                      <label key={fac.id} className="checkbox-item-label">
                        <input
                          type="checkbox"
                          checked={selectedFacilityIds.includes(fac.id)}
                          onChange={() => handleFacilityCheckboxChange(fac.id)}
                          disabled={modalLoading}
                        />
                        <span>{fac.icon ? `${fac.icon} ` : ''}{fac.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

              <div className="modal-footer-actions" style={{ marginTop: '1.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalLoading}
                >
                  {modalLoading 
                    ? 'Saving Venue...' 
                    : editingVenue ? 'Save Changes' : 'Submit Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerVenues;
