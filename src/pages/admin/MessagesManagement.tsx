import React, { useState, useEffect } from 'react';
import NotificationService, { NotificationDto, BroadcastMessageDto } from '../../services/notificationService';
import './MessagesManagement.css';

interface MessagesManagementProps {
  students: any[];
  teachers: any[];
}

const MessagesManagement: React.FC<MessagesManagementProps> = ({ students, teachers }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Broadcast state
  const [groupedMessages, setGroupedMessages] = useState<Map<string, NotificationDto[]>>(new Map());
  
//   // Inbox state
//   const [showInbox, setShowInbox] = useState(false);
//   const [inboxMessages, setInboxMessages] = useState<NotificationDto[]>([]);
//   const [inboxLoading, setInboxLoading] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<NotificationDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [updating, setUpdating] = useState(false);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [selectedRecipientType, setSelectedRecipientType] = useState<'STUDENT' | 'TEACHER' | 'BOTH'>('STUDENT');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectAllStudents, setSelectAllStudents] = useState(false);
  const [selectAllTeachers, setSelectAllTeachers] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

  useEffect(() => {
    fetchSentMessages();
    // fetchUnreadCount();
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

//   const fetchInboxMessages = async () => {
//     try {
//       setInboxLoading(true);
//       const messages = await NotificationService.getMyNotifications();
//       setInboxMessages(messages);
//     } catch (err: any) {
//       console.error('Failed to fetch inbox messages:', err);
//     } finally {
//       setInboxLoading(false);
//     }
//   };

//   const fetchUnreadCount = async () => {
//     try {
//       const count = await NotificationService.getUnreadCount();
//       setUnreadCount(count);
//     } catch (err: any) {
//       console.error('Failed to fetch unread count:', err);
//     }
//   };

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
        recipientIds: [],
        recipientType: editingMessage.recipientType,
        priority: editPriority
      };

      await NotificationService.updateBroadcast(editingMessage.broadcastId, updateData);
      
      setSuccess('Broadcast message updated successfully!');
      closeEditModal();
      await fetchSentMessages();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update broadcast message');
    } finally {
      setUpdating(false);
    }
  };

//   const handleOpenInbox = async () => {
//     setShowInbox(true);
//     await fetchInboxMessages();
//   };

//   const handleCloseInbox = () => {
//     setShowInbox(false);
//   };

//   const handleDeleteInboxMessage = async (messageId: number) => {
//     if (!confirm('Are you sure you want to delete this message?')) {
//       return;
//     }

//     try {
//       await NotificationService.deleteNotification(messageId);
//       await fetchInboxMessages();
//       await fetchUnreadCount();
//       setSuccess('Message deleted successfully!');
//       setTimeout(() => setSuccess(''), 3000);
//     } catch (err: any) {
//       setError(err.message || 'Failed to delete message');
//     }
//   };

