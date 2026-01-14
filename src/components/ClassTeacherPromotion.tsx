import React, { useState, useEffect } from 'react';
import ClassService from '../services/classService';
import { StudentService } from '../services/studentService';
import { FeeService } from '../services/feeService';
import resultService from '../services/resultService';
import './ClassTeacherPromotion.css';

interface Student {
  panNumber: string;
  name: string;
  classRollNumber: number;
  feeStatus: 'paid' | 'pending' | 'overdue';
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
}

interface StudentWithPerformance extends Student {
  totalPending: number;
  totalOverdue: number;
  averagePercentage: number;
  passStatus: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
}

interface Class {
  classId: number;
  className: string;
  section: string;
}

const ClassTeacherPromotion: React.FC = () => {
  const [myClasses, setMyClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<StudentWithPerformance[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [targetClass, setTargetClass] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load teacher's assigned classes
  useEffect(() => {
    loadMyClasses();
    loadAllClasses();
  }, []);

  const loadMyClasses = async () => {
    try {
      setLoading(true);
      // Assuming there's a teacher service to get assigned classes
      const classes = await ClassService.getAllClasses();
      // Filter for classes where current teacher is class teacher
      // This would need backend support to get only class teacher's classes
      setMyClasses(classes.map((c: any) => ({
        classId: c.classId,
        className: c.className,
        section: c.section
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned classes');
    } finally {
      setLoading(false);
    }
  };

  const loadAllClasses = async () => {
    try {
      const classes = await ClassService.getAllClasses();
      setAvailableClasses(classes.map((c: any) => ({
        classId: c.classId,
        className: c.className,
        section: c.section
      })));
    } catch (err: any) {
      console.error('Failed to load available classes:', err);
    }
  };

  const loadStudents = async (classId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get students from class
      const studentList = await StudentService.getStudentsByClass(classId);
      
      // Enrich with fee and performance data
      const enrichedStudents = await Promise.all(
        studentList.map(async (student: any) => {
          try {
            // Get fee catalog
            const feeCatalog = await FeeService.getFeeCatalogByPan(student.panNumber);
            
            // Get results to calculate average
            let averagePercentage = 0;
            let passStatus: 'PASS' | 'FAIL' | 'NOT_EVALUATED' = 'NOT_EVALUATED';
            
            try {
              const results = await resultService.getStudentAllResults(student.panNumber);
              if (results && results.examResults && results.examResults.length > 0) {
                const totalPercentage = results.examResults.reduce((sum, exam) => sum + exam.percentage, 0);
                averagePercentage = totalPercentage / results.examResults.length;
                
                // Determine pass/fail (assuming 40% is passing)
                passStatus = averagePercentage >= 40 ? 'PASS' : 'FAIL';
              }
            } catch (err) {
              // If no results, keep as NOT_EVALUATED
              console.warn(`No results found for student ${student.panNumber}`);
            }

            return {
              panNumber: student.panNumber,
              name: student.name,
              classRollNumber: student.classRollNumber,
              feeStatus: feeCatalog.totalOverdue > 0 ? 'overdue' : 
                         feeCatalog.totalPending > 0 ? 'pending' : 'paid',
              status: student.status,
              totalPending: feeCatalog.totalPending || 0,
              totalOverdue: feeCatalog.totalOverdue || 0,
              averagePercentage,
              passStatus
            } as StudentWithPerformance;
          } catch (err) {
            console.error(`Error enriching student ${student.panNumber}:`, err);
            return {
              ...student,
              totalPending: 0,
              totalOverdue: 0,
              averagePercentage: 0,
              passStatus: 'NOT_EVALUATED'
            } as StudentWithPerformance;
          }
        })
      );

      setStudents(enrichedStudents);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classItem: Class) => {
    setSelectedClass(classItem);
    setSelectedStudents(new Set());
    await loadStudents(classItem.classId);
  };

  const toggleStudentSelection = (panNumber: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(panNumber)) {
      newSelection.delete(panNumber);
    } else {
      newSelection.add(panNumber);
    }
    setSelectedStudents(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.panNumber)));
    }
  };

  const handlePromote = async () => {
    if (!targetClass) {
      alert('Please select a target class');
      return;
    }

    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call backend promotion API
      await StudentService.promoteStudentsToClass(Array.from(selectedStudents), targetClass);
      
      setSuccess(`Successfully promoted ${selectedStudents.size} student(s)`);
      setSelectedStudents(new Set());
      
      // Reload students
      if (selectedClass) {
        await loadStudents(selectedClass.classId);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to promote students');
    } finally {
      setLoading(false);
    }
  };

  const getFeeStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPassStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return '#10b981';
      case 'FAIL': return '#ef4444';
      case 'NOT_EVALUATED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="promotion-container">
      <div className="promotion-header">
        <h2>Student Promotion Management</h2>
        <p>Promote students to the next class for the upcoming session</p>
      </div>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      <div className="promotion-content">
        {/* Class Selection */}
        <div className="class-selection-panel">
          <h3>Your Assigned Classes</h3>
          {myClasses.length === 0 ? (
            <p className="no-data">No classes assigned as class teacher</p>
          ) : (
            <div className="class-list">
              {myClasses.map((classItem) => (
                <button
                  key={classItem.classId}
                  className={`class-card ${selectedClass?.classId === classItem.classId ? 'selected' : ''}`}
                  onClick={() => handleClassSelect(classItem)}
                >
                  <div className="class-name">{classItem.className}</div>
                  <div className="class-section">Section {classItem.section}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Student List */}
        {selectedClass && (
          <div className="students-panel">
            <div className="panel-header">
              <h3>Students in {selectedClass.className} - Section {selectedClass.section}</h3>
              <div className="selection-info">
                {selectedStudents.size > 0 && (
                  <span>{selectedStudents.size} selected</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading">Loading students...</div>
            ) : students.length === 0 ? (
              <p className="no-data">No students found in this class</p>
            ) : (
              <>
                <div className="table-actions">
                  <button onClick={toggleSelectAll} className="btn-secondary">
                    {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <table className="students-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedStudents.size === students.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Roll No.</th>
                      <th>Student Name</th>
                      <th>Fee Status</th>
                      <th>Fee Details</th>
                      <th>Average %</th>
                      <th>Pass/Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.panNumber} className={selectedStudents.has(student.panNumber) ? 'selected-row' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.panNumber)}
                            onChange={() => toggleStudentSelection(student.panNumber)}
                          />
                        </td>
                        <td>{student.classRollNumber}</td>
                        <td className="student-name">{student.name}</td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: getFeeStatusColor(student.feeStatus) }}>
                            {student.feeStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="fee-details">
                          {student.totalOverdue > 0 && (
                            <span className="overdue">Overdue: ₹{student.totalOverdue.toLocaleString()}</span>
                          )}
                          {student.totalPending > 0 && (
                            <span className="pending">Pending: ₹{student.totalPending.toLocaleString()}</span>
                          )}
                          {student.totalOverdue === 0 && student.totalPending === 0 && (
                            <span className="paid">Fully Paid</span>
                          )}
                        </td>
                        <td className="percentage">
                          {student.passStatus !== 'NOT_EVALUATED' ? `${student.averagePercentage.toFixed(1)}%` : '-'}
                        </td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: getPassStatusColor(student.passStatus) }}>
                            {student.passStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Promotion Section */}
                <div className="promotion-section">
                  <h4>Promote Selected Students</h4>
                  <div className="promotion-form">
                    <div className="form-group">
                      <label>Target Class:</label>
                      <select
                        value={targetClass || ''}
                        onChange={(e) => setTargetClass(Number(e.target.value))}
                        className="class-select"
                      >
                        <option value="">-- Select Class --</option>
                        {availableClasses.map((classItem) => (
                          <option key={classItem.classId} value={classItem.classId}>
                            {classItem.className} - Section {classItem.section}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handlePromote}
                      disabled={!targetClass || selectedStudents.size === 0 || loading}
                      className="btn-promote"
                    >
                      {loading ? 'Promoting...' : `Promote ${selectedStudents.size} Student(s)`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassTeacherPromotion;
