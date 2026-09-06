import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  // Search Form State
  const [searchParams, setSearchParams] = useState({
    eventType: '',
    location: '',
    eventDate: '',
    guests: '',
    budget: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to venues page with search params (or default)
    navigate('/venues');
  };

  return (
    <div className="home-page">
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-pill">
            Discover • Compare • Quote • Book
          </div>
          <h1 className="hero-title">
            Find the Perfect Venue for Your <span className="gradient-text">Unforgettable Event</span>
          </h1>
          <p className="hero-subtitle">
            VenueHub connects event planners and customers directly with top-tier venue owners. 
            Get customized quotations, compare itemized pricing, and book your ideal venue effortlessly.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navigate('/venues')}>
              Explore All Venues
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/register')}>
              Join as Venue Owner
            </button>
          </div>
        </div>
      </section>

      {/* 2. Search Section */}
      <section className="container search-section">
        <div className="glass-card search-box">
          <form onSubmit={handleSearch} className="search-grid">
            {/* Event Type */}
            <div className="form-group">
              <label htmlFor="eventType">Event Type</label>
              <select 
                id="eventType"
                name="eventType"
                className="form-control"
                value={searchParams.eventType}
                onChange={handleChange}
              >
                <option value="">All Event Types</option>
                <option value="1">Wedding & Reception</option>
                <option value="2">Birthday Party</option>
                <option value="3">Corporate Conference</option>
                <option value="4">Anniversary Gala</option>
                <option value="5">Pre-Wedding Function</option>
              </select>
            </div>

            {/* Location */}
            <div className="form-group">
              <label htmlFor="location">Location / City</label>
              <input 
                type="text" 
                id="location"
                name="location"
                placeholder="e.g. Bhilwara, Jaipur" 
                className="form-control"
                value={searchParams.location}
                onChange={handleChange}
              />
            </div>

            {/* Event Date */}
            <div className="form-group">
              <label htmlFor="eventDate">Event Date</label>
              <input 
                type="date" 
                id="eventDate"
                name="eventDate"
                className="form-control"
                value={searchParams.eventDate}
                onChange={handleChange}
              />
            </div>

            {/* Guests */}
            <div className="form-group">
              <label htmlFor="guests">Guests Count</label>
              <select 
                id="guests"
                name="guests"
                className="form-control"
                value={searchParams.guests}
                onChange={handleChange}
              >
                <option value="">Any Capacity</option>
                <option value="50">50 - 100 guests</option>
                <option value="200">100 - 300 guests</option>
                <option value="500">300 - 500 guests</option>
                <option value="1000">500+ guests</option>
              </select>
            </div>

            {/* Budget */}
            <div className="form-group">
              <label htmlFor="budget">Max Budget (₹)</label>
              <select 
                id="budget"
                name="budget"
                className="form-control"
                value={searchParams.budget}
                onChange={handleChange}
              >
                <option value="">Any Budget</option>
                <option value="100000">Under ₹1,00,000</option>
                <option value="250000">₹1,00,000 - ₹2,50,000</option>
                <option value="500000">₹2,50,000 - ₹5,00,000</option>
                <option value="1000000">₹5,00,000+</option>
              </select>
            </div>

            {/* Search Button */}
            <div className="search-btn-col">
              <button type="submit" className="btn btn-primary search-btn">
                🔍 Search Venues
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 3. Concept Explanation / How It Works */}
      <section className="concept-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">How VenueHub Works</span>
            <h2 className="section-title">Streamlined Venue Booking in 4 Easy Steps</h2>
            <p className="section-desc">
              No hidden fees, no phone tag. Experience a modern, transparent workflow from discovery to verified booking.
            </p>
          </div>

          <div className="concept-grid">
            {/* Step 1 */}
            <div className="glass-card concept-card">
              <span className="concept-step">01</span>
              <div className="concept-icon-wrap">🏰</div>
              <h3 className="concept-card-title">1. Discover Venues</h3>
              <p className="concept-card-desc">
                Browse verified venues filtered by location, capacity, event compatibility, and amenity offerings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card concept-card">
              <span className="concept-step">02</span>
              <div className="concept-icon-wrap">📝</div>
              <h3 className="concept-card-title">2. Request Quotation</h3>
              <p className="concept-card-desc">
                Send direct quotation requests to venue owners specifying your event type, date, and guest count.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card concept-card">
              <span className="concept-step">03</span>
              <div className="concept-icon-wrap">📊</div>
              <h3 className="concept-card-title">3. Compare & Decide</h3>
              <p className="concept-card-desc">
                Receive itemized price breakdowns from owners, review line items transparently, and accept your best match.
              </p>
            </div>

            {/* Step 4 */}
            <div className="glass-card concept-card">
              <span className="concept-step">04</span>
              <div className="concept-icon-wrap">✅</div>
              <h3 className="concept-card-title">4. Instant Booking</h3>
              <p className="concept-card-desc">
                Confirm your booking with locked event dates and track real-time notifications every step of the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Choose VenueHub / Key Features */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Platform Advantages</span>
            <h2 className="section-title">Why Event Organizers Choose VenueHub</h2>
          </div>

          <div className="features-grid">
            <div className="glass-card feature-card">
              <h3 className="feature-title">⚡ Real-time Notifications</h3>
              <p className="feature-desc">
                Stay updated instantly when quotation requests are sent, prices are submitted, and bookings are accepted.
              </p>
            </div>

            <div className="glass-card feature-card">
              <h3 className="feature-title">💎 Itemized Costing</h3>
              <p className="feature-desc">
                View detailed cost breakdowns for venue rental, food packages, and decor items before committing.
              </p>
            </div>

            <div className="glass-card feature-card">
              <h3 className="feature-title">⭐ Verified Reviews</h3>
              <p className="feature-desc">
                Read authentic ratings and reviews submitted exclusively by customers who completed verified bookings.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
