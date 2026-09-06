import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { saveAuthData } from '../utils/auth';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error message when user starts typing again
    if (errorMessage) setErrorMessage('');
  };

  // Toggle Password Visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const email = formData.email.trim();
    const password = formData.password.trim();

    // 1. Client-side Validation
    if (!email || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Axios POST Request to /api/auth/login
      const response = await api.post('/auth/login', { email, password });

      if (response.data && response.data.status === 'success') {
        const { token, user } = response.data;

        // 3. Save JWT Token and User info in localStorage
        saveAuthData(token, user);

        // 4. Role-based redirect (All roles currently redirect to /)
        navigate('/', { replace: true });
      } else {
        setErrorMessage(response.data?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      // 5. Friendly Error Handling
      if (err.response) {
        // Server responded with an error status code (e.g. 400, 401, 403, 500)
        const apiMessage = err.response.data?.message;
        setErrorMessage(apiMessage || 'Invalid email or password. Please check your credentials.');
      } else if (err.request) {
        // Request was made but no response was received (Network / Backend offline)
        setErrorMessage('Unable to connect to VenueHub server. Please ensure the backend server is running.');
      } else {
        // Something else happened in setting up the request
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container login-container">
      <div className="glass-card login-card">
        <div className="login-header">
          <h1 className="login-title">Welcome <span className="gradient-text">Back</span></h1>
          <p className="login-subtitle">Sign in to your VenueHub account to continue</p>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="alert-error" role="alert">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-group" style={{ marginBottom: '1.2rem' }}>
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              className="form-control" 
              placeholder="e.g. customer@example.com" 
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
          </div>

          {/* Password Field */}
          <div className="form-group" style={{ marginBottom: '1.8rem' }}>
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                name="password"
                className="form-control" 
                placeholder="Enter your password" 
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-icon">🔄</span> Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      {/* Register Link */}
      <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Create an Account
        </Link>
      </p>
    </div>
  );
};

export default Login;
