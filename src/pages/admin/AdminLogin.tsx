import React, { useState } from 'react';
import AuthService from '../../services/authService';
import './AdminLogin.css';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await AuthService.loginStaff({
        email: email.trim(),
        password: password
      }, 'ROLE_ADMIN'); // Validate admin role

      console.log('Admin login successful:', response);

      // Store authentication data
      localStorage.setItem('authToken', response.accessToken);
      localStorage.setItem('tokenType', response.tokenType);
      localStorage.setItem('expiresIn', response.expiresIn.toString());
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userType', 'admin');
      localStorage.setItem('userRole', 'ROLE_ADMIN');

      // Calculate and store token expiration timestamps
      const issuedAt = Date.now();
      const expiresAt = issuedAt + (response.expiresIn * 1000); // Convert seconds to milliseconds
      localStorage.setItem('tokenIssuedAt', issuedAt.toString());
      localStorage.setItem('tokenExpiresAt', expiresAt.toString());

      // Call onLogin to update app state
      onLogin();
    } catch (error: any) {
      console.error('Admin login failed:', error);
      
      // Handle specific error messages
      if (error.message) {
        // Check if it's a role mismatch error
        if (error.message.toLowerCase().includes('does not have') || 
            error.message.toLowerCase().includes('privileges') ||
            error.message.toLowerCase().includes('access denied')) {
          setError('Access denied. Please use the Admin Login Credentials.');
        } else {
          setError(error.message);
        }
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. Please use the correct login page.');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        setError('Cannot connect to server. Please ensure the backend is running on port 8080.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <div className="admin-logo">
            <div className="logo-icon"></div>
            <h1>SLMS Admin</h1>
          </div>
          <p className="admin-subtitle">School Learning Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="admin-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="admin-input"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="admin-login-btn"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>Admin Credentials:</p>
          <p>Use credentials from initial-setup.sql or slms.txt</p>
          <p className="student-link">
            <a href="/student/login">Student Login</a>
          </p>
          <p className="teacher-link">
            <a href="/teacher/login">Teacher Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 