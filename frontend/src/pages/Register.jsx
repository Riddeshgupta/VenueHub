import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer'
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  // Toggle Password Visibility
  const togglePasswordVisibility = () => setShowPassword(prev => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(prev => !prev);

  // Client-side Validation Helper
  const validateForm = () => {
    const { fullName, email, phone, password, confirmPassword, role } = formData;

    if (!fullName.trim()) {
      return 'Please enter your full name.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }

    const phoneRegex = /^\d{10}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      return 'Please enter a valid 10-digit phone number.';
    }

    if (!password) {
      return 'Please enter a password.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match. Please re-enter your password.';
    }

    if (!['customer', 'venue_owner'].includes(role)) {
      return 'Please select a valid account type.';
    }

    return null;
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Client-side Validation
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Prepare API Payload (excluding confirmPassword)
      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role
      };

      // 3. Axios POST Request to /api/auth/register
      const response = await api.post('/auth/register', payload);

      if (response.data && response.data.status === 'success') {
        setSuccessMessage('Registration successful! Redirecting to login page...');
        
        // Redirect to /login after 2 seconds
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      } else {
        setErrorMessage(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      // 4. Error Handling based on HTTP Status Codes
      if (err.response) {
        if (err.response.status === 409) {
          setErrorMessage('This email is already registered. Please log in or use a different email address.');
        } else {
          setErrorMessage(err.response.data?.message || 'Invalid registration details. Please check your inputs.');
        }
      } else if (err.request) {
        setErrorMessage('Unable to connect to VenueHub server. Please ensure the backend server is running.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container register-container">
      <div className="glass-card register-card">
        <div className="register-header">
          <h1 className="register-title">Create <span className="gradient-text">Account</span></h1>
          <p className="register-subtitle">Join VenueHub to book events or manage venue listings</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-error" role="alert">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="alert-success" role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <span>✅</span> {successMessage}
            </div>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
              Go to Login Now
            </Link>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="fullName">Full Name</label>
            <input 
              type="text" 
              id="fullName" 
              name="fullName"
              className="form-control" 
              placeholder="e.g. Rahul Sharma" 
              value={formData.fullName}
              onChange={handleChange}
              disabled={isSubmitting || !!successMessage}
              required
            />
          </div>

          {/* Email Address */}
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              className="form-control" 
              placeholder="e.g. rahul@example.com" 
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting || !!successMessage}
              autoComplete="email"
              required
            />
          </div>

          {/* Phone Number */}
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="phone">Phone Number (10 Digits)</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone"
              className="form-control" 
              placeholder="e.g. 9876543210" 
              value={formData.phone}
              onChange={handleChange}
              disabled={isSubmitting || !!successMessage}
              required
            />
          </div>

          {/* Account Type */}
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="role">Account Type</label>
            <select 
              id="role" 
              name="role"
              className="form-control"
              value={formData.role}
              onChange={handleChange}
              disabled={isSubmitting || !!successMessage}
            >
              <option value="customer">Customer (Book & Request Quotes)</option>
              <option value="venue_owner">Venue Owner (List & Manage Venues)</option>
            </select>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                name="password"
                className="form-control" 
                placeholder="At least 6 characters" 
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting || !!successMessage}
                autoComplete="new-password"
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting || !!successMessage}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrap">
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                id="confirmPassword" 
                name="confirmPassword"
                className="form-control" 
                placeholder="Re-enter your password" 
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting || !!successMessage}
                autoComplete="new-password"
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={toggleConfirmPasswordVisibility}
                disabled={isSubmitting || !!successMessage}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary register-btn"
            disabled={isSubmitting || !!successMessage}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-icon">🔄</span> Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>

      {/* Login Link */}
      <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Log in here
        </Link>
      </p>
    </div>
  );
};

export default Register;
