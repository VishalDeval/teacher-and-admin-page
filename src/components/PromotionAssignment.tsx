import React, { useState, useEffect } from 'react';
import ClassService from '../services/classService';
import { StudentService } from '../services/studentService';
import { api } from '../services/api';
import './PromotionAssignment.css';

interface Student {
  panNumber: string;
  name: string;
  classRollNumber: number;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
}

interface PromotionAssignment {
  studentPan: string;
  toClassId: number | null;
  isGraduated: boolean;
  isDetained: boolean;
  remarks: string;
}

interface Class {
  id: number;
  className: string;
}

interface Props {
  classId: number;
  sessionId: number;
}

const PromotionAssignment: React.FC<Props> = ({ classId, sessionId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Map<string, PromotionAssignment>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('===== PROMOTION ASSIGNMENT COMPONENT =====');
    console.log('Props received - classId:', classId, 'sessionId:', sessionId);
    loadData();
  }, [classId, sessionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load students from the class
      console.log('Fetching students for classId:', classId);
      const studentList = await StudentService.getStudentsByClass(classId);
      console.log('Raw student list from API:', studentList);
      
      const activeStudents = studentList.filter((s: Student) => s.status === 'ACTIVE');
      console.log('Filtered ACTIVE students:', activeStudents);
      setStudents(activeStudents);

      // Load available classes for promotion
      const classes = await ClassService.getAllClasses();
      console.log('Available classes for promotion:', classes);
      
      // Remove duplicates - keep only unique classes by class ID
      const uniqueClasses = classes.filter((cls, index, self) =>
        index === self.findIndex((c) => c.id === cls.id)
      );
      console.log('Unique classes after deduplication:', uniqueClasses);
      setAvailableClasses(uniqueClasses);

      // Load existing promotion assignments
      await loadExistingAssignments();
      console.log('==========================================');
    } catch (err: any) {
      console.error('Error in loadData:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAssignments = async () => {
    try {
      const response = await api.get(`/promotions/class/${classId}`, {
        params: { sessionId }
      });

      if (response.status >= 200 && response.status < 300) {
        const existingAssignments = new Map<string, PromotionAssignment>();

        console.log("Value of the response: ", response)
        
        response.data.data?.forEach((promotion: any) => {
          existingAssignments.set(promotion.studentPan, {
            studentPan: promotion.studentPan,
            toClassId: promotion.toClassId,
            isGraduated: promotion.isGraduated || false,
            isDetained: promotion.isDetained || false,
            remarks: promotion.remarks || ''
          });
        });

        setAssignments(existingAssignments);
      }
    } catch (err) {
      console.error('Error loading existing assignments:', err);
    }
  };

  const handleAssignmentChange = (studentPan: string, field: keyof PromotionAssignment, value: any) => {
    const newAssignments = new Map(assignments);
    const existing = newAssignments.get(studentPan) || {
      studentPan,
      toClassId: null,
      isGraduated: false,
      isDetained: false,
      remarks: ''
    };

    // Handle mutual exclusivity: only one of graduated, detained, or promoted can be true
    if (field === 'isGraduated' && value) {
      existing.toClassId = null;
      existing.isDetained = false;
    } else if (field === 'isDetained' && value) {
      existing.toClassId = null;
      existing.isGraduated = false;
    } else if (field === 'toClassId' && value) {
      existing.isGraduated = false;
      existing.isDetained = false;
    }

    newAssignments.set(studentPan, { ...existing, [field]: value });
    setAssignments(newAssignments);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let savedCount = 0;
      let errorCount = 0;

      for (const [studentPan, assignment] of assignments.entries()) {
        // Only save if a target class is selected, student is marked as graduated, or detained
        if (assignment.toClassId || assignment.isGraduated || assignment.isDetained) {
          try {
            const response = await api.post('/promotions/assign', {
              studentPan: assignment.studentPan,
              toClassId: assignment.toClassId,
              isGraduated: assignment.isGraduated,
              isDetained: assignment.isDetained,
              remarks: assignment.remarks
            });

            if (response.status >= 200 && response.status < 300) {
              savedCount++;
            } else {
              errorCount++;
              console.error(`Failed to save assignment for ${studentPan}`);
            }
          } catch (err) {
            errorCount++;
            console.error(`Error saving assignment for ${studentPan}:`, err);
          }
        }
      }

      if (errorCount === 0) {
        setSuccess(`Successfully saved promotion assignments for ${savedCount} students`);
      } else {
        setError(`Saved ${savedCount} assignments, but ${errorCount} failed`);
      }

      // Reload assignments to reflect saved data
      await loadExistingAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const getAssignment = (studentPan: string): PromotionAssignment => {
    return assignments.get(studentPan) || {
      studentPan,
      toClassId: null,
      isGraduated: false,
      isDetained: false,
      remarks: ''
    };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner"></div>
        <p>Loading students...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>No active students found in this class.</p>
      </div>
    );
  }

  return (
    <div className="promotion-assignment-container">
      <div className="promotion-header">
        <h2>Assign Student Promotions</h2>
        <p>Select the target class for each student or mark them as graduated</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>❌</span> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✅</span> {success}
        </div>
      )}

      <div className="promotion-table-wrapper">
        <table className="promotion-table">
          <thead>
            <tr>
              <th>Roll No.</th>
              <th>Student Name</th>
              <th>PAN Number</th>
              <th>Promote To Class</th>
              <th>Detained</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const assignment = getAssignment(student.panNumber);
              return (
                <tr key={student.panNumber}>
                  <td>{student.classRollNumber}</td>
                  <td className="student-name">{student.name}</td>
                  <td>{student.panNumber}</td>
                  <td>
                    <select
                      value={assignment.toClassId || ''}
                      onChange={(e) => handleAssignmentChange(
                        student.panNumber,
                        'toClassId',
                        e.target.value ? parseInt(e.target.value) : null
                      )}
                      disabled={assignment.isDetained || saving}
                      className="class-select"
                    >
                      <option value="">Select Class</option>
                      {availableClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.className}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={assignment.isDetained}
                      onChange={(e) => handleAssignmentChange(
                        student.panNumber,
                        'isDetained',
                        e.target.checked
                      )}
                      disabled={saving}
                      className="detained-checkbox"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={assignment.remarks}
                      onChange={(e) => handleAssignmentChange(
                        student.panNumber,
                        'remarks',
                        e.target.value
                      )}
                      placeholder="Optional"
                      disabled={saving}
                      className="remarks-input"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="promotion-actions">
        <button
          onClick={handleSaveAll}
          disabled={saving || assignments.size === 0}
          className="save-all-btn"
        >
          {saving ? 'Saving...' : 'Save All Assignments'}
        </button>
        <p className="help-text">
          Note: Assignments will be saved but not executed until the admin changes the session.
        </p>
      </div>
    </div>
  );
};

export default PromotionAssignment;
