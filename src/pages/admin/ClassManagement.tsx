import React, { useState, useEffect } from 'react';
import './ClassManagement.css';
import ClassService, { ClassResponse, ClassData } from '../../services/classService';
import DropdownService, { SessionOption, TeacherOption } from '../../services/dropdownService';

interface ClassManagementProps {
  onClassChange?: () => void;
}

const ClassManagement: React.FC<ClassManagementProps> = ({ onClassChange }) => {
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentClass, setCurrentClass] = useState<ClassResponse | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ClassData>({
    className: '',
    feeAmount: 0,
    sessionId: 0,
    classTeacherId: 0
  });
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Copy dialog state
  const [sourceSessionId, setSourceSessionId] = useState<number>(0);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadClassesBySession(selectedSession);
    }
  }, [selectedSession]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, teachersData] = await Promise.all([
        DropdownService.getAllSessions(),
        DropdownService.getAllActiveTeachers()
      ]);
      
      setSessions(sessionsData);
      setTeachers(teachersData);
      
      // Auto-select active session
      const activeSession = sessionsData.find(s => s.isActive || s.active);
      if (activeSession) {
        setSelectedSession(activeSession.id);
        setFormData(prev => ({ ...prev, sessionId: activeSession.id }));
      } else if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0].id);
        setFormData(prev => ({ ...prev, sessionId: sessionsData[0].id }));
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadClassesBySession = async (sessionId: number) => {
    try {
      setLoading(true);
      const classesData = await ClassService.getClassesBySession(sessionId);
      setClasses(classesData);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to load classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsEditing(false);
    setCurrentClass(null);
    setFormData({
      className: '',
      feeAmount: 0,
      sessionId: selectedSession || 0,
      classTeacherId: 0
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (classItem: ClassResponse) => {
    setIsEditing(true);
    setCurrentClass(classItem);
    setFormData({
      className: classItem.className,
      feeAmount: classItem.feeAmount,
      sessionId: classItem.sessionId,
      classTeacherId: classItem.classTeacherId || 0
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (classItem: ClassResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${classItem.className}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setSubmitting(true);
      await ClassService.deleteClass(classItem.id, classItem.sessionId);
      setSuccessMessage(`Class "${classItem.className}" deleted successfully!`);
      loadClassesBySession(selectedSession!);
      onClassChange?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to delete class');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const errors: { [key: string]: string } = {};

    // Validate using service
    const validationError = ClassService.validateClassData(
      formData.className,
      formData.feeAmount,
      formData.sessionId,
      formData.classTeacherId
    );

    if (validationError) {
      errors.general = validationError;
      setFormErrors(errors);
      return false;
    }

    // Check for duplicate class name in the same session
    const exists = await ClassService.checkClassExists(
      formData.className,
      formData.sessionId,
      currentClass?.id
    );

    if (exists) {
      errors.className = 'A class with this name already exists in this session';
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');

      if (isEditing && currentClass) {
        // Update class - pass id and sessionId separately
        await ClassService.updateClass(currentClass.id, formData);
        setSuccessMessage(`Class "${formData.className}" updated successfully!`);
      } else {
        await ClassService.createClass(formData);
        setSuccessMessage(`Class "${formData.className}" created successfully!`);
      }

      setShowForm(false);
      loadClassesBySession(selectedSession!);
      onClassChange?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save class');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyClasses = async () => {
    if (!sourceSessionId || !selectedSession) {
      setErrorMessage('Please select a session to copy from');
      return;
    }

    if (sourceSessionId === selectedSession) {
      setErrorMessage('Source and target sessions cannot be the same');
      return;
    }

    if (!window.confirm(
      `This will copy all classes from the selected session to "${getSessionName(selectedSession)}". Continue?`
    )) {
      return;
    }

    try {
      setCopying(true);
      setErrorMessage('');
      const copiedClasses = await ClassService.copyClassesFromSession(sourceSessionId, selectedSession);
      setSuccessMessage(`Successfully copied ${copiedClasses.length} classes!`);
      setShowCopyDialog(false);
      loadClassesBySession(selectedSession);
      onClassChange?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to copy classes');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setCopying(false);
    }
  };

  const getSessionName = (sessionId: number): string => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.sessionName || session?.name || `Session ${sessionId}`;
  };

  const filteredClasses = classes.filter(cls => cls.sessionId === selectedSession);

  return (
    <div className="class-management">
      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          <span>{successMessage}</span>
          <button className="alert-close" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠</span>
          <span>{errorMessage}</span>
          <button className="alert-close" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="class-header">
        <div>
          <h2>Class Management</h2>
          <p>Create and manage classes for different academic sessions</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-copy-classes"
            onClick={() => setShowCopyDialog(true)}
            disabled={loading || !selectedSession}
          >
            Copy Classes
          </button>
          <button 
            className="btn-create-class" 
            onClick={handleCreateNew}
            disabled={loading || !selectedSession}
          >
            + Create New Class
          </button>
        </div>
      </div>

      {/* Session Filter */}
      <div className="session-filter">
        <label htmlFor="session-select">Select Session:</label>
        <select
          id="session-select"
          value={selectedSession || ''}
          onChange={(e) => setSelectedSession(parseInt(e.target.value))}
          disabled={loading}
        >
          <option value="">-- Select a Session --</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.sessionName || session.name} {(session.isActive || session.active) && '(Active)'}
            </option>
          ))}
        </select>
      </div>

      {/* Copy Classes Dialog */}
      {showCopyDialog && (
        <div className="modal-overlay" onClick={() => !copying && setShowCopyDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Copy Classes to {getSessionName(selectedSession!)}</h3>
              <button className="btn-close" onClick={() => setShowCopyDialog(false)} disabled={copying}>×</button>
            </div>
            <div className="modal-body">
              <p>Select a session to copy classes from:</p>
              <select
                value={sourceSessionId}
                onChange={(e) => setSourceSessionId(parseInt(e.target.value))}
                disabled={copying}
                style={{ width: '100%', padding: '10px', marginTop: '10px' }}
              >
                <option value={0}>-- Select Source Session --</option>
                {sessions
                  .filter(s => s.id !== selectedSession)
                  .map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.sessionName || session.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowCopyDialog(false)}
                disabled={copying}
              >
                Cancel
              </button>
              <button 
                className="btn-submit" 
                onClick={handleCopyClasses}
                disabled={copying || !sourceSessionId}
              >
                {copying ? <>
                  <span className="spinner-small"></span>
                  Copying...
                </> : 'Copy Classes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="class-form-container">
          <form className="class-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h3>{isEditing ? '✏️ Edit Class' : '➕ Create New Class'}</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            {formErrors.general && (
              <div className="form-error">
                <span className="error-icon">⚠</span>
                {formErrors.general}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="className">
                  Class Name <span className="required">*</span>
                  <span className="hint">e.g., 1-A, 10-B</span>
                </label>
                <input
                  type="text"
                  id="className"
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  placeholder="Enter class name"
                  required
                  disabled={submitting}
                  className={formErrors.className ? 'error' : ''}
                />
                {formErrors.className && (
                  <span className="error-text">{formErrors.className}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="feeAmount">
                  Monthly Fee Amount (₹) <span className="required">*</span>
                  <span className="hint">Base monthly fee for this class</span>
                </label>
                <input
                  type="number"
                  id="feeAmount"
                  value={formData.feeAmount}
                  onChange={(e) => setFormData({ ...formData, feeAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  disabled={submitting}
                  className={formErrors.feeAmount ? 'error' : ''}
                />
                {formErrors.feeAmount && (
                  <span className="error-text">{formErrors.feeAmount}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="classTeacherId">
                  Class Teacher <span className="required">*</span>
                  <span className="hint">Select the teacher for this class</span>
                </label>
                <select
                  id="classTeacherId"
                  value={formData.classTeacherId}
                  onChange={(e) => setFormData({ ...formData, classTeacherId: parseInt(e.target.value) })}
                  required
                  disabled={submitting}
                  className={formErrors.classTeacherId ? 'error' : ''}
                >
                  <option value={0}>Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} {teacher.designation && `(${teacher.designation})`}
                    </option>
                  ))}
                </select>
                {formErrors.classTeacherId && (
                  <span className="error-text">{formErrors.classTeacherId}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sessionId">
                  Academic Session <span className="required">*</span>
                </label>
                <select
                  id="sessionId"
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: parseInt(e.target.value) })}
                  required
                  disabled={submitting || isEditing}
                >
                  <option value={0}>Select Session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.sessionName || session.name} {(session.isActive || session.active) && '(Active)'}
                    </option>
                  ))}
                </select>
                {isEditing && (
                  <span className="hint">Session cannot be changed when editing</span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-small"></span>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Class' : 'Create Class'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes List */}
      <div className="classes-list">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading classes...</p>
          </div>
        ) : !selectedSession ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>Select a Session</h3>
            <p>Please select an academic session to view and manage its classes</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No Classes Found</h3>
            <p>No classes have been created for "{getSessionName(selectedSession)}" yet.</p>
            <button className="btn-create-class" onClick={handleCreateNew}>
              Create First Class
            </button>
            <p style={{ marginTop: '16px', fontSize: '0.9rem', color: '#7f8c8d' }}>
              or <button 
                className="link-button" 
                onClick={() => setShowCopyDialog(true)}
                style={{ color: '#3498db', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                copy classes from another session
              </button>
            </p>
          </div>
        ) : (
          <div className="classes-grid">
            {filteredClasses.map((classItem) => (
              <div key={`${classItem.id}-${classItem.sessionId}`} className="class-card">
                <div className="class-card-header">
                  <h3>{classItem.className}</h3>
                  <span className="student-count">{classItem.studentCount} students</span>
                </div>
                
                <div className="class-card-body">
                  <div className="class-info">
                    <div className="info-item">
                      <span className="info-label">Monthly Fee:</span>
                      <span className="info-value">₹{classItem.feeAmount.toFixed(2)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Session:</span>
                      <span className="info-value">{classItem.sessionName}</span>
                    </div>
                  </div>
                </div>

                <div className="class-card-footer">
                  <button 
                    className="btn-action btn-edit"
                    onClick={() => handleEdit(classItem)}
                    disabled={submitting}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-action btn-delete"
                    onClick={() => handleDelete(classItem)}
                    disabled={submitting || classItem.studentCount > 0}
                    title={classItem.studentCount > 0 ? 'Cannot delete class with students' : 'Delete class'}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
