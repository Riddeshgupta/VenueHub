import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { isLoggedIn, getUser } from '../utils/auth';
import VenueCard from '../components/VenueCard';
import './Venues.css';

const Venues = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
  const isCustomer = isLoggedIn() && currentUser?.role === 'customer';

  const [venues, setVenues] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [wishlistedIds, setWishlistedIds] = useState([]);
  const [wishlistLoadingId, setWishlistLoadingId] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isFiltered, setIsFiltered] = useState(false);

  // Filter Form State
  const [city, setCity] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // Fetch Master Catalog, Event Types, and Customer Wishlist
  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMessage('');
    setValidationError('');

    try {
      const [venuesRes, eventTypesRes] = await Promise.all([
        api.get('/venues'),
        api.get('/event-types').catch(() => ({ data: { data: [] } }))
      ]);

      if (venuesRes.data && venuesRes.data.status === 'success') {
        const fetchedVenues = Array.isArray(venuesRes.data.data) ? venuesRes.data.data : [];
        setVenues(fetchedVenues);
      } else {
        setErrorMessage(venuesRes.data?.message || 'Failed to load venue catalog.');
      }

      if (eventTypesRes.data && eventTypesRes.data.status === 'success') {
        setEventTypes(eventTypesRes.data.data || []);
      }

      // Fetch customer wishlist if logged in as customer
      if (isCustomer) {
        try {
          const wlRes = await api.get('/wishlist/my');
          if (wlRes.data && wlRes.data.status === 'success') {
            const ids = (wlRes.data.data || []).map(item => item.venue_id);
            setWishlistedIds(ids);
          }
        } catch (e) {
          console.error('Error fetching customer wishlist:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching venue data:', err);
      setErrorMessage(
        'Unable to load venues at this moment. Please check if the VenueHub backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handle Wishlist Toggle for Venue Cards
  const handleToggleWishlist = async (venue) => {
    if (!isLoggedIn()) {
      setNoticeMessage('⚠️ Please log in to save venues to your wishlist.');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    if (!isCustomer) {
      setNoticeMessage('⚠️ Only customer accounts can save venues to wishlist.');
      setTimeout(() => setNoticeMessage(''), 4000);
      return;
    }

    setWishlistLoadingId(venue.id);
    const isSaved = wishlistedIds.includes(venue.id);

    try {
      if (isSaved) {
        const res = await api.delete(`/wishlist/${venue.id}`);
        if (res.data && res.data.status === 'success') {
          setWishlistedIds(prev => prev.filter(id => id !== venue.id));
          setNoticeMessage(`💔 Removed "${venue.name}" from your wishlist.`);
        }
      } else {
        const res = await api.post('/wishlist', { venue_id: venue.id });
        if (res.data && res.data.status === 'success') {
          setWishlistedIds(prev => [...prev, venue.id]);
          setNoticeMessage(`❤️ Saved "${venue.name}" to your wishlist!`);
        }
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      setNoticeMessage(`⚠️ ${err.response?.data?.message || 'Failed to update wishlist.'}`);
    } finally {
      setWishlistLoadingId(null);
      setTimeout(() => setNoticeMessage(''), 4000);
    }
  };

  // Handle Search Submission
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setValidationError('');

    if (guestCount && (isNaN(guestCount) || parseInt(guestCount, 10) <= 0)) {
      setValidationError('Guest count must be a positive integer.');
      return;
    }

    if (maxBudget && (isNaN(maxBudget) || parseFloat(maxBudget) <= 0)) {
      setValidationError('Maximum budget must be a positive number.');
      return;
    }

    const params = {};
    if (city.trim()) params.city = city.trim();
    if (eventTypeId) params.event_type_id = eventTypeId;
    if (eventDate) params.event_date = eventDate;
    if (guestCount.trim()) params.guest_count = guestCount.trim();
    if (maxBudget.trim()) params.max_budget = maxBudget.trim();

    const hasFilters = Object.keys(params).length > 0;

    setLoading(true);
    setErrorMessage('');

    try {
      if (!hasFilters) {
        const res = await api.get('/venues');
        if (res.data && res.data.status === 'success') {
          setVenues(Array.isArray(res.data.data) ? res.data.data : []);
        } else {
          setErrorMessage(res.data?.message || 'Failed to load venue catalog.');
        }
        setIsFiltered(false);
      } else {
        const res = await api.get('/venues/search', { params });
        if (res.data && res.data.status === 'success') {
          setVenues(Array.isArray(res.data.data) ? res.data.data : []);
          setIsFiltered(true);
        } else {
          setErrorMessage(res.data?.message || 'Failed to execute venue search.');
        }
      }
    } catch (err) {
      console.error('Error searching venues:', err);
      setErrorMessage(
        err.response?.data?.message || 'An error occurred while filtering venues.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = async () => {
    setCity('');
    setEventTypeId('');
    setEventDate('');
    setGuestCount('');
    setMaxBudget('');
    setValidationError('');
    setIsFiltered(false);

    setLoading(true);
    try {
      const res = await api.get('/venues');
      if (res.data && res.data.status === 'success') {
        setVenues(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      setErrorMessage('Failed to reset venue filters.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (venueId) => {
    navigate(`/venues/${venueId}`);
  };

  return (
    <div className="venues-page">
      <div className="container">
        
        {/* Header Hero Section */}
        <div className="venues-hero glass-card">
          <h1 className="venues-hero-title">
            Find Your <span className="gradient-text">Perfect Venue</span>
          </h1>
          <p className="venues-hero-subtitle">
            Explore top banquets, halls, and luxury spaces for weddings, corporate events, and celebrations.
          </p>
        </div>

        {/* Notice Toast Banner */}
        {noticeMessage && (
          <div className="glass-card filter-validation-error" style={{ color: '#f8fafc', background: 'rgba(30, 41, 59, 0.9)', marginBottom: '1.5rem' }}>
            {noticeMessage}
          </div>
        )}

        {/* Filter Bar */}
        <div className="glass-card filter-bar-card">
          <form onSubmit={handleSearch} className="filter-form">
            <div className="filter-field">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                placeholder="e.g. Mumbai, Delhi..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="eventTypeId">Event Type</label>
              <select
                id="eventTypeId"
                value={eventTypeId}
                onChange={(e) => setEventTypeId(e.target.value)}
              >
                <option value="">All Event Types</option>
                {eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="eventDate">Event Date</label>
              <input
                type="date"
                id="eventDate"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="guestCount">Guests</label>
              <input
                type="number"
                id="guestCount"
                placeholder="e.g. 200"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="maxBudget">Max Budget (₹)</label>
              <input
                type="number"
                id="maxBudget"
                placeholder="e.g. 150000"
                min="1"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>

            <div className="filter-actions">
              <button type="submit" className="btn btn-primary filter-submit-btn" disabled={loading}>
                {loading ? 'Searching...' : '🔍 Search'}
              </button>

              {isFiltered && (
                <button
                  type="button"
                  className="btn btn-secondary filter-clear-btn"
                  onClick={handleClearFilters}
                  disabled={loading}
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {validationError && (
            <div className="filter-validation-error">
              ⚠️ {validationError}
            </div>
          )}
        </div>

        {/* Results Counter Header */}
        {!loading && !errorMessage && (
          <div className="results-header-bar">
            <h2 className="results-count-title">
              {isFiltered ? `Found ${venues.length} Matching Venue(s)` : `All Available Venues (${venues.length})`}
            </h2>
            {isFiltered && (
              <span className="active-filter-badge">
                Filtered Search
              </span>
            )}
          </div>
        )}

        {/* Loading Spinner State */}
        {loading && (
          <div className="glass-card loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Searching available venues...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMessage && (
          <div className="glass-card error-state-card">
            <div style={{ fontSize: '2.5rem' }}>⚠️</div>
            <h3 className="error-state-title">Unable to Fetch Venues</h3>
            <p className="error-state-desc">{errorMessage}</p>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSearch}
              style={{ marginTop: '0.5rem' }}
            >
              🔄 Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !errorMessage && venues.length === 0 && (
          <div className="glass-card empty-venues-card">
            <div className="empty-icon">🏰</div>
            <h3 className="empty-title">
              {isFiltered ? 'No Venues Found' : 'No Venues Available'}
            </h3>
            <p className="empty-text">
              {isFiltered
                ? 'No venues match your search criteria.'
                : 'There are currently no approved venues available in the catalog. Please check back later.'}
            </p>
            {isFiltered && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClearFilters}
              >
                Clear Filters & Show All
              </button>
            )}
          </div>
        )}

        {/* Venues Catalog Grid */}
        {!loading && !errorMessage && venues.length > 0 && (
          <div className="venues-grid">
            {venues.map((venue) => (
              <VenueCard 
                key={venue.id} 
                venue={venue} 
                onViewDetails={handleViewDetails} 
                isWishlisted={wishlistedIds.includes(venue.id)}
                onToggleWishlist={handleToggleWishlist}
                wishlistLoading={wishlistLoadingId === venue.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Venues;
