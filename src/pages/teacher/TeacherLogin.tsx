import React, { useState } from 'react';
import './TeacherLogin.css';
import AuthService from '../../services/authService';

interface TeacherLoginProps {
  onLogin: () => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call backend API to login teacher
      const response = await AuthService.loginStaff({
        email: email.trim(),
        password
      }, 'ROLE_TEACHER'); // Validate teacher role

      // Store additional teacher information
      localStorage.setItem('userEmail', email.trim());
      localStorage.setItem('userType', 'teacher');
      localStorage.setItem('userRole', 'ROLE_TEACHER');

      // Calculate and store token expiration timestamps
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const expirationTime = currentTimestamp + response.expiresIn;
      localStorage.setItem('tokenIssuedAt', currentTimestamp.toString());
      localStorage.setItem('tokenExpiresAt', expirationTime.toString());

      // Call parent component's onLogin to redirect to dashboard
      onLogin();
    } catch (error: any) {
      console.error('Teacher login error:', error);
      
      // Handle different error types
      if (error.message) {
        // Check if it's a role mismatch error
        if (error.message.toLowerCase().includes('does not have') || 
            error.message.toLowerCase().includes('privileges') ||
            error.message.toLowerCase().includes('access denied')) {
          setError('Access denied. Please use the Teacher Login Credentials.');
        } else if (error.message.includes('401') || error.message.toLowerCase().includes('invalid credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (error.message.includes('Network Error') || error.message.toLowerCase().includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <div className="teacher-login">
      <div className="teacher-login-container">
        <div className="teacher-login-header">
          <div className="teacher-logo">
            <div className="logo-icon">👨‍🏫</div>
            <h1>SLMS Teacher</h1>
          </div>
          <p className="teacher-subtitle">School Learning Management System</p>
        </div>
        
        <form onSubmit={handleLogin} className="teacher-login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isLoading}
              className="teacher-input"
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
              disabled={isLoading}
              className="teacher-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="teacher-login-btn"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="teacher-login-btn secondary"
          >
            Clear Form
          </button>
        </form>
        
        <div className="teacher-login-footer">
          <p>Teacher Credentials:</p>
          <p>Use your registered email and password</p>
          <div className="signup-section">
            <p className="info-text">New teachers should contact the admin office for registration</p>
          </div>
          <p className="admin-link">
            <a href="/admin/login">Admin Login</a>
          </p>
          <p className="student-link">
            <a href="/student/login">Student Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin; 