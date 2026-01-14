import React, { useState, useEffect } from 'react';
import './StudentRegistrationForm.css';
import AuthService, { StudentRegistrationData } from '../../services/authService';
import { DropdownService, ClassInfoResponse, SessionOption } from '../../services/dropdownService';
import CloudinaryUploadWidget from '../../components/CloudinaryUploadWidget';

interface StudentFormData {
  panNumber: string;
  name: string;
  password: string;
  confirmPassword: string;
  classId: string;
  sessionId: string;
  mobileNumber: string;
  parentName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContact: string;
  bloodGroup: string;
  previousSchool: string;
  photo: File | null;
}

interface StudentRegistrationErrors {
  panNumber?: string;
  name?: string;
  password?: string;
  confirmPassword?: string;
  classId?: string;
  sessionId?: string;
  mobileNumber?: string;
  parentName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  photo?: string;
  general?: string;
}

interface StudentRegistrationFormProps {
  onRegistrationSuccess: () => void;
}

const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onRegistrationSuccess }) => {
  const [formData, setFormData] = useState<StudentFormData>({
    panNumber: '',
    name: '',
    password: '',
    confirmPassword: '',
    classId: '',
    sessionId: '',
    mobileNumber: '',
    parentName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    bloodGroup: '',
    previousSchool: '',
    photo: null
  });
  
  const [errors, setErrors] = useState<StudentRegistrationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassInfoResponse[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');

  // Fetch classes and sessions on component mount
  // Fetch dropdown data on mount and when component refreshes
  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true);
      setDropdownError('');
      
      try {
        const [classesData, sessionsData] = await Promise.all([
          DropdownService.getAllClasses(),
          DropdownService.getAllSessions()
        ]);
        
        setClasses(classesData);
        setSessions(sessionsData);
        
        // Auto-select active session if available
        const activeSession = sessionsData.find(s => s.isActive || s.active);
        if (activeSession) {
          setFormData(prev => ({ ...prev, sessionId: activeSession.id.toString() }));
          
          // Check if active session has classes
          const activeSessionClasses = classesData.filter(c => c.sessionId === activeSession.id);
          if (activeSessionClasses.length === 0) {
            setDropdownError(
              `No classes found for the active session "${activeSession.sessionName || activeSession.name}". ` +
              'Please create classes for this session before registering students.'
            );
          }
        }
        
        if (sessionsData.length === 0) {
          setDropdownError('No sessions found. Please create a session first using the "📅 Sessions" tab.');
        }
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
        setDropdownError('Failed to load classes and sessions. Please refresh the page.');
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Filter classes based on selected session
  const availableClasses = React.useMemo(() => {
    if (!formData.sessionId) return [];
    return classes.filter(c => c.sessionId === parseInt(formData.sessionId));
  }, [classes, formData.sessionId]);

  // Update error message when session selection changes
  useEffect(() => {
    if (formData.sessionId && availableClasses.length === 0) {
      const selectedSession = sessions.find(s => s.id === parseInt(formData.sessionId));
      if (selectedSession) {
        setDropdownError(
          `No classes available for session "${selectedSession.sessionName || selectedSession.name}". ` +
          'Please create classes for this session first.'
        );
      }
    } else if (availableClasses.length > 0) {
      setDropdownError('');
    }
  }, [formData.sessionId, availableClasses, sessions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof StudentRegistrationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };



  const validateForm = (): boolean => {
    const newErrors: StudentRegistrationErrors = {};

    // PAN Number validation
    if (!formData.panNumber.trim()) {
      newErrors.panNumber = 'PAN number is required';
    } else if (formData.panNumber.trim().length < 5) {
      newErrors.panNumber = 'PAN number must be at least 5 characters';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Student name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    // Password validation (admin creates initial password)
    if (!formData.password) {
      newErrors.password = 'Initial password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Class validation
    if (!formData.classId) {
      newErrors.classId = 'Please select a class';
    }

    // Session validation
    if (!formData.sessionId) {
      newErrors.sessionId = 'Please select a session';
    }

    // Mobile number validation
    if (!formData.mobileNumber) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be 10 digits';
    }

    // Parent name validation
    if (!formData.parentName.trim()) {
      newErrors.parentName = 'Parent/Guardian name is required';
    }

    // Date of birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 3 || age > 25) {
        newErrors.dateOfBirth = 'Student age must be between 3 and 25 years';
      }
    }

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select gender';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    // Emergency contact validation
    if (!formData.emergencyContact) {
      newErrors.emergencyContact = 'Emergency contact is required';
    } else if (!/^\d{10}$/.test(formData.emergencyContact)) {
      newErrors.emergencyContact = 'Emergency contact must be 10 digits';
    }

    // Blood group validation
    if (!formData.bloodGroup) {
      newErrors.bloodGroup = 'Please select blood group';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Form already submitting, please wait...');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      // Use Cloudinary URL if already uploaded
      const photoUrl = uploadedPhotoUrl || undefined;

      // Prepare registration data matching backend StudentRequestDto
      const registrationData: StudentRegistrationData = {
        panNumber: formData.panNumber.trim().toUpperCase(),
        name: formData.name.trim(),
        password: formData.password,
        mobileNumber: formData.mobileNumber,
        address: formData.address.trim(),
        dateOfBirth: formData.dateOfBirth, // Format: YYYY-MM-DD
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        parentName: formData.parentName.trim(),
        emergencyContact: formData.emergencyContact,
        previousSchool: formData.previousSchool.trim() || undefined,
        classId: parseInt(formData.classId),
        sessionId: parseInt(formData.sessionId),
        photo: photoUrl
      };

      // Call backend API to register student
      await AuthService.registerStudent(registrationData);
      
      // Show success message
      setSuccessMessage(`Student "${formData.name}" has been successfully registered! The student can now login with PAN: ${formData.panNumber.toUpperCase()} and the password you set.`);
      
      // Reset form
      setFormData({
        panNumber: '',
        name: '',
        password: '',
        confirmPassword: '',
        classId: '',
        sessionId: sessions.find(s => s.isActive)?.id.toString() || '',
        mobileNumber: '',
        parentName: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContact: '',
        bloodGroup: '',
        previousSchool: '',
        photo: null
      });

      // Reset file input
      const fileInput = document.getElementById('photo') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Call parent component callback to refresh student list
      onRegistrationSuccess();

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Student registration error:', error);
      
      // Handle specific error messages
      if (error.message.includes('PAN number already exists') || 
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('duplicate entry') ||
          error.message.toLowerCase().includes('already exists')) {
        setErrors({ 
          panNumber: 'This PAN number is already registered. Please use a different PAN number.',
          general: 'A student with this PAN number already exists in the system. Please check and try again.'
        });
        // Scroll to PAN number field
        document.getElementById('panNumber')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.message.includes('Class not found') || error.message.toLowerCase().includes('invalid class')) {
        setErrors({ classId: 'Selected class is invalid. Please select a valid class.' });
      } else if (error.message.includes('Session not found') || error.message.toLowerCase().includes('invalid session')) {
        setErrors({ sessionId: 'Selected session is invalid. Please select a valid session.' });
      } else if (error.message.includes('Network Error') || error.message.toLowerCase().includes('network')) {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      } else {
        setErrors({ general: error.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  if (loadingDropdowns) {
    return (
      <div className="student-registration-form">
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading form data...</p>
        </div>
      </div>
    );
  }

  if (dropdownError) {
    return (
      <div className="student-registration-form">
        <div className="error-banner">
          {dropdownError}
        </div>
      </div>
    );
  }

  return (
    <div className="student-registration-form">
      <div className="form-header">
        <h2>Register New Student</h2>
        <p>Fill in the student details to create their account</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="success-banner">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      {/* General error message */}
      {errors.general && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        {/* Personal Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon"></span>
            Personal Information
          </h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="panNumber">
                PAN Number <span className="required">*</span>
                <span className="field-hint">Unique student ID</span>
              </label>
              <input
                type="text"
                id="panNumber"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleInputChange}
                className={errors.panNumber ? 'error' : ''}
                placeholder="Enter unique PAN number"
                disabled={isLoading}
                required
              />
              {errors.panNumber && <span className="error-message">{errors.panNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="name">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? 'error' : ''}
                placeholder="Enter student's full name"
                disabled={isLoading}
                required
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dateOfBirth">
                Date of Birth <span className="required">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className={errors.dateOfBirth ? 'error' : ''}
                disabled={isLoading}
                required
              />
              {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="gender">
                Gender <span className="required">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={errors.gender ? 'error' : ''}
                disabled={isLoading}
                required
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && <span className="error-message">{errors.gender}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="bloodGroup">
                Blood Group <span className="required">*</span>
              </label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleInputChange}
                className={errors.bloodGroup ? 'error' : ''}
                disabled={isLoading}
                required
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodGroup && <span className="error-message">{errors.bloodGroup}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="photo">
              Student Photo <span className="optional">(Optional)</span>
              <span className="field-hint">Max size: 2MB, Format: JPG, PNG</span>
            </label>
            <CloudinaryUploadWidget
              uwConfig={{
                cloudName: 'dnmwonmud',
                uploadPreset: 'ml_default',
                multiple: false,
                folder: 'slms-students',
                cropping: true,
                showAdvancedOptions: false,
                sources: ['local', 'camera'],
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
                maxImageFileSize: 2097152, // 2MB
                maxFiles: 1,
                theme: 'default'
              }}
              onUploadSuccess={(results) => {
                if (results && results.length > 0) {
                  const url = results[0].secureUrl;
                  setUploadedPhotoUrl(url);
                  setFormData(prev => ({ ...prev, photo: null }));
                  setErrors(prev => ({ ...prev, photo: '' }));
                  console.log('Student photo uploaded to Cloudinary:', url);
                }
              }}
              onUploadError={(error) => {
                console.error('Upload error:', error);
                setErrors(prev => ({ ...prev, photo: 'Failed to upload photo. Please try again.' }));
              }}
              buttonText={uploadedPhotoUrl ? '✓ Photo Uploaded - Upload Another' : 'Upload Photo (Optional)'}
              disabled={isLoading}
            />
            {uploadedPhotoUrl && (
              <div style={{ marginTop: '0.75rem' }}>
                <img 
                  src={uploadedPhotoUrl} 
                  alt="Uploaded" 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    objectFit: 'cover', 
                    borderRadius: '8px',
                    border: '2px solid #10b981',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} 
                />
                <p style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>
                  ✓ Photo uploaded successfully
                </p>
              </div>
            )}
            {errors.photo && <span className="error-message">{errors.photo}</span>}
          </div>
        </div>

        {/* Academic Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon"></span>
            Academic Information
          </h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="classId">
                Class <span className="required">*</span>
              </label>
              <select
                id="classId"
                name="classId"
                value={formData.classId}
                onChange={handleInputChange}
                className={errors.classId ? 'error' : ''}
                disabled={isLoading || availableClasses.length === 0}
                required
              >
                <option value="">Select Class</option>
                {availableClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} {cls.studentCount !== undefined && `(${cls.studentCount} students)`}
                  </option>
                ))}
              </select>
              {errors.classId && <span className="error-message">{errors.classId}</span>}
              {availableClasses.length === 0 && formData.sessionId && (
                <span className="info-message" style={{ color: '#f39c12', fontSize: '0.9rem', marginTop: '4px' }}>
                  No classes found for the selected session. Please create classes first.
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="sessionId">
                Academic Session <span className="required">*</span>
              </label>
              <select
                id="sessionId"
                name="sessionId"
                value={formData.sessionId}
                onChange={handleInputChange}
                className={errors.sessionId ? 'error' : ''}
                disabled={isLoading || sessions.length === 0}
                required
              >
                <option value="">Select Session</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.sessionName || session.name} {(session.isActive || session.active) && '(Active)'}
                  </option>
                ))}
              </select>
              {errors.sessionId && <span className="error-message">{errors.sessionId}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="previousSchool">
              Previous School <span className="optional">(Optional)</span>
            </label>
            <input
              type="text"
              id="previousSchool"
              name="previousSchool"
              value={formData.previousSchool}
              onChange={handleInputChange}
              placeholder="Enter previous school name"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon"></span>
            Contact Information
          </h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mobileNumber">
                Mobile Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="mobileNumber"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                className={errors.mobileNumber ? 'error' : ''}
                placeholder="10-digit mobile number"
                disabled={isLoading}
                required
              />
              {errors.mobileNumber && <span className="error-message">{errors.mobileNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContact">
                Emergency Contact <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                className={errors.emergencyContact ? 'error' : ''}
                placeholder="10-digit emergency contact"
                disabled={isLoading}
                required
              />
              {errors.emergencyContact && <span className="error-message">{errors.emergencyContact}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="parentName">
              Parent/Guardian Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="parentName"
              name="parentName"
              value={formData.parentName}
              onChange={handleInputChange}
              className={errors.parentName ? 'error' : ''}
              placeholder="Enter parent or guardian name"
              disabled={isLoading}
              required
            />
            {errors.parentName && <span className="error-message">{errors.parentName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">
              Address <span className="required">*</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={errors.address ? 'error' : ''}
              placeholder="Enter complete residential address"
              rows={3}
              disabled={isLoading}
              required
            />
            {errors.address && <span className="error-message">{errors.address}</span>}
          </div>
        </div>

        {/* Login Credentials Section */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon"></span>
            Login Credentials
          </h3>
          <p className="section-description">
            Set an initial password for the student. The student will use their PAN number and this password to login.
          </p>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">
                Initial Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter initial password (min 6 characters)"
                disabled={isLoading}
                required
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Re-enter password"
                disabled={isLoading}
                required
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading || isSubmitting}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Registering Student...
              </>
            ) : (
              <>
                <span>✓</span>
                Register Student
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentRegistrationForm;
