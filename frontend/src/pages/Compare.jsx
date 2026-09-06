import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Compare.css';

const Compare = () => {
  const navigate = useNavigate();

  const [compareIds, setCompareIds] = useState([]);
  const [comparedVenues, setComparedVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Date Availability Checker
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState('');
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // 1. Read LocalStorage and fetch venue details
  const loadCompareData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const stored = localStorage.getItem('venuehub_compare');
      let ids = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(ids)) {
        ids = [];
      }

      // Enforce comparison limit of 3 venues max
      if (ids.length > 3) {
        ids = ids.slice(0, 3);
        localStorage.setItem('venuehub_compare', JSON.stringify(ids));
        window.dispatchEvent(new Event('compareUpdated'));
      }

      setCompareIds(ids);

      if (ids.length === 0) {
        setComparedVenues([]);
        setLoading(false);
        return;
      }

      // Fetch details, pricing, and reviews for all compared venues concurrently
      const venuePromises = ids.map(async (id) => {
        try {
          const [detailsRes, pricingRes, reviewsRes] = await Promise.all([
            api.get(`/venues/${id}/details`),
            api.get(`/venues/${id}/pricing`).catch(() => ({ data: { data: [] } })),
            api.get(`/venues/${id}/reviews`).catch(() => ({ data: { data: { average_rating: 0, total_reviews: 0 } } }))
          ]);

          if (detailsRes.data && detailsRes.data.status === 'success') {
            return {
              id: Number(id),
              venue: detailsRes.data.data.venue,
              event_types: detailsRes.data.data.event_types || [],
              facilities: detailsRes.data.data.facilities || [],
              pricing: pricingRes.data?.data || [],
              reviews: reviewsRes.data?.data || { average_rating: 0, total_reviews: 0 }
            };
          }
          return null;
        } catch (e) {
          console.error(`Error fetching compared venue ID ${id}:`, e);
          return null;
        }
      });

      const results = await Promise.all(venuePromises);
      const validVenues = results.filter(Boolean);

      setComparedVenues(validVenues);

      // If user selected a date already, check availability
      if (selectedDate && validVenues.length > 0) {
        checkAvailabilityForDate(selectedDate, validVenues);
      }

    } catch (err) {
      console.error('Error loading comparison data:', err);
      setErrorMessage('Failed to load venue comparison data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompareData();
    window.scrollTo(0, 0);
  }, []);

  // 2. Remove Venue from Compare Handler
  const handleRemoveVenue = (venueId) => {
    try {
      const stored = localStorage.getItem('venuehub_compare');
      let ids = stored ? JSON.parse(stored) : [];
      ids = ids.filter(id => String(id) !== String(venueId));
      
      localStorage.setItem('venuehub_compare', JSON.stringify(ids));
      window.dispatchEvent(new Event('compareUpdated'));

      setCompareIds(ids);
      setComparedVenues(prev => prev.filter(v => String(v.id) !== String(venueId)));
    } catch (e) {
      console.error('Error removing venue from compare:', e);
    }
  };

  // 3. Date Availability Checker Handler
  const checkAvailabilityForDate = async (dateStr, venuesToTest = comparedVenues) => {
    if (!dateStr || venuesToTest.length === 0) return;

    setCheckingAvailability(true);
    const newMap = {};

    try {
      const availPromises = venuesToTest.map(async (item) => {
        try {
          const res = await api.get(`/venues/${item.id}/availability/${dateStr}`);
          if (res.data && res.data.status === 'success') {
            newMap[item.id] = res.data.data?.status || 'available';
          } else {
            newMap[item.id] = 'available';
          }
        } catch (e) {
          newMap[item.id] = 'available';
        }
      });

      await Promise.all(availPromises);
      setAvailabilityMap(newMap);
    } catch (e) {
      console.error('Error checking availability across venues:', e);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (newDate) {
      checkAvailabilityForDate(newDate);
    } else {
      setAvailabilityMap({});
    }
  };

  // Reusable Indian currency formatting helper
  const formatCurrency = (amount) => {
    if (amount == null || amount === '') return 'Not available';
    const num = Number(amount);
    if (isNaN(num)) return 'Not available';

    // Whole numbers display with 0 fraction digits; decimal values retain 2 fraction digits
    const formatted = num % 1 === 0
      ? num.toLocaleString('en-IN', { maximumFractionDigits: 0 })
      : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `₹${formatted}`;
  };

  const formatPricingType = (type) => {
    const labels = {
      venue_rental: 'Venue Rental',
      food_per_person: 'Food (Per Person)',
      decoration: 'Decoration',
      dj_music: 'DJ & Music',
      parking: 'Parking Fee',
      other: 'Other Services',
      tax: 'Taxes & Fees'
    };
    return labels[type] || type.replace('_', ' ');
  };

  // Extract all distinct pricing categories across compared venues
  const allPricingCategories = [
    'venue_rental',
    'food_per_person',
    'decoration',
    'dj_music',
    'parking',
    'other',
    'tax'
  ];

  if (loading) {
    return (
      <div className="compare-page">
        <div className="container">
          <div className="glass-card loading-container" style={{ margin: '4rem 0' }}>
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading venue comparison table...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty State: No venues selected
  if (comparedVenues.length === 0) {
    return (
      <div className="compare-page">
        <div className="container">
          <div className="venues-header">
            <h1 className="venues-title">
              Compare <span className="gradient-text">Event Venues</span>
            </h1>
            <p className="venues-subtitle">
              Compare pricing, capacities, amenities, and availability side-by-side to find your ideal match.
            </p>
          </div>

          <div className="glass-card empty-compare-card">
            <div className="empty-compare-icon">⚖️</div>
            <h2 className="empty-compare-title">No Venues Added for Comparison</h2>
            <p className="empty-compare-text">
              You currently have no venues in your comparison list. Browse our catalog and click 
              <strong> "Add to Compare"</strong> on any venue card or details page.
            </p>
            <Link to="/venues" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              🔍 Browse Venues Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="compare-page">
      <div className="container">
        {/* Header */}
        <div className="venues-header">
          <h1 className="venues-title">
            Compare <span className="gradient-text">Event Venues</span> ({comparedVenues.length}/3)
          </h1>
          <p className="venues-subtitle">
            Side-by-side comparison of verified capacities, itemized costs, amenities, and real-time date availability.
          </p>
        </div>

        {/* Date Availability Checker Widget */}
        <div className="glass-card compare-date-bar">
          <div className="date-bar-label">
            <span>📅 Select Event Date to Check Live Availability:</span>
          </div>
          <div className="date-bar-input-group">
            <input
              type="date"
              min={todayStr}
              className="form-control date-bar-input"
              value={selectedDate}
              onChange={handleDateChange}
            />
            {checkingAvailability && <span className="checking-spinner">Checking...</span>}
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="glass-card compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="feature-col-header">Comparison Attributes</th>
                {comparedVenues.map((item) => (
                  <th key={item.id} className="venue-col-header">
                    <div className="venue-header-card">
                      <div className="venue-header-badge">🏛️</div>
                      <h3 className="compare-venue-name">{item.venue.name}</h3>
                      <p className="compare-venue-city">📍 {item.venue.city}, {item.venue.state}</p>
                      
                      <div className="compare-venue-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/venues/${item.id}`)}
                        >
                          View Details
                        </button>
                        
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveVenue(item.id)}
                          title="Remove from compare"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SECTION: BASIC INFO */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>📋 Basic Information</td>
              </tr>
              <tr>
                <td className="feature-label">Location Address</td>
                {comparedVenues.map((item) => (
                  <td key={item.id}>
                    {[item.venue.address, item.venue.city, item.venue.state, item.venue.pincode].filter(Boolean).join(', ') || 'Not available'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="feature-label">Capacity Range</td>
                {comparedVenues.map((item) => (
                  <td key={item.id} className="highlight-cell">
                    <strong>{item.venue.capacity_min} - {item.venue.capacity_max} Guests</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="feature-label">Starting Base Price</td>
                {comparedVenues.map((item) => (
                  <td key={item.id} className="price-cell-large">
                    {formatCurrency(item.venue.base_price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="feature-label">Description</td>
                {comparedVenues.map((item) => (
                  <td key={item.id} className="desc-cell">
                    {item.venue.description || 'Not available'}
                  </td>
                ))}
              </tr>

              {/* SECTION: DATE AVAILABILITY */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>📅 Date Availability Status</td>
              </tr>
              <tr>
                <td className="feature-label">
                  Availability
                  {selectedDate ? <span className="date-subtag">({selectedDate})</span> : <span className="date-subtag">(Select date above)</span>}
                </td>
                {comparedVenues.map((item) => {
                  const status = availabilityMap[item.id];
                  return (
                    <td key={item.id}>
                      {selectedDate ? (
                        status === 'available' ? (
                          <span className="avail-badge status-available">✓ Available</span>
                        ) : status === 'booked' ? (
                          <span className="avail-badge status-booked">❌ Booked</span>
                        ) : (
                          <span className="avail-badge status-blocked">⚠️ Blocked</span>
                        )
                      ) : (
                        <span className="text-muted">Select date to check</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* SECTION: EVENT TYPES */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>🎉 Supported Event Types</td>
              </tr>
              <tr>
                <td className="feature-label">Event Types</td>
                {comparedVenues.map((item) => (
                  <td key={item.id}>
                    {item.event_types.length > 0 ? (
                      <div className="compare-tags-wrap">
                        {item.event_types.map(et => (
                          <span key={et.id} className="compare-tag">{et.name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">Not specified</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* SECTION: FACILITIES */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>✨ Available Facilities & Amenities</td>
              </tr>
              <tr>
                <td className="feature-label">Facilities</td>
                {comparedVenues.map((item) => (
                  <td key={item.id}>
                    {item.facilities.length > 0 ? (
                      <div className="compare-tags-wrap">
                        {item.facilities.map(fac => (
                          <span key={fac.id} className="compare-fac-tag">
                            {fac.icon || '•'} {fac.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">Not listed</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* SECTION: ITEMIZED PRICING */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>💎 Itemized Pricing Breakdown</td>
              </tr>
              {allPricingCategories.map((cat) => {
                // Check if any compared venue has a pricing item for this category
                const isRelevant = comparedVenues.some(v => v.pricing.some(p => p.pricing_type === cat));
                if (!isRelevant) return null;

                return (
                  <tr key={cat}>
                    <td className="feature-label">{formatPricingType(cat)}</td>
                    {comparedVenues.map((item) => {
                      const foundPricing = item.pricing.filter(p => p.pricing_type === cat);
                      if (foundPricing.length === 0) {
                        return <td key={item.id} className="text-muted">Not listed</td>;
                      }

                      return (
                        <td key={item.id}>
                          {foundPricing.map(p => (
                            <div key={p.id} className="itemized-price-line">
                              <span className="item-line-name">{p.item_name}:</span>{' '}
                              <strong className="item-line-val">{formatCurrency(p.price)}</strong>
                              {p.is_optional && <span className="opt-subbadge"> (Optional)</span>}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* SECTION: REVIEWS & RATINGS */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>⭐ Customer Reviews & Ratings</td>
              </tr>
              <tr>
                <td className="feature-label">Average Rating</td>
                {comparedVenues.map((item) => (
                  <td key={item.id}>
                    {item.reviews.average_rating > 0 ? (
                      <span className="rating-star-val">⭐ {item.reviews.average_rating} / 5</span>
                    ) : (
                      <span className="text-muted">No reviews yet</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="feature-label">Total Reviews</td>
                {comparedVenues.map((item) => (
                  <td key={item.id}>
                    {item.reviews.total_reviews} {item.reviews.total_reviews === 1 ? 'review' : 'reviews'}
                  </td>
                ))}
              </tr>

              {/* SECTION: ACTION CTA */}
              <tr className="section-row">
                <td colSpan={comparedVenues.length + 1}>📝 Action & Quotation Request</td>
              </tr>
              <tr>
                <td className="feature-label">Request Quote</td>
                {comparedVenues.map((item) => (
                  <td key={item.id}>
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={() => navigate(`/venues/${item.id}`)}
                    >
                      📝 Request Quotation
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Compare;
