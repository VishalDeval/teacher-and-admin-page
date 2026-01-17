import React, { useState, useEffect } from 'react';
import { TeacherResponse } from '../../services/adminService';
import './StudentDetailView.css'; // Import base styles
import './TeacherDetailView.css'; // Import teacher-specific overrides
import TeacherService from '../../services/teacherService';

interface TeacherDetailViewProps {
  teacher: TeacherResponse;
  onClose: () => void;
  onUpdate?: () => void; // Callback after successful update
}

const TeacherDetailView: React.FC<TeacherDetailViewProps> = ({ teacher, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Editable teacher data
  const [editedTeacher, setEditedTeacher] = useState<TeacherResponse>({ ...teacher });

  // Sync editedTeacher when teacher prop changes (after successful update)
  useEffect(() => {
    setEditedTeacher({ ...teacher });
  }, [teacher]);

  // Handle input changes
  const handleInputChange = (field: keyof TeacherResponse, value: any) => {
    setEditedTeacher(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate required fields
      if (!editedTeacher.name || !editedTeacher.email || !editedTeacher.contactNumber) {
        setError('Please fill in all required fields');
        setIsSaving(false);
        return;
      }

      // Prepare data for backend
      const updateData = {
        name: editedTeacher.name.trim(),
        email: editedTeacher.email.trim(),
        qualification: editedTeacher.qualification?.trim(),
        salaryGrade: editedTeacher.salaryGrade?.trim(),
        contactNumber: editedTeacher.contactNumber.trim(),
        designation: editedTeacher.designation?.trim(),
      };

      // Call backend API to update teacher
      await TeacherService.updateTeacher(teacher.id, updateData);

      setSuccess('Teacher information updated successfully!');
      setIsEditing(false);
      
      // Call the onUpdate callback to refresh parent data
      if (onUpdate) {
        onUpdate();
      }

      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (error: any) {
      console.error('Failed to update teacher:', error);
      setError(error.response?.data?.message || error.message || 'Failed to update teacher information');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditedTeacher({ ...teacher });
    setIsEditing(false);
    setError(null);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return '#22c55e';
      case 'INACTIVE':
        return '#ef4444';
      case 'SUSPENDED':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="student-detail-overlay">
      <div className="student-detail-modal teacher-detail-modal">
        {/* Header */}
        <div className="student-detail-header">
          <div className="header-left">
            
            <div className="header-info">
              
              <h2>{teacher.name}</h2>
              <div className="header-meta">
                <span className="status-badge" style={{ 
                  backgroundColor: getStatusColor(teacher.status),
                  color: '#ffffff',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {teacher.status}
                </span>
                <span>ID: {teacher.id}</span>
                {teacher.designation && <span>{teacher.designation}</span>}
              </div>
            </div>
          </div>
          <div className="header-right" style={{display:'flex',justifyContent:'center',margin:'10px 5px'}}>
            {!isEditing ? (
              <>
                <button className="btn-edit"  onClick={() => setIsEditing(true)}>
                  <span>✏️</span> Edit
                </button>
                <button className="btn-close" style={{ padding:'20px 20px',marginRight:'10px'}} onClick={onClose}>✕</button>
              </>
            ) : (
              <>
                <button 
                  className="btn-save" 
                  onClick={handleSave}
                  disabled={isSaving}
                  
                >
                  {isSaving ? 'Saving...' : '💾 Save'}
                </button>
                <button 
                  className="btn-cancel" 
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>✓</span> {success}
          </div>
        )}

        {/* Tabs */}
        <div className="student-detail-tabs">
          <button 
            className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Info
          </button>
          <button 
            className={`tab ${activeTab === 'professional' ? 'active' : ''}`}
            onClick={() => setActiveTab('professional')}
          >
            Professional Info
          </button>
          <button 
            className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Classes & Subjects
          </button>
        </div>

        {/* Tab Content */}
        <div className="student-detail-content">
          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <div className="info-section">
              <h3>Personal Information</h3>
              <div className="info-grid">
                <div className="info-field">
                  <label>Full Name *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTeacher.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                  ) : (
                    <p>{teacher.name}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Email *</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedTeacher.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email"
                    />
                  ) : (
                    <p>{teacher.email}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Contact Number *</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedTeacher.contactNumber}
                      onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                      placeholder="Enter contact number"
                    />
                  ) : (
                    <p>{teacher.contactNumber}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>User ID</label>
                  <p>{teacher.userId || 'N/A'}</p>
                </div>

                <div className="info-field">
                  <label>Joining Date</label>
                  <p>{formatDate(teacher.joiningDate)}</p>
                </div>

                <div className="info-field">
                  <label>Created At</label>
                  <p>{formatDate(teacher.createdAt)}</p>
                </div>

                {teacher.updatedAt && (
                  <div className="info-field">
                    <label>Last Updated</label>
                    <p>{formatDate(teacher.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professional Info Tab */}
          {activeTab === 'professional' && (
            <div className="info-section">
              <h3>Professional Information</h3>
              <div className="info-grid">
                <div className="info-field">
                  <label>Designation</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTeacher.designation || ''}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                    />
                  ) : (
                    <p>{teacher.designation || 'N/A'}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Qualification</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTeacher.qualification || ''}
                      onChange={(e) => handleInputChange('qualification', e.target.value)}
                      placeholder="Enter qualification"
                    />
                  ) : (
                    <p>{teacher.qualification || 'N/A'}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Salary Grade</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTeacher.salaryGrade || ''}
                      onChange={(e) => handleInputChange('salaryGrade', e.target.value)}
                      placeholder="Enter salary grade"
                    />
                  ) : (
                    <p>{teacher.salaryGrade || 'N/A'}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Employment Status</label>
                  <p style={{
                    color: getStatusColor(teacher.status),
                    fontWeight: '600'
                  }}>
                    {teacher.status}
                  </p>
                </div>

                <div className="info-field">
                  <label>Joining Date</label>
                  <p>{formatDate(teacher.joiningDate)}</p>
                </div>

                {teacher.deletedAt && (
                  <div className="info-field">
                    <label>Deleted At</label>
                    <p style={{ color: '#ef4444' }}>{formatDate(teacher.deletedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Classes & Subjects Tab */}
          {activeTab === 'classes' && (
            <div className="info-section">
              <h3>Assigned Classes & Subjects</h3>
              
              {teacher.className && teacher.className.length > 0 ? (
                <div className="classes-grid">
                  {teacher.className.map((className, index) => (
                    <div key={index} className="class-card">
                      <div className="class-card-header">
                        <h4>Class {className}</h4>
                        {teacher.classId && teacher.classId[index] && (
                          <span className="class-id">ID: {teacher.classId[index]}</span>
                        )}
                      </div>
                      {teacher.subjectName && teacher.subjectName[index] && (
                        <div className="class-card-body">
                          <p className="subject-name">
                            <span className="subject-icon">📚</span>
                            {teacher.subjectName[index]}
                          </p>
                          {teacher.subjectId && teacher.subjectId[index] && (
                            <p className="subject-id">Subject ID: {teacher.subjectId[index]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>📚 No classes assigned yet</p>
                  <span>This teacher has not been assigned to any classes or subjects</span>
                </div>
              )}

              {teacher.subjectName && teacher.subjectName.length > 0 && (
                <div className="subjects-summary">
                  <h4>Teaching Subjects</h4>
                  <div className="subjects-list">
                    {[...new Set(teacher.subjectName)].map((subject, index) => (
                      <span key={index} className="subject-badge">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDetailView;
