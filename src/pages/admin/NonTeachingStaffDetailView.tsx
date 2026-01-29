import React, { useState, useEffect } from 'react';
import { NonTeachingStaffResponse } from '../../services/adminService';
import AdminService from '../../services/adminService';
import './StudentDetailView.css'; // Import base styles
import './NonTeachingStaffDetailView.css'; // Import non-teaching staff-specific overrides

interface NonTeachingStaffDetailViewProps {
  staff: NonTeachingStaffResponse;
  onClose: () => void;
  onUpdate?: () => void; // Callback after successful update
}

const NonTeachingStaffDetailView: React.FC<NonTeachingStaffDetailViewProps> = ({ staff, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Editable staff data
  const [editedStaff, setEditedStaff] = useState<NonTeachingStaffResponse>({ ...staff });

  // Sync editedStaff when staff prop changes (after successful update)
  useEffect(() => {
    setEditedStaff({ ...staff });
  }, [staff]);

  // Handle input changes
  const handleInputChange = (field: keyof NonTeachingStaffResponse, value: any) => {
    setEditedStaff(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate required fields
      if (!editedStaff.name || !editedStaff.email || !editedStaff.contactNumber) {
        setError('Please fill in all required fields');
        setIsSaving(false);
        return;
      }

      // Prepare data for backend
      const updateData = {
        name: editedStaff.name.trim(),
        email: editedStaff.email.trim(),
        qualification: editedStaff.qualification?.trim(),
        salaryGrade: editedStaff.salaryGrade?.trim(),
        contactNumber: editedStaff.contactNumber.trim(),
        designation: editedStaff.designation?.trim(),
      };

      // Call backend API to update non-teaching staff
      await AdminService.updateNonTeachingStaff(staff.id, updateData);

      setSuccess('Non-teaching staff information updated successfully!');
      setIsEditing(false);
      
      // Call the onUpdate callback to refresh parent data
      if (onUpdate) {
        onUpdate();
      }

      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (error: any) {
      console.error('Failed to update non-teaching staff:', error);
      setError(error.response?.data?.message || error.message || 'Failed to update non-teaching staff information');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditedStaff({ ...staff });
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
      <div className="student-detail-modal nts-detail-modal">
        {/* Header */}
        <div className="student-detail-header">
          <div className="header-left">
            <div className="student-avatar nts-avatar">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div className="header-info" >
              <h2>{staff.name}</h2>
              <div className="header-meta">
                <span className="status-badge" style={{ 
                  backgroundColor: getStatusColor(staff.status),
                  color: '#ffffff',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {staff.status}
                </span>
                <span>ID: {staff.id}</span>
                {staff.designation && <span>{staff.designation}</span>}
              </div>
            </div>
          </div>
          <div className="header-right">
            {!isEditing ? (
              <>
                <button className="btn-edit"  onClick={() => setIsEditing(true)}>
                  <span></span> Edit
                </button>
                <button className="btn-close"  onClick={onClose}>✕</button>
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
                      value={editedStaff.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                    />
                  ) : (
                    <p>{staff.name}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Email *</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedStaff.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email"
                    />
                  ) : (
                    <p>{staff.email}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Contact Number *</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedStaff.contactNumber}
                      onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                      placeholder="Enter contact number"
                    />
                  ) : (
                    <p>{staff.contactNumber}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>User ID</label>
                  <p>{staff.userId || 'N/A'}</p>
                </div>

                <div className="info-field">
                  <label>Joining Date</label>
                  <p>{formatDate(staff.joiningDate)}</p>
                </div>

                <div className="info-field">
                  <label>Created At</label>
                  <p>{formatDate(staff.createdAt)}</p>
                </div>

                {staff.updatedAt && (
                  <div className="info-field">
                    <label>Last Updated</label>
                    <p>{formatDate(staff.updatedAt)}</p>
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
                      value={editedStaff.designation || ''}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                    />
                  ) : (
                    <p>{staff.designation || 'N/A'}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Qualification</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedStaff.qualification || ''}
                      onChange={(e) => handleInputChange('qualification', e.target.value)}
                      placeholder="Enter qualification"
                    />
                  ) : (
                    <p>{staff.qualification || 'N/A'}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Salary Grade</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedStaff.salaryGrade || ''}
                      onChange={(e) => handleInputChange('salaryGrade', e.target.value)}
                      placeholder="Enter salary grade"
                    />
                  ) : (
                    <p>{staff.salaryGrade || 'N/A'}</p>
                  )}
                </div>

                <div className="info-field">
                  <label>Employment Status</label>
                  <p style={{
                    color: getStatusColor(staff.status),
                    fontWeight: '600'
                  }}>
                    {staff.status}
                  </p>
                </div>

                <div className="info-field">
                  <label>Joining Date</label>
                  <p>{formatDate(staff.joiningDate)}</p>
                </div>

                {staff.deletedAt && (
                  <div className="info-field">
                    <label>Deleted At</label>
                    <p style={{ color: '#ef4444' }}>{formatDate(staff.deletedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NonTeachingStaffDetailView;
