import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Info */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="logo-badge">V</div>
              <span>Venue<span className="gradient-text">Hub</span></span>
            </Link>
            <div className="footer-tagline">Discover • Compare • Quote • Book</div>
            <p className="footer-desc">
              Smart event-venue discovery, custom quotation requests, real-time comparison, and seamless booking management platform.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/venues">Explore Venues</Link></li>
              <li><Link to="/login">Customer Login</Link></li>
              <li><Link to="/register">Create Account</Link></li>
            </ul>
          </div>

          {/* Event Types */}
          <div>
            <h4 className="footer-heading">Event Types</h4>
            <ul className="footer-links">
              <li><Link to="/venues">Weddings & Receptions</Link></li>
              <li><Link to="/venues">Corporate Conferences</Link></li>
              <li><Link to="/venues">Birthday Parties</Link></li>
              <li><Link to="/venues">Anniversaries & Galas</Link></li>
            </ul>
          </div>

          {/* Contact / Project Info */}
          <div>
            <h4 className="footer-heading">VenueHub</h4>
            <ul className="footer-links">
              <li><span style={{ color: 'var(--text-muted)' }}>Smart Venue Platform</span></li>
              <li><span style={{ color: 'var(--text-muted)' }}>Real-time Quotations</span></li>
              <li><span style={{ color: 'var(--text-muted)' }}>Verified Booking System</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} VenueHub. All rights reserved.</p>
          <p>Built for College Major Project Demonstration</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
