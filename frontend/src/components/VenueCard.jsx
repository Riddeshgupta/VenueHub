import React from 'react';
import { useNavigate } from 'react-router-dom';
import './VenueCard.css';

const VenueCard = ({ venue, onViewDetails, isWishlisted, onToggleWishlist, wishlistLoading }) => {
  const navigate = useNavigate();

  if (!venue) return null;

  const {
    id,
    name,
    city,
    state,
    address,
    capacity_min,
    capacity_max,
    base_price,
    description
  } = venue;

  // Format base price in Indian Rupees
  const formattedPrice = base_price != null 
    ? `₹${Number(base_price).toLocaleString('en-IN')}` 
    : 'On Request';

  // Format capacity string
  const capacityText = (capacity_min != null && capacity_max != null)
    ? `${capacity_min} - ${capacity_max} Guests`
    : 'Flexible Capacity';

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(id);
    } else {
      navigate(`/venues/${id}`);
    }
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(venue);
    }
  };

  return (
    <div className="glass-card venue-card">
      {/* CSS Pure Placeholder Banner */}
      <div className="venue-card-banner">
        <div className="venue-card-badge-icon">🏛️</div>
        {city && <span className="venue-card-city-tag">📍 {city}</span>}
        
        {/* Wishlist Heart Button */}
        {onToggleWishlist && (
          <button
            type="button"
            className={`venue-card-wishlist-btn ${isWishlisted ? 'is-saved' : ''}`}
            onClick={handleWishlistClick}
            disabled={wishlistLoading}
            title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-label="Wishlist toggle"
          >
            {wishlistLoading ? '⌛' : (isWishlisted ? '❤️' : '🤍')}
          </button>
        )}
      </div>

      {/* Card Content Body */}
      <div className="venue-card-body">
        <h3 className="venue-card-title">{name || 'Unnamed Venue'}</h3>

        <div className="venue-card-location">
          <span>📍</span>
          <span>{[address, city, state].filter(Boolean).join(', ')}</span>
        </div>

        {description && (
          <p className="venue-card-desc" title={description}>
            {description}
          </p>
        )}

        {/* Specifications Grid */}
        <div className="venue-card-specs">
          <div className="spec-item">
            <span className="spec-label">Capacity</span>
            <span className="spec-value">{capacityText}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Starting Price</span>
            <span className="spec-value price-highlight">{formattedPrice}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="venue-card-footer">
          <button 
            type="button" 
            className="btn btn-secondary venue-card-btn"
            onClick={handleCardClick}
          >
            View Details ➔
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenueCard;
