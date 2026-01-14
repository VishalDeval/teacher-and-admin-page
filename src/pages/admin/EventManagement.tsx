import React, { useState, useEffect } from 'react';
import EventService from '../../services/eventService';
import './EventManagement.css';

interface Event {
  id?: number;
  title: string;
  type: string; // Changed from eventType
  description: string;
  startDate: string; // Changed from eventDate
  endDate?: string; // Added endDate
  sessionId?: number;
  sessionName?: string;
}

const EventManagement: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState<Event>({
    title: '',
    type: 'academic',
    description: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await EventService.getAllEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);

      if (editingEvent) {
        await EventService.updateEvent(editingEvent.id!, formData);
        setSuccess('Event updated successfully!');
      } else {
        await EventService.createEvent(formData);
        setSuccess('Event created successfully!');
      }

      // Reset form
      setFormData({
        title: '',
        type: 'academic',
        description: '',
        startDate: '',
        endDate: ''
      });
      setShowForm(false);
      setEditingEvent(null);

      // Refresh events list
      await fetchEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData(event);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      setLoading(true);
      await EventService.deleteEvent(id);
      setSuccess('Event deleted successfully!');
      await fetchEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      type: 'academic',
      description: '',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="event-management">
      <div className="event-header">
        <h2>Event Management</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add New Event'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="event-form-container">
          <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
          <form onSubmit={handleSubmit} className="event-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Event Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter event title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Event Type *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="academic">Academic</option>
                  <option value="sports">Sports</option>
                  <option value="cultural">Cultural</option>
                  <option value="holiday">Holiday</option>
                  <option value="exam">Examination</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date *</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End Date (Optional)</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Enter event description"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="events-list">
        <h3>All Events</h3>
        {loading && !showForm && <div className="loading">Loading events...</div>}
        
        {!loading && events.length === 0 && (
          <div className="no-data">No events found. Create your first event!</div>
        )}

        <div className="events-grid">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card-header">
                <h4>{event.title}</h4>
                <span className={`event-type-badge ${event.type}`}>
                  {event.type}
                </span>
              </div>
              
              <div className="event-card-body">
                <p className="event-description">{event.description}</p>
                
                <div className="event-details">
                  <div className="event-detail">
                    <span className="icon"></span>
                    <span>
                      {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'No date set'}
                      {event.endDate && event.endDate !== event.startDate && 
                        ` - ${new Date(event.endDate).toLocaleDateString()}`
                      }
                    </span>
                  </div>
                  
                  {event.sessionName && (
                    <div className="event-detail">
                      <span className="icon"></span>
                      <span>{event.sessionName}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="event-card-actions">
                <button 
                  className="btn-edit" 
                  onClick={() => handleEdit(event)}
                >
                  Edit
                </button>
                <button 
                  className="btn-delete" 
                  onClick={() => handleDelete(event.id!)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventManagement;
