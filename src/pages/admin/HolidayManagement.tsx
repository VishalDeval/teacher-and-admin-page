import React, { useState, useEffect } from 'react';
import './HolidayManagement.css';
import HolidayService, { Holiday } from '../../services/holidayService';
import { SessionService } from '../../services/sessionService';

const HolidayManagement: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHolidays();
    loadActiveSession();
  }, []);

  const loadActiveSession = async () => {
    try {
      const session = await SessionService.getActiveSession();
      if (session && session.id) {
        setActiveSessionId(session.id);
      }
    } catch (err: any) {
      console.error('Failed to load active session:', err);
      setError('Failed to load active session. Please ensure a session is active.');
    }
  };

  const loadHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await HolidayService.getAllHolidays();
      setHolidays(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingHoliday(null);
    setTitle('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setShowModal(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    // Backend returns occasion and startDate, frontend uses title and date
    setTitle(holiday.occasion || holiday.title || '');
    setStartDate(holiday.startDate || holiday.date || '');
    setEndDate(holiday.endDate || holiday.startDate || holiday.date || '');
    setDescription(holiday.description || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !startDate) {
      setError('Please fill in all required fields');
      return;
    }

    if (!activeSessionId) {
      setError('No active session found. Please activate a session first.');
      return;
    }

    // Use startDate as endDate if endDate is not provided
    const finalEndDate = endDate || startDate;

    try {
      setSaving(true);
      setError(null);

      const holidayData: Holiday = {
        title: title.trim(),
        startDate: startDate,
        endDate: finalEndDate,
        description: description.trim() || undefined,
        sessionId: activeSessionId
      };

      if (editingHoliday?.id) {
        await HolidayService.updateHoliday(editingHoliday.id, holidayData);
        setSuccess('Holiday updated successfully!');
      } else {
        await HolidayService.createHoliday(holidayData);
        setSuccess('Holiday added successfully!');
      }

      setShowModal(false);
      await loadHolidays();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await HolidayService.deleteHoliday(id);
      
      setSuccess('Holiday deleted successfully!');
      await loadHolidays();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete holiday');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getMonthGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Helper to get date from holiday (backend uses startDate, frontend uses date)
  const getHolidayDate = (holiday: Holiday): string => {
    return holiday.startDate || holiday.date || new Date().toISOString().split('T')[0];
  };

  // Helper to get holiday title (backend uses occasion, frontend uses title)
  const getHolidayTitle = (holiday: Holiday): string => {
    return holiday.occasion || holiday.title || 'Holiday';
  };

  // Group holidays by month
  const groupedHolidays = holidays.reduce((acc, holiday) => {
    const month = getMonthGroup(getHolidayDate(holiday));
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(holiday);
    return acc;
  }, {} as { [key: string]: Holiday[] });

  // Sort months and holidays
  Object.keys(groupedHolidays).forEach(month => {
    groupedHolidays[month].sort((a, b) => 
      new Date(getHolidayDate(a)).getTime() - new Date(getHolidayDate(b)).getTime()
    );
  });

  return (
    <div className="holiday-management">
      <div className="holiday-header">
        <div>
          <h1>Holiday Management</h1>
          <p>Manage school holidays and important dates</p>
        </div>
        <button className="btn-add" onClick={handleAddNew} disabled={saving}>
           Add Holiday
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="notification error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {success && (
        <div className="notification success">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading holidays...</p>
        </div>
      )}

      {/* Holidays List */}
      {!loading && (
        <div className="holidays-container">
          {Object.keys(groupedHolidays).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📆</div>
              <h3>No Holidays Added Yet</h3>
              <p>Click "Add Holiday" to create your first holiday entry</p>
            </div>
          ) : (
            Object.keys(groupedHolidays).sort((a, b) => {
              return new Date(getHolidayDate(groupedHolidays[a][0])).getTime() - 
                     new Date(getHolidayDate(groupedHolidays[b][0])).getTime();
            }).map(month => (
              <div key={month} className="month-group">
                <h2 className="month-header">{month}</h2>
                <div className="holidays-grid">
                  {groupedHolidays[month].map(holiday => {
                    const holidayDate = getHolidayDate(holiday);
                    const holidayTitle = getHolidayTitle(holiday);
                    const holidayEndDate = holiday.endDate || holiday.startDate || holiday.date;
                    const isDateRange = holidayEndDate && holidayEndDate !== holidayDate;
                    
                    // Calculate number of days if it's a range
                    const daysDiff = isDateRange 
                      ? Math.ceil((new Date(holidayEndDate).getTime() - new Date(holidayDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                      : 1;
                    
                    return (
                      <div key={holiday.id} className="holiday-card">
                        <div className="holiday-date">
                          {isDateRange ? (
                            <>
                              <div className="date-day" style={{ fontSize: '0.95rem', lineHeight: '1.2' }}>
                                {new Date(holidayDate).getDate()} {new Date(holidayDate).toLocaleDateString('en-US', { month: 'short' })} - {new Date(holidayEndDate).getDate()} {new Date(holidayEndDate).toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              {/* <div className="date-month" style={{ fontSize: '0.75rem' }}>
                                {new Date(holidayDate).toLocaleDateString('en-US', { month: 'short' })}
                              </div> */}
                              <div style={{ 
                                fontSize: '0.65rem', 
                                marginTop: '6px', 
                                padding: '2px 6px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '4px',
                                color: '#374151',
                                fontWeight: '500'
                              }}>
                                {daysDiff} day{daysDiff > 1 ? 's' : ''}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="date-day">{new Date(holidayDate).getDate()}</div>
                              <div className="date-month">
                                {new Date(holidayDate).toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="holiday-details">
                          <h3 className="holiday-title">{holidayTitle}</h3>
                          {isDateRange ? (
                            <p className="holiday-day">
                              {formatDate(holidayDate)} - {formatDate(holidayEndDate)}
                            </p>
                          ) : (
                            <p className="holiday-day">{formatDate(holidayDate)}</p>
                          )}
                          {holiday.description && (
                            <p className="holiday-description">{holiday.description}</p>
                          )}
                        </div>
                        <div className="holiday-actions">
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit(holiday)}
                            disabled={saving}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(holiday.id!)}
                            disabled={saving}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>
                  <span className="required">*</span> Holiday Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-control"
                  placeholder="e.g., Independence Day, Diwali, etc."
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control"
                  min={startDate}
                  placeholder="Leave empty if single day event"
                />
                <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  For multi-day holidays, select the end date
                </small>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                  placeholder="Add any additional details about this holiday..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowModal(false)}
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSave}
                disabled={saving || !title.trim() || !startDate}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: (saving || !title.trim() || !startDate) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !title.trim() || !startDate) ? 0.6 : 1
                }}
              >
                {saving ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
