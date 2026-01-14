import React, { useState, useEffect } from 'react';
import './ExamManagement.css';
import { ExamTypeService } from '../../services/examTypeService';
import ClassExamService from '../../services/classExamService';
import { ClassService } from '../../services/classService';
import { SessionService, SessionResponse } from '../../services/sessionService';

interface ExamType {
  id: number;
  name: string;
  description?: string;
}

interface ClassExam {
  id: number;
  classId: number;
  className?: string;
  examTypeId: number;
  examTypeName?: string;
  maxMarks: number;
  passingMarks: number;
  examDate?: string; // Format: YYYY-MM-DD
}

interface Class {
  id: number;
  className: string;
  sessionId: number;
  sessionName: string;
}

const ExamManagement: React.FC = () => {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classExams, setClassExams] = useState<ClassExam[]>([]);
  const [examTypeClassesMap, setExamTypeClassesMap] = useState<Record<number, ClassExam[]>>({});
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingExamType, setEditingExamType] = useState<ExamType | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for exam type
  const [examTypeFormData, setExamTypeFormData] = useState({
    name: '',
    description: ''
  });

  // Form state for assigning exam to classes
  const [assignFormData, setAssignFormData] = useState({
    examTypeId: 0,
    selectedClasses: [] as number[],
    maxMarks: 100,
    passingMarks: 40,
    examDate: '' // Format: YYYY-MM-DD
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadExamTypes();
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [sessionsData, classesData] = await Promise.all([
        SessionService.getAllSessions(),
        ClassService.getAllClasses()
      ]);

      setSessions(sessionsData);
      setClasses(classesData);

      const activeSession = sessionsData.find((s: SessionResponse) => s.active);
      if (activeSession) {
        setSelectedSession(activeSession.id);
      }
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadExamTypes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ExamTypeService.getAllExamTypes();
      setExamTypes(data || []);
      
      // Load assigned classes for each exam type
      const classesMap: Record<number, ClassExam[]> = {};
      for (const exam of data || []) {
        const assignedClasses = await ClassExamService.getClassesByExamType(exam.id);
        classesMap[exam.id] = assignedClasses;
      }
      setExamTypeClassesMap(classesMap);
      
      if (selectedClass) {
        const classExamsData = await ClassExamService.getExamsByClass(selectedClass);
        setClassExams(classExamsData || []);
      }
    } catch (err: any) {
      console.error('Error loading exam types:', err);
      setError(err.message || 'Failed to load exam types');
      setExamTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExamTypeModal = (examType?: ExamType) => {
    if (examType) {
      setEditingExamType(examType);
      setExamTypeFormData({
        name: examType.name,
        description: examType.description || ''
      });
    } else {
      setEditingExamType(null);
      setExamTypeFormData({
        name: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleOpenAssignModal = async (examTypeId?: number) => {
    try {
      let preSelectedClasses: number[] = [];
      
      // If editing an existing exam type assignment, fetch already assigned classes
      if (examTypeId && examTypeId > 0) {
        const assignedClasses = await ClassExamService.getClassesByExamType(examTypeId);
        preSelectedClasses = assignedClasses.map(ce => ce.classId);
        console.log('Pre-selected classes for exam type', examTypeId, ':', preSelectedClasses);
      }
      
      setAssignFormData({
        examTypeId: examTypeId || 0,
        selectedClasses: preSelectedClasses,
        maxMarks: 100,
        passingMarks: 40,
        examDate: ''
      });
      setShowAssignModal(true);
    } catch (error) {
      console.error('Error fetching assigned classes:', error);
      // Still open modal even if fetch fails
      setAssignFormData({
        examTypeId: examTypeId || 0,
        selectedClasses: [],
        maxMarks: 100,
        passingMarks: 40,
        examDate: ''
      });
      setShowAssignModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExamType(null);
    setExamTypeFormData({
      name: '',
      description: ''
    });
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssignFormData({
      examTypeId: 0,
      selectedClasses: [],
      maxMarks: 100,
      passingMarks: 40,
      examDate: ''
    });
  };

  const handleSubmitExamType = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examTypeFormData.name.trim()) {
      alert('Please enter exam type name');
      return;
    }

    try {
      if (editingExamType) {
        await ExamTypeService.updateExamType(editingExamType.id, examTypeFormData);
        alert('Exam type updated successfully!');
      } else {
        await ExamTypeService.createExamType(examTypeFormData);
        alert('Exam type created successfully!');
      }
      
      handleCloseModal();
      loadExamTypes();
    } catch (err: any) {
      console.error('Error saving exam type:', err);
      alert(err.message || 'Failed to save exam type');
    }
  };

  const handleDeleteExamType = async (examTypeId: number) => {
    if (!window.confirm('Are you sure you want to delete this exam type?')) {
      return;
    }

    try {
      await ExamTypeService.deleteExamType(examTypeId);
      alert('Exam type deleted successfully!');
      loadExamTypes();
    } catch (err: any) {
      console.error('Error deleting exam type:', err);
      alert(err.message || 'Failed to delete exam type');
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignFormData.examTypeId) {
      alert('Please select an exam type');
      return;
    }

    if (assignFormData.selectedClasses.length === 0) {
      alert('Please select at least one class');
      return;
    }

    if (assignFormData.maxMarks <= 0 || assignFormData.passingMarks >= assignFormData.maxMarks) {
      alert('Invalid marks configuration');
      return;
    }

    try {
      setLoading(true);
      
      // Get currently assigned classes for this exam type
      const currentlyAssigned = await ClassExamService.getClassesByExamType(assignFormData.examTypeId);
      const currentClassIds = currentlyAssigned.map(ce => ce.classId);
      const selectedClassIds = assignFormData.selectedClasses;
      
      // Find classes to unassign (were assigned but now unchecked)
      const classesToRemove = currentClassIds.filter(id => !selectedClassIds.includes(id));
      
      // Find classes to assign (newly checked or need update)
      const classesToAssign = selectedClassIds;
      
      // STEP 1: Delete unselected classes first and wait for all deletions to complete
      if (classesToRemove.length > 0) {
        console.log('Deleting unassigned classes:', classesToRemove);
        await Promise.all(
          classesToRemove.map(classId => 
            ClassExamService.deleteClassExam(classId, assignFormData.examTypeId)
              .then(() => console.log(`Successfully unassigned exam from class ${classId}`))
              .catch(err => console.error(`Failed to unassign class ${classId}:`, err))
          )
        );
        // Small delay to ensure database commits the deletions
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // STEP 2: Assign/update selected classes after deletions are complete
      if (classesToAssign.length > 0) {
        console.log('Assigning exam to classes:', classesToAssign);
        await ClassExamService.assignExamToClasses({
          examTypeId: assignFormData.examTypeId,
          classExams: classesToAssign.map(classId => ({
            classId,
            maxMarks: assignFormData.maxMarks,
            passingMarks: assignFormData.passingMarks,
            examDate: assignFormData.examDate || undefined
          }))
        });
      }

      alert('Exam assignments updated successfully!');
      handleCloseAssignModal();
      
      // Reload exam types and class exams to reflect the new assignments
      await loadExamTypes();
      
      // If a class is selected, reload its exams specifically
      if (selectedClass) {
        const classExamsData = await ClassExamService.getExamsByClass(selectedClass);
        setClassExams(classExamsData || []);
      }
    } catch (err: any) {
      console.error('Error assigning exam:', err);
      alert(err.message || 'Failed to assign exam');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClass = (classId: number) => {
    setAssignFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId]
    }));
  };

  const filteredExamTypes = examTypes.filter(et =>
    searchTerm === '' ||
    et.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    et.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sessionClasses = classes.filter(c => c.sessionId === selectedSession);

  return (
    <div className="exam-management">
      <div className="exam-header">
        <div>
          <h2>Exam Type Management</h2>
          <p>Create exam types and assign them to classes</p>
        </div>
        <div className="header-buttons">
          <button className="add-exam-btn" onClick={() => handleOpenExamTypeModal()}>
            Add Exam Type
          </button>
          <button className="assign-exam-btn" onClick={() => handleOpenAssignModal()}>
            Assign to Classes
          </button>
        </div>
      </div>

      <div className="exam-filters">
        <div className="filter-group">
          <label>Session:</label>
          <select
            value={selectedSession || ''}
            onChange={(e) => {
              const sessionId = parseInt(e.target.value);
              setSelectedSession(sessionId);
              setSelectedClass(null);
            }}
          >
            <option value="">Select Session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} {session.active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Class:</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value ? parseInt(e.target.value) : null)}
            disabled={!selectedSession}
          >
            <option value="">All Classes</option>
            {sessionClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group search-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search exam types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && <div className="loading-message">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          {filteredExamTypes.length === 0 ? (
            <div className="no-exams">
              <div className="no-exams-icon">📋</div>
              <h3>No Exam Types Found</h3>
              <p>Click "Add Exam Type" to create one.</p>
            </div>
          ) : (
            <div className="exams-grid">
              {filteredExamTypes.map((examType) => {
                const assignedClasses = examTypeClassesMap[examType.id] || [];
                return (
                  <div key={examType.id} className="exam-card">
                    <div className="exam-card-header">
                      <h3>{examType.name}</h3>
                    </div>
                    <div className="exam-card-body">
                      {examType.description && (
                        <p className="exam-description">{examType.description}</p>
                      )}
                      
                      {/* Show assigned classes with details */}
                      {assignedClasses.length > 0 ? (
                        <div className="assigned-classes-info">
                          <p style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#374151', fontSize: '0.9rem' }}>
                            Assigned to {assignedClasses.length} class{assignedClasses.length !== 1 ? 'es' : ''}:
                          </p>
                          <div style={{ 
                            backgroundColor: '#f9fafb', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '6px',
                            overflow: 'hidden'
                          }}>
                            <table style={{ 
                              width: '100%', 
                              fontSize: '0.875rem',
                              borderCollapse: 'collapse'
                            }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Class</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Date</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Max Marks</th>
                                  <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Pass Marks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {assignedClasses.map((ce, index) => (
                                  <tr key={ce.id} style={{ 
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                                    borderTop: '1px solid #e5e7eb'
                                  }}>
                                    <td style={{ padding: '0.5rem', fontWeight: '500', color: '#1f2937' }}>
                                      {ce.className}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#6b7280' }}>
                                      {ce.examDate ? (
                                        <span style={{ color: '#059669', fontWeight: '500' }}>
                                          {new Date(ce.examDate).toLocaleDateString('en-GB')}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                                          ⚠️ Not scheduled
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#1f2937', fontWeight: '500' }}>
                                      {ce.maxMarks}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: '#1f2937', fontWeight: '500' }}>
                                      {ce.passingMarks}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem', fontStyle: 'italic' }}>
                          ⚠️ Not assigned to any class yet
                        </p>
                      )}
                      
                      {selectedClass && (
                        <div className="class-exam-info" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                          {classExams.filter(ce => ce.examTypeId === examType.id).map(ce => (
                            <div key={ce.id} className="exam-info-row">
                              <span>Max Marks: {ce.maxMarks}</span>
                              <span>Passing Marks: {ce.passingMarks}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="exam-card-footer">
                      <button className="edit-btn" onClick={() => handleOpenExamTypeModal(examType)}>
                        Edit
                      </button>
                      <button className="assign-btn" onClick={() => handleOpenAssignModal(examType.id)}>
                        Assign
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteExamType(examType.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Exam Type Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingExamType ? '✏️ Edit Exam Type' : '➕ Add Exam Type'}</h3>
              <button className="close-modal-btn" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSubmitExamType} className="exam-form">
              <div className="form-group">
                <label>Exam Type Name *</label>
                <input
                  type="text"
                  value={examTypeFormData.name}
                  onChange={(e) => setExamTypeFormData({ ...examTypeFormData, name: e.target.value })}
                  placeholder="e.g., Mid-Term, Final Exam"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={examTypeFormData.description}
                  onChange={(e) => setExamTypeFormData({ ...examTypeFormData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="submit-btn">
                  {editingExamType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Exam to Classes Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={handleCloseAssignModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Assign Exam to Classes</h3>
              <button className="close-modal-btn" onClick={handleCloseAssignModal}>✕</button>
            </div>
            <form onSubmit={handleSubmitAssignment} className="exam-form">
              <div className="form-group">
                <label>Exam Type *</label>
                <select
                  value={assignFormData.examTypeId}
                  onChange={(e) => setAssignFormData({ ...assignFormData, examTypeId: parseInt(e.target.value) })}
                  required
                >
                  <option value={0}>Select Exam Type</option>
                  {examTypes.map(et => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Select Classes *</label>
                <div className="class-checkboxes">
                  {sessionClasses.length === 0 ? (
                    <p>No classes available. Please select a session first.</p>
                  ) : (
                    sessionClasses.map(cls => (
                      <label key={cls.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={assignFormData.selectedClasses.includes(cls.id)}
                          onChange={() => handleToggleClass(cls.id)}
                        />
                        {cls.className}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Exam Date</label>
                <input
                  type="date"
                  value={assignFormData.examDate}
                  onChange={(e) => setAssignFormData({ ...assignFormData, examDate: e.target.value })}
                  placeholder="Select exam date"
                />
                <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  📅 Optional: Set the exam date for all selected classes
                </small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Maximum Marks *</label>
                  <input
                    type="number"
                    value={assignFormData.maxMarks}
                    onChange={(e) => setAssignFormData({ ...assignFormData, maxMarks: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Passing Marks *</label>
                  <input
                    type="number"
                    value={assignFormData.passingMarks}
                    onChange={(e) => setAssignFormData({ ...assignFormData, passingMarks: parseInt(e.target.value) })}
                    min="1"
                    max={assignFormData.maxMarks - 1}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={handleCloseAssignModal}>Cancel</button>
                <button type="submit" className="submit-btn">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
