import React, { useState, useEffect } from 'react';
import './MarkAttendance.css';
import TeacherService from '../../services/teacherService';
import AttendanceService from '../../services/attendanceService';

interface Student {
  panNumber: string;
  name: string;
  rollNumber: number;
  isPresent: boolean;
}

interface MarkAttendanceProps {
  classId: string;
  className: string;
  section: string;
  onClose: () => void;
}

const MarkAttendance: React.FC<MarkAttendanceProps> = ({ classId, className, section, onClose }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching students for class ID:', classId);
      const studentsData = await TeacherService.getStudentsByClass(parseInt(classId));
      
      // Try to fetch existing attendance for today's date
      let existingAttendance: any = null;
      try {
        existingAttendance = await AttendanceService.getAttendanceByClassAndDate(classId, date);
        console.log('Existing attendance found:', existingAttendance);
      } catch (attendanceError) {
        console.log('No existing attendance for today:', attendanceError);
        // No attendance marked yet for today, which is fine
      }
      
      // Create a map of existing attendance by panNumber for quick lookup
      const attendanceMap = new Map<string, boolean>();
      if (existingAttendance && existingAttendance.studentAttendances) {
        existingAttendance.studentAttendances.forEach((att: any) => {
          attendanceMap.set(att.panNumber, att.isPresent);
        });
      }
      
      const transformedStudents: Student[] = studentsData.map((s: any) => {
        const panNumber = s.panNumber || s.id;
        // Use existing attendance status if available, otherwise default to true
        const isPresent = attendanceMap.has(panNumber) 
          ? attendanceMap.get(panNumber)! 
          : true;
        
        return {
          panNumber,
          name: s.name || 'Unknown',
          rollNumber: s.classRollNumber || 0,
          isPresent
        };
      }).sort((a: Student, b: Student) => a.rollNumber - b.rollNumber);

      setStudents(transformedStudents);
      
      // Set selectAll based on whether all students are present
      const allPresent = transformedStudents.every(s => s.isPresent);
      setSelectAll(allPresent);
      
      console.log('Loaded students with attendance:', transformedStudents);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (panNumber: string) => {
    setStudents(prev => prev.map(student => 
      student.panNumber === panNumber 
        ? { ...student, isPresent: !student.isPresent }
        : student
    ));
  };

  const handleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setStudents(prev => prev.map(student => ({ ...student, isPresent: newValue })));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const attendanceData = {
        classId: parseInt(classId),
        className: `${className}-${section}`,
        studentAttendances: students.map(student => ({
          panNumber: student.panNumber,
          isPresent: student.isPresent
        }))
      };

      console.log('Submitting attendance:', attendanceData);
      await AttendanceService.markAttendance(attendanceData);
      
      alert(`Attendance marked successfully for ${className}-${section}!`);
      onClose();
    } catch (err: any) {
      console.error('Error marking attendance:', err);
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="attendance-modal-overlay">
      <div className="attendance-modal">
        <div className="attendance-modal-header">
          <div>
            <h2>Mark Attendance</h2>
            <p className="attendance-class-info">
              {className} - Section {section} | Date: {new Date(date).toLocaleDateString()}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="attendance-loading">
            <div className="spinner"></div>
            <p>Loading students...</p>
          </div>
        ) : error ? (
          <div className="attendance-error">
            <p>Error: {error}</p>
            <button onClick={fetchStudents} className="retry-btn">Retry</button>
          </div>
        ) : (
          <>
            <div className="attendance-summary">
              <div className="summary-card present">
                <span className="summary-label">Present</span>
                <span className="summary-value">{presentCount}</span>
              </div>
              <div className="summary-card absent">
                <span className="summary-label">Absent</span>
                <span className="summary-value">{absentCount}</span>
              </div>
              <div className="summary-card total">
                <span className="summary-label">Total</span>
                <span className="summary-value">{students.length}</span>
              </div>
            </div>

            <div className="attendance-controls">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="bulk-action-btn present-all"
                  onClick={handleSelectAll}
                  style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                >
                  ✓ Mark All Present
                </button>
                <button 
                  className="bulk-action-btn absent-all"
                  onClick={() => {
                    setSelectAll(false);
                    setStudents(prev => prev.map(student => ({ ...student, isPresent: false })));
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  ✕ Mark All Absent
                </button>
                <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                  Click individual buttons below to mark each student
                </span>
              </div>
            </div>

            <div className="attendance-list">
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>PAN Number</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'center' }}>Mark Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.panNumber} className={student.isPresent ? 'present-row' : 'absent-row'}>
                      <td>{student.rollNumber}</td>
                      <td style={{ fontWeight: '500' }}>{student.name}</td>
                      <td style={{ fontSize: '13px', color: '#6b7280' }}>{student.panNumber}</td>
                      <td>
                        <span 
                          className={`status-badge ${student.isPresent ? 'status-present' : 'status-absent'}`}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block',
                            minWidth: '70px',
                            textAlign: 'center',
                            backgroundColor: student.isPresent ? '#d1fae5' : '#fee2e2',
                            color: student.isPresent ? '#065f46' : '#991b1b'
                          }}
                        >
                          {student.isPresent ? '✓ Present' : '✕ Absent'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className={`attendance-action-btn ${student.isPresent ? 'active-present' : 'inactive-present'}`}
                            onClick={() => {
                              if (!student.isPresent) {
                                handleToggleAttendance(student.panNumber);
                              }
                            }}
                            style={{
                              padding: '6px 16px',
                              border: student.isPresent ? '2px solid #10b981' : '2px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: student.isPresent ? 'default' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.2s',
                              minWidth: '90px',
                              backgroundColor: student.isPresent ? '#10b981' : 'white',
                              color: student.isPresent ? 'white' : '#6b7280',
                              opacity: student.isPresent ? 1 : 0.7
                            }}
                            onMouseEnter={(e) => {
                              if (!student.isPresent) {
                                e.currentTarget.style.borderColor = '#10b981';
                                e.currentTarget.style.backgroundColor = '#f0fdf4';
                                e.currentTarget.style.opacity = '1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!student.isPresent) {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.opacity = '0.7';
                              }
                            }}
                            disabled={student.isPresent}
                          >
                            {student.isPresent ? '✓ Present' : 'Present'}
                          </button>
                          <button
                            className={`attendance-action-btn ${!student.isPresent ? 'active-absent' : 'inactive-absent'}`}
                            onClick={() => {
                              if (student.isPresent) {
                                handleToggleAttendance(student.panNumber);
                              }
                            }}
                            style={{
                              padding: '6px 16px',
                              border: !student.isPresent ? '2px solid #ef4444' : '2px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: !student.isPresent ? 'default' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.2s',
                              minWidth: '90px',
                              backgroundColor: !student.isPresent ? '#ef4444' : 'white',
                              color: !student.isPresent ? 'white' : '#6b7280',
                              opacity: !student.isPresent ? 1 : 0.7
                            }}
                            onMouseEnter={(e) => {
                              if (student.isPresent) {
                                e.currentTarget.style.borderColor = '#ef4444';
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                                e.currentTarget.style.opacity = '1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (student.isPresent) {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.opacity = '0.7';
                              }
                            }}
                            disabled={!student.isPresent}
                          >
                            {!student.isPresent ? '✕ Absent' : 'Absent'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="attendance-modal-footer">
              <button className="cancel-btn" onClick={onClose}>Cancel</button>
              <button 
                className="submit-btn" 
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Submit Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;
