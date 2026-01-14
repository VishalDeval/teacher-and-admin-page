import React, { useState, useEffect } from 'react';
import './SchoolProfileModal.css';
import CloudinaryUploadWidget from '../../components/CloudinaryUploadWidget';

interface SchoolInfo {
  id: number;
  schoolName: string;
  schoolEmail: string;
  schoolWebsite: string;
  schoolAddress: string;
  schoolContactNumber: string;
  schoolLogo: string;
  schoolTagline: string;
}

interface SchoolProfileModalProps {
  schoolId: number;
  onClose: () => void;
}

const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({ schoolId, onClose }) => {
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSchoolInfo();
  }, [schoolId]);

  const fetchSchoolInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/schools/${schoolId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch school information');
      }

      const data = await response.json();
      setSchool(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load school information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SchoolInfo, value: string) => {
    if (school) {
      setSchool({ ...school, [field]: value });
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!school) return;

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/schools/${schoolId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schoolName: school.schoolName,
          schoolEmail: school.schoolEmail,
          schoolWebsite: school.schoolWebsite,
          schoolAddress: school.schoolAddress,
          schoolContactNumber: school.schoolContactNumber,
          schoolLogo: school.schoolLogo,
          schoolTagline: school.schoolTagline
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update school information');
      }

      setSuccess('School information updated successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update school information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content school-profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading school information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!school) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content school-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2> School Profile</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

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

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>School Name *</label>
              <input
                type="text"
                value={school.schoolName}
                onChange={(e) => handleInputChange('schoolName', e.target.value)}
                placeholder="Enter school name"
              />
            </div>

            <div className="form-group">
              <label>School Email *</label>
              <input
                type="email"
                value={school.schoolEmail || ''}
                onChange={(e) => handleInputChange('schoolEmail', e.target.value)}
                placeholder="Enter school email"
              />
            </div>

            <div className="form-group">
              <label>Contact Number *</label>
              <input
                type="tel"
                value={school.schoolContactNumber || ''}
                onChange={(e) => handleInputChange('schoolContactNumber', e.target.value)}
                placeholder="Enter contact number"
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={school.schoolWebsite || ''}
                onChange={(e) => handleInputChange('schoolWebsite', e.target.value)}
                placeholder="Enter school website"
              />
            </div>

            <div className="form-group full-width">
              <label>Address *</label>
              <textarea
                rows={3}
                value={school.schoolAddress || ''}
                onChange={(e) => handleInputChange('schoolAddress', e.target.value)}
                placeholder="Enter school address"
              />
            </div>

            <div className="form-group full-width">
              <label>School Tagline</label>
              <input
                type="text"
                value={school.schoolTagline || ''}
                onChange={(e) => handleInputChange('schoolTagline', e.target.value)}
                placeholder="Enter school tagline"
              />
            </div>

            <div className="form-group full-width">
              <label>School Logo</label>
              <div className="logo-upload-section">
                <CloudinaryUploadWidget
                  uwConfig={{
                    cloudName: 'dnmwonmud',
                    uploadPreset: 'ml_default',
                    multiple: false,
                    folder: 'school-logos',
                    clientAllowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
                    maxImageFileSize: 2000000, // 2MB
                    cropping: true,
                    showAdvancedOptions: false,
                    sources: ['local', 'camera'],
                    theme: 'minimal'
                  }}
                  onUploadSuccess={(results) => {
                    if (results && results.length > 0) {
                      handleInputChange('schoolLogo', results[0].secureUrl);
                    }
                  }}
                  onUploadError={(error) => {
                    console.error('Logo upload failed:', error);
                    setError('Failed to upload logo. Please try again.');
                  }}
                  buttonText="Upload Logo"
                  disabled={saving}
                />
                {school.schoolLogo && (
                  <button
                    type="button"
                    className="btn-remove-logo"
                    onClick={() => handleInputChange('schoolLogo', '')}
                    disabled={saving}
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              {school.schoolLogo && (
                <div className="logo-preview">
                  <img src={school.schoolLogo} alt="School Logo" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !school.schoolName || !school.schoolEmail || !school.schoolContactNumber}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchoolProfileModal;