//   const handleMarkAsRead = async (messageId: number) => {
//     try {
//       await NotificationService.markAsRead(messageId);
//       await fetchInboxMessages();
//       await fetchUnreadCount();
//     } catch (err: any) {
//       console.error('Failed to mark message as read:', err);
//     }
//   };

  const handleBroadcast = async () => {
    try {
      setBroadcasting(true);
      setError('');
      setSuccess('');

      if (!broadcastTitle.trim()) {
        setError('Please enter a message title');
        return;
      }

      if (!broadcastMessage.trim()) {
        setError('Please enter a message');
        return;
      }

      let recipientIds: string[] = [];
      
      if (selectedRecipientType === 'STUDENT' || selectedRecipientType === 'BOTH') {
        if (selectedStudents.length === 0) {
          setError('Please select at least one student');
          return;
        }
        recipientIds = [...recipientIds, ...selectedStudents];
      }

      if (selectedRecipientType === 'TEACHER' || selectedRecipientType === 'BOTH') {
        if (selectedTeachers.length === 0 && selectedRecipientType === 'TEACHER') {
          setError('Please select at least one teacher');
          return;
        }
        recipientIds = [...recipientIds, ...selectedTeachers];
      }

      if (recipientIds.length === 0) {
        setError('Please select at least one recipient');
        return;
      }

      if (selectedRecipientType === 'STUDENT' || selectedRecipientType === 'BOTH') {
        const studentBroadcast: BroadcastMessageDto = {
          title: broadcastTitle,
          message: broadcastMessage,
          recipientIds: selectedStudents,
          recipientType: 'STUDENT',
          priority: broadcastPriority
        };
        await NotificationService.broadcastMessage(studentBroadcast);
      }

      if (selectedRecipientType === 'TEACHER' || selectedRecipientType === 'BOTH') {
        const teacherBroadcast: BroadcastMessageDto = {
          title: broadcastTitle,
          message: broadcastMessage,
          recipientIds: selectedTeachers,
          recipientType: 'TEACHER',
          priority: broadcastPriority
        };
        await NotificationService.broadcastMessage(teacherBroadcast);
      }

      setSuccess(`Message sent successfully to ${recipientIds.length} recipient(s)!`);
      
      setBroadcastTitle('');
      setBroadcastMessage('');
      setSelectedStudents([]);
      setSelectedTeachers([]);
      setSelectAllStudents(false);
      setSelectAllTeachers(false);
      setShowCompose(false);
      
      await fetchSentMessages();
      
      setTimeout(() => setSuccess(''), 5000);

    } catch (err: any) {
      console.error('Broadcast error:', err);
      setError(err.message || 'Failed to send broadcast message');
    } finally {
      setBroadcasting(false);
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

  const filteredStudents = students.filter(student => {
    const searchLower = studentSearchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.panNumber.toLowerCase().includes(searchLower) ||
      student.className?.toLowerCase().includes(searchLower)
    );
  });

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = teacherSearchTerm.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      teacher.designation?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAllStudents = (checked: boolean) => {
    setSelectAllStudents(checked);
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.panNumber));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectAllTeachers = (checked: boolean) => {
    setSelectAllTeachers(checked);
    if (checked) {
      setSelectedTeachers(filteredTeachers.map(t => t.email));
    } else {
      setSelectedTeachers([]);
    }
  };

  const handleStudentToggle = (panNumber: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(panNumber)) {
        return prev.filter(p => p !== panNumber);
      } else {
        return [...prev, panNumber];
      }
    });
  };

  const handleTeacherToggle = (email: string) => {
    setSelectedTeachers(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };

  if (loading) {
    return (
      <div className="messages-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-management">
      <div className="page-header">
        <h2>Broadcast Messages</h2>
        <button className="compose-btn" onClick={() => setShowCompose(true)}>
          Compose New Message
        </button>
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
            <div className="empty-icon">📭</div>
            <h3>No Broadcast Messages Yet</h3>
            <p>Your sent broadcast messages will appear here</p>
          </div>
        )}
      </div>

      {/* Inbox Modal */}
      {/* {showInbox && (
        <div className="inbox-modal-overlay" onClick={handleCloseInbox}>
          <div className="inbox-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inbox-header">
              <h3>📥 Inbox</h3>
              <button className="close-btn" onClick={handleCloseInbox}>×</button>
            </div>
            <div className="inbox-body">
              {inboxLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading inbox...</p>
                </div>
              ) : inboxMessages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No messages in your inbox</p>
                </div>
              ) : (
                <div className="inbox-messages">
                  {inboxMessages.map(message => (
                    <div 
                      key={message.id} 
                      className={`inbox-message ${!message.isRead ? 'unread' : ''}`}
                      onClick={() => !message.isRead && message.id && handleMarkAsRead(message.id)}
                    >
                      <div className="message-header">
                        <div className="message-title">
                          {!message.isRead && <span className="unread-dot">●</span>}
                          {message.title}
                        </div>
                        <span className={`priority-badge ${getPriorityBadgeClass(message.priority)}`}>
                          {message.priority || 'MEDIUM'}
                        </span>
                      </div>
                      <div className="message-content">{message.message}</div>
                      <div className="message-footer">
                        <span className="message-sender">From: {message.senderName || 'Admin'}</span>
                        <span className="message-date">{formatDate(message.createdAt)}</span>
                        <button 
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            message.id && handleDeleteInboxMessage(message.id);
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )} */}

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Compose New Message</h3>
              <button className="close-btn" onClick={() => setShowCompose(false)}>×</button>
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
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Enter message title"
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-select"
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                >
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🔴 High</option>
                </select>
              </div>

              <div className="form-group">
                <label>Message <span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter your message"
                />
              </div>

              <div className="form-group">
                <label>Recipient Type</label>
                <div className="recipient-type-buttons">
                  <button
                    className={selectedRecipientType === 'STUDENT' ? 'active' : ''}
                    onClick={() => setSelectedRecipientType('STUDENT')}
                  >
                    👨‍🎓 Students
                  </button>
                  <button
                    className={selectedRecipientType === 'TEACHER' ? 'active' : ''}
                    onClick={() => setSelectedRecipientType('TEACHER')}
                  >
                    👨‍🏫 Teachers
                  </button>
                  <button
                    className={selectedRecipientType === 'BOTH' ? 'active' : ''}
                    onClick={() => setSelectedRecipientType('BOTH')}
                  >
                    👥 Both
                  </button>
                </div>
              </div>

              {/* Students List */}
              {(selectedRecipientType === 'STUDENT' || selectedRecipientType === 'BOTH') && (
                <div className="recipients-section">
                  <div className="section-header">
                    <h4>Select Students ({selectedStudents.length} selected)</h4>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectAllStudents}
                        onChange={(e) => handleSelectAllStudents(e.target.checked)}
                      />
                      Select All
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="🔍 Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <div className="recipients-list">
                    {filteredStudents.map(student => (
                      <label key={student.panNumber} className="recipient-item">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.panNumber)}
                          onChange={() => handleStudentToggle(student.panNumber)}
                        />
                        <div className="recipient-info">
                          <div className="recipient-name">{student.name}</div>
                          <div className="recipient-meta">{student.className} • {student.panNumber}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Teachers List */}
              {(selectedRecipientType === 'TEACHER' || selectedRecipientType === 'BOTH') && (
                <div className="recipients-section">
                  <div className="section-header">
                    <h4>Select Teachers ({selectedTeachers.length} selected)</h4>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectAllTeachers}
                        onChange={(e) => handleSelectAllTeachers(e.target.checked)}
                      />
                      Select All
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="🔍 Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <div className="recipients-list">
                    {filteredTeachers.map(teacher => (
                      <label key={teacher.email} className="recipient-item">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.email)}
                          onChange={() => handleTeacherToggle(teacher.email)}
                        />
                        <div className="recipient-info">
                          <div className="recipient-name">{teacher.name}</div>
                          <div className="recipient-meta">{teacher.designation} • {teacher.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCompose(false)}
                disabled={broadcasting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleBroadcast}
                disabled={broadcasting}
              >
                {broadcasting ? 'Sending...' : '📤 Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default MessagesManagement;
