import React, { useState, useEffect } from 'react';
import './SessionManagement.css';
import SessionService, { SessionData, SessionResponse } from '../../services/sessionService';

interface SessionManagementProps {
  onSessionChange?: () => void;
}

const SessionManagement: React.FC<SessionManagementProps> = ({ onSessionChange }) => {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionResponse | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState<SessionData>({
    name: '',
    startDate: '',
    endDate: '',
    active: false
  });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    startDate?: string;
    endDate?: string;
    general?: string;
  }>({});

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await SessionService.getAllSessions();
      // Sort by start date, most recent first
      const sortedSessions = data.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      setSessions(sortedSessions);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      active: false
    });
    setFormErrors({});
    setEditingSession(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Session name is required';
    } else if (formData.name.trim().length < 7) {
      errors.name = 'Session name must be at least 7 characters (e.g., 2024-2025)';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const validation = SessionService.validateSessionDates(formData.startDate, formData.endDate);
      if (!validation.valid) {
        errors.endDate = validation.error;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      // Removed: Check for overlapping sessions (sessions can overlap now)

      if (editingSession) {
        // Update existing session
        await SessionService.updateSession(editingSession.id, formData);
        setSuccessMessage(`Session "${formData.name}" updated successfully!`);
      } else {
        // Create new session
        await SessionService.createSession(formData);
        setSuccessMessage(`Session "${formData.name}" created successfully!`);
      }

      await fetchSessions();
      resetForm();
      
      if (onSessionChange) {
        onSessionChange();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Operation failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (session: SessionResponse) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      startDate: session.startDate,
      endDate: session.endDate,
      active: session.active
    });
    setShowForm(true);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (session: SessionResponse) => {
    if (session.active) {
      alert('Cannot delete the active session. Please activate another session first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete session "${session.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await SessionService.deleteSession(session.id);
      setSuccessMessage(`Session "${session.name}" deleted successfully.`);
      await fetchSessions();
      
      if (onSessionChange) {
        onSessionChange();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    }
  };

  const getSessionStatus = (session: SessionResponse): string => {
    if (session.active) {
      return 'active';
    }
    
    const today = new Date();
    const startDate = new Date(session.startDate);
    const endDate = new Date(session.endDate);
    
    if (today < startDate) {
      return 'upcoming';
    } else if (today > endDate) {
      return 'past';
    }
    return 'inactive';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="session-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-management">
      <div className="session-header">
        <div>
          <h2>Session Management</h2>
          <p>Manage academic sessions and set the active session for student enrollment</p>
        </div>
        <button 
          className="btn-create-session"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          disabled={showForm}
        >
          + Create New Session
        </button>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {successMessage}
          <button className="alert-close" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠</span>
          {error}
          <button className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {showForm && (
        <div className="session-form-container">
          <form onSubmit={handleSubmit} className="session-form">
            <div className="form-header">
              <h3>{editingSession ? 'Edit Session' : 'Create New Session'}</h3>
              <button type="button" className="btn-close" onClick={resetForm}>×</button>
            </div>

            {formErrors.general && (
              <div className="form-error">
                <span className="error-icon">⚠</span>
                {formErrors.general}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">
                  Session Name <span className="required">*</span>
                  <span className="hint">e.g., 2024-2025</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter session name (e.g., 2024-2025)"
                  className={formErrors.name ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="startDate">
                  Start Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={formErrors.startDate ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {formErrors.startDate && <span className="error-text">{formErrors.startDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endDate">
                  End Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={formErrors.endDate ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {formErrors.endDate && <span className="error-text">{formErrors.endDate}</span>}
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                  <span>Set as active session</span>
                </label>
                <span className="hint">Only one session can be active at a time</span>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner-small"></span>
                    {editingSession ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingSession ? 'Update Session' : 'Create Session'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No Sessions Found</h3>
            <p>Create your first academic session to get started</p>
            <button 
              className="btn-create-session"
              onClick={() => setShowForm(true)}
            >
              + Create Session
            </button>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map(session => {
              const status = getSessionStatus(session);
              return (
                <div key={session.id} className={`session-card status-${status}`}>
                  <div className="session-card-header">
                    <div>
                      <h3>{session.name}</h3>
                      <span className={`status-badge ${status}`}>
                        {status === 'active' && 'Active'}
                        {status === 'upcoming' && 'Upcoming'}
                        {status === 'past' && 'Past'}
                        {status === 'inactive' && 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="session-card-body">
                    <div className="session-info">
                      <div className="info-item">
                        <span className="info-label">Start Date</span>
                        <span className="info-value">{formatDate(session.startDate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">End Date</span>
                        <span className="info-value">{formatDate(session.endDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="session-card-footer">
                    <button 
                      className="btn-action btn-edit"
                      onClick={() => handleEdit(session)}
                      title="Edit session"
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(session)}
                      disabled={session.active}
                      title={session.active ? 'Cannot delete active session' : 'Delete session'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionManagement;
