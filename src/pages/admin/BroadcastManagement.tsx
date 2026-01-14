import React, { useState, useEffect } from 'react';
import NotificationService, { NotificationDto, BroadcastMessageDto } from '../../services/notificationService';
import './BroadcastManagement.css';

const BroadcastManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<NotificationDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [updating, setUpdating] = useState(false);

  // Group messages by broadcastId
  const [groupedMessages, setGroupedMessages] = useState<Map<string, NotificationDto[]>>(new Map());

  useEffect(() => {
    fetchSentMessages();
  }, []);

  const fetchSentMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const messages = await NotificationService.getSentMessages();
      groupMessagesByBroadcastId(messages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sent messages');
    } finally {
      setLoading(false);
    }
  };

  const groupMessagesByBroadcastId = (messages: NotificationDto[]) => {
    const grouped = new Map<string, NotificationDto[]>();
    
    messages.forEach(msg => {
      const broadcastId = msg.broadcastId || 'individual';
      if (!grouped.has(broadcastId)) {
        grouped.set(broadcastId, []);
      }
      grouped.get(broadcastId)!.push(msg);
    });
    
    setGroupedMessages(grouped);
  };

  const openEditModal = (message: NotificationDto) => {
    setEditingMessage(message);
    setEditTitle(message.title);
    setEditMessage(message.message);
    setEditPriority(message.priority || 'MEDIUM');
    setIsEditModalOpen(true);
    setError('');
    setSuccess('');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMessage(null);
    setEditTitle('');
    setEditMessage('');
    setEditPriority('MEDIUM');
  };

  const handleUpdateBroadcast = async () => {
    if (!editingMessage || !editingMessage.broadcastId) {
      setError('Invalid broadcast message');
      return;
    }

    if (!editTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!editMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      
      const updateData: BroadcastMessageDto = {
        title: editTitle,
        message: editMessage,
        recipientIds: [], // Not needed for update
        recipientType: editingMessage.recipientType,
        priority: editPriority
      };

      await NotificationService.updateBroadcast(editingMessage.broadcastId, updateData);
      
      setSuccess('Broadcast message updated successfully!');
      closeEditModal();
      
      // Refresh messages
      await fetchSentMessages();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update broadcast message');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  if (loading) {
    return (
      <div className="broadcast-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading sent messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="broadcast-management">
      <div className="page-header">
        <h2>Broadcast Messages</h2>
        <p>View and manage your sent broadcast messages</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="broadcasts-container">
        {Array.from(groupedMessages.entries()).map(([broadcastId, messages]) => {
          const firstMessage = messages[0];
          const recipientCount = messages.length;
          const readCount = messages.filter(m => m.isRead).length;

          return (
            <div key={broadcastId} className="broadcast-card">
              <div className="broadcast-header">
                <div className="broadcast-title-row">
                  <h3>{firstMessage.title}</h3>
                  <span className={`priority-badge ${getPriorityBadgeClass(firstMessage.priority)}`}>
                    {firstMessage.priority || 'MEDIUM'}
                  </span>
                </div>
                <div className="broadcast-meta">
                  <span className="broadcast-date">
                    {formatDate(firstMessage.createdAt)}
                  </span>
                  <span className="recipient-type-badge">
                    {firstMessage.recipientType}
                  </span>
                </div>
              </div>

              <div className="broadcast-body">
                <p className="broadcast-message">{firstMessage.message}</p>
              </div>

              <div className="broadcast-footer">
                <div className="broadcast-stats">
                  <span className="stat">
                    <span className="stat-label">Recipients:</span>
                    <span className="stat-value">{recipientCount}</span>
                  </span>
                  <span className="stat">
                    <span className="stat-label">Read:</span>
                    <span className="stat-value">{readCount}</span>
                  </span>
                  <span className="stat">
                    <span className="stat-label">Unread:</span>
                    <span className="stat-value">{recipientCount - readCount}</span>
                  </span>
                </div>
                
                {broadcastId !== 'individual' && (
                  <button 
                    className="edit-btn"
                    onClick={() => openEditModal(firstMessage)}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {groupedMessages.size === 0 && (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No Broadcast Messages Yet</h3>
            <p>Your sent broadcast messages will appear here</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingMessage && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Broadcast Message</h3>
              <button className="close-btn" onClick={closeEditModal}>×</button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <div className="form-group">
                <label>Title <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter message title"
                />
              </div>

              <div className="form-group">
                <label>Message <span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Enter your message"
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-select"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="info-note">
                <strong>Note:</strong> This will update the message for all recipients in this broadcast.
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeEditModal}
                disabled={updating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpdateBroadcast}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastManagement;
