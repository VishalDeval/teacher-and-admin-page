import React, { useState, useEffect } from 'react';
import './MarksUpload.css';
import ScoreService, { BulkScoreUpdateDTO, StudentScoreEntry } from '../../services/scoreService';
import AdminService, { ClassInfoResponse } from '../../services/adminService';
import { SubjectService } from '../../services/subjectService';
import { api } from '../../services/api';

interface MarksUploadProps {
  activeSessionId: number | null;
}

interface Exam {
  id: number;
  name: string;
  examType: string; // From ClassExam.examType.name
  classExamId: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  examDate: string;
  maxMarks: number;
  passingMarks: number;
  description?: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  subjectName?: string;
  classId?: number;
  className?: string;
  teacherId?: number;
  teacherName?: string;
}

interface Student {
  panNumber: string;
  name: string;
  rollNumber?: string;
}

const MarksUpload: React.FC<MarksUploadProps> = () => {
  // State for dropdowns
  const [classes, setClasses] = useState<ClassInfoResponse[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Selection state
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Students and marks
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<{ [panNumber: string]: number | null }>({});
  const [grades, setGrades] = useState<{ [panNumber: string]: string }>({});

  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Maximum marks for exam
  const [maxMarks, setMaxMarks] = useState<number>(100);

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch exams when class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchExams(selectedClassId);
    } else {
      setExams([]);
      setSelectedExamId(null);
    }
  }, [selectedClassId]);

  // Fetch subjects when class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchSubjects(selectedClassId);
    } else {
      setSubjects([]);
      setSelectedSubjectId(null);
    }
  }, [selectedClassId]);

  // Fetch students and existing scores when all selections are made
  useEffect(() => {
    if (selectedClassId && selectedExamId && selectedSubjectId) {
      fetchStudents(selectedClassId);
      fetchExistingScores(selectedClassId, selectedExamId, selectedSubjectId);
    } else {
      setStudents([]);
      setMarks({});
      setGrades({});
    }
  }, [selectedClassId, selectedExamId, selectedSubjectId]);

  const fetchClasses = async () => {
    try {
      const response = await AdminService.getAllClasses();
      setClasses(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch classes');
    }
  };

  const fetchExams = async (classId: number) => {
    try {
      setLoadingExams(true);
      setError('');
      console.log('Fetching exams for class:', classId);
      
      // First, sync exams to ensure all subject-exam combinations exist
      try {
        await api.post(`/exams/sync/class/${classId}`);
        console.log('Exams synced successfully');
      } catch (syncErr) {
        console.warn('Sync failed, continuing with fetch:', syncErr);
        // Don't fail if sync fails, just continue to fetch
      }
      
      // Fetch ClassExams (exam types like Mid-term, Final Exams, etc.)
      const response = await api.get(`/class-exams/class/${classId}`);
      console.log('ClassExams response:', response);
      
      if (response.status >= 200 && response.status < 300) {
        const classExamsData = response.data.data || [];
        console.log('ClassExams data:', classExamsData);
        
        // Transform ClassExam data to match interface
        const transformedExams = classExamsData.map((classExam: any) => ({
          id: classExam.id, // This is the ClassExam ID
          name: classExam.examTypeName || 'Unnamed Exam',
          examType: classExam.examTypeName || 'Unknown',
          classExamId: classExam.id,
          classId: classExam.classId || classId,
          className: classExam.className || '',
          subjectId: null, // No specific subject for ClassExam
          subjectName: 'All Subjects',
          examDate: classExam.examDate,
          maxMarks: classExam.maxMarks || 100,
          passingMarks: classExam.passingMarks || 40,
          description: ''
        }));
        
        setExams(transformedExams);
        console.log('Set exams:', transformedExams.length, 'exams');
      } else {
        console.warn('Failed to fetch exams:', response);
        setExams([]);
      }
    } catch (err: any) {
      console.error('Error fetching exams:', err);
      setError(err.message || 'Failed to fetch exams');
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchSubjects = async (classId: number) => {
    try {
      setLoadingSubjects(true);
      setError('');
      console.log('Fetching subjects for class:', classId);
      const response = await SubjectService.getSubjectsByClass(classId);
      console.log('Subjects response:', response);
      
      if (Array.isArray(response)) {
        // Transform subjects to ensure consistent property names
        const transformedSubjects = response.map((subject: any) => ({
          id: subject.id,
          name: subject.name || subject.subjectName || 'Unnamed Subject',
          code: subject.code || subject.subjectCode || '', // Empty string instead of 'N/A'
          subjectName: subject.subjectName || subject.name,
          classId: subject.classId,
          className: subject.className,
          teacherId: subject.teacherId,
          teacherName: subject.teacherName
        }));
        
        setSubjects(transformedSubjects);
        console.log('Set subjects:', transformedSubjects.length, 'subjects');
      } else {
        console.warn('Subjects response is not an array:', response);
        setSubjects([]);
      }
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
      setError(err.message || 'Failed to fetch subjects');
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchStudents = async (classId: number) => {
    try {
      setLoadingStudents(true);
      const response = await AdminService.getStudentsByClassId(classId);
      // Map response to Student interface
      const studentList = response.map((s: any) => ({
        panNumber: s.panNumber || s.pan,
        name: s.name || s.fullName || `${s.firstName} ${s.lastName}`,
        rollNumber: s.rollNumber
      }));
      setStudents(studentList);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchExistingScores = async (classId: number, classExamId: number | null, subjectId: number) => {
    try {
      if (!classExamId || !subjectId) {
        console.log('No classExamId or subjectId provided - cannot fetch existing scores');
        return;
      }

      // Get the correct maxMarks from the selected ClassExam (not from Exam table)
      const selectedExam = exams.find(e => e.id === classExamId);
      const correctMaxMarks = selectedExam ? selectedExam.maxMarks : 100;
      console.log('Using maxMarks from selected ClassExam:', correctMaxMarks);

      // Find the actual Exam ID for this ClassExam + Subject combination
      const examsResponse = await api.get(`/exams/class/${classId}`);
      const allExams = examsResponse.data.data || [];
      const matchingExam = allExams.find((exam: any) => 
        exam.classExamId === classExamId && exam.subjectId === subjectId
      );

      if (!matchingExam) {
        console.log('No matching exam found for ClassExam:', classExamId, 'Subject:', subjectId);
        // Set maxMarks from the selected ClassExam
        if (selectedExam && selectedExam.maxMarks) {
          console.log('Setting maxMarks from selected ClassExam (no match):', selectedExam.maxMarks);
          setMaxMarks(selectedExam.maxMarks);
        }
        return;
      }

      const examId = matchingExam.id;
      
      // IMPORTANT: Always use maxMarks from ClassExam, NOT from Exam table
      // The ClassExam.maxMarks is the authoritative source
      console.log('Using ClassExam maxMarks:', correctMaxMarks, '(ignoring Exam table maxMarks:', matchingExam.maxMarks, ')');
      setMaxMarks(correctMaxMarks);

      const scores = await ScoreService.getScoresByClassSubjectAndExam(classId, subjectId, examId);

      // Pre-fill marks if scores exist
      const marksMap: { [panNumber: string]: number | null } = {};
      const gradesMap: { [panNumber: string]: string } = {};

      scores.forEach(score => {
        marksMap[score.studentPanNumber] = score.marks;
        // Calculate grade with the correct maxMarks from ClassExam
        if (score.marks !== null && score.marks !== undefined) {
          gradesMap[score.studentPanNumber] = calculateGrade(score.marks, correctMaxMarks);
        }
      });
      
      // Set marks and grades
      setMarks(marksMap);
      setGrades(gradesMap);
    } catch (err: any) {
      console.error('Error fetching existing scores:', err);
      // Not a critical error - continue with empty marks
      // But still try to set maxMarks from the selected exam
      const selectedExam = exams.find(e => e.id === classExamId);
      if (selectedExam && selectedExam.maxMarks) {
        console.log('Setting maxMarks from selected exam (error case):', selectedExam.maxMarks);
        setMaxMarks(selectedExam.maxMarks);
      }
    }
  };

  const calculateGrade = (marks: number | null, max: number): string => {
    if (marks === null || marks === undefined) return '';
    const percentage = (marks / max) * 100;
    return ScoreService.calculateGrade(percentage);
  };

  const handleMarksChange = (panNumber: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);

    // Validate marks don't exceed max marks
    if (numValue !== null && numValue > maxMarks) {
      setError(`Marks cannot exceed ${maxMarks}`);
      return;
    }

    if (numValue !== null && numValue < 0) {
      setError('Marks cannot be negative');
      return;
    }

    setError('');
    setMarks(prev => ({ ...prev, [panNumber]: numValue }));
    
    // Auto-calculate grade
    const grade = calculateGrade(numValue, maxMarks);
    setGrades(prev => ({ ...prev, [panNumber]: grade }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClassId || !selectedExamId || !selectedSubjectId) {
      setError('Please select Class, Exam, and Subject');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Find the actual Exam ID for this ClassExam + Subject combination
      const examsResponse = await api.get(`/exams/class/${selectedClassId}`);
      const allExams = examsResponse.data.data || [];
      const matchingExam = allExams.find((exam: any) => 
        exam.classExamId === selectedExamId && exam.subjectId === selectedSubjectId
      );

      if (!matchingExam) {
        setError('Exam not found for this class and subject combination. Please sync exams first.');
        return;
      }

      const actualExamId = matchingExam.id;

      // Prepare scores data
      const scores: StudentScoreEntry[] = students.map(student => ({
        studentPanNumber: student.panNumber,
        studentName: student.name,
        marks: marks[student.panNumber] ?? null,
        grade: grades[student.panNumber] || ''
      }));

      // Pass the actual Exam ID
      const bulkScoreData: BulkScoreUpdateDTO = {
        examId: actualExamId, // Using actual Exam ID from Exam table
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        scores
      };

      await ScoreService.bulkUpdateScores(bulkScoreData);
      
      setSuccess(`Successfully uploaded marks for ${scores.length} students!`);
      
      // Refresh existing scores
      fetchExistingScores(selectedClassId, selectedExamId, selectedSubjectId);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload marks');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMarks({});
    setGrades({});
    setError('');
    setSuccess('');
  };

  // Update max marks when exam changes
  useEffect(() => {
    console.log('Exam selection changed:', { selectedExamId, examsCount: exams.length });
    if (selectedExamId) {
      const selectedExam = exams.find(e => e.id === selectedExamId);
      console.log('Found exam:', selectedExam);
      if (selectedExam) {
        console.log('Setting maxMarks to:', selectedExam.maxMarks);
        setMaxMarks(selectedExam.maxMarks);
      } else {
        console.warn('Exam not found in exams array!');
      }
    }
  }, [selectedExamId, exams]);

  // Recalculate all grades when maxMarks changes or marks change
  useEffect(() => {
    if (maxMarks && maxMarks > 0) {
      console.log('Recalculating grades with maxMarks:', maxMarks);
      const newGrades: { [panNumber: string]: string } = {};
      Object.entries(marks).forEach(([panNumber, studentMarks]) => {
        if (studentMarks !== null && studentMarks !== undefined) {
          newGrades[panNumber] = calculateGrade(studentMarks, maxMarks);
        }
      });
      setGrades(newGrades);
      console.log('Updated grades:', newGrades);
    }
  }, [maxMarks, marks]);

  return (
    <div className="marks-upload-container">
      <div className="marks-upload-header">
        <h2>Upload Student Marks</h2>
        <p>Select class, exam, and subject to upload marks for students</p>
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

      <form onSubmit={handleSubmit} className="marks-upload-form">
        {/* Selection Section */}
        <div className="selection-grid">
          <div className="form-group">
            <label htmlFor="class">Select Class *</label>
            <select
              id="class"
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="">-- Select Class --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="exam">Select Exam *</label>
            <select
              id="exam"
              value={selectedExamId || ''}
              onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
              required
              disabled={!selectedClassId || loadingExams}
            >
              <option value="">-- Select Exam --</option>
              {loadingExams ? (
                <option value="" disabled>Loading exams...</option>
              ) : exams.length === 0 ? (
                <option value="" disabled>No exams available for this class</option>
              ) : (
                exams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.examType || exam.name || 'Unnamed Exam'} (Max: {exam.maxMarks || 0})
                  </option>
                ))
              )}
            </select>
            {loadingExams && <small className="loading-text">Loading exams...</small>}
          </div>

          <div className="form-group">
            <label htmlFor="subject">Select Subject *</label>
            <select
              id="subject"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
              required
              disabled={!selectedClassId || loadingSubjects}
            >
              <option value="">-- Select Subject --</option>
              {loadingSubjects ? (
                <option value="" disabled>Loading subjects...</option>
              ) : subjects.length === 0 ? (
                <option value="" disabled>No subjects available for this class</option>
              ) : (
                subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name || subject.subjectName || 'Unnamed Subject'} {subject.code && subject.code !== 'N/A' ? `(${subject.code})` : ''}
                  </option>
                ))
              )}
            </select>
            {loadingSubjects && <small className="loading-text">Loading subjects...</small>}
          </div>
        </div>

        {/* Student Marks Table */}
        {selectedClassId && selectedExamId && selectedSubjectId && (
          <div className="marks-table-container">
            <div className="table-header">
              <h3>Student Marks</h3>
              <div className="table-actions">
                <span className="max-marks-info">Maximum Marks: {maxMarks}</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-reset"
                  disabled={loading}
                >
                  Reset All
                </button>
              </div>
            </div>

            {loadingStudents ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="no-data">
                <p>No students found in this class</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="marks-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Roll No.</th>
                      <th>PAN Number</th>
                      <th>Student Name</th>
                      <th>Marks Obtained</th>
                      <th>Grade</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const studentMarks = marks[student.panNumber];
                      // Calculate percentage - ensure we have valid marks and maxMarks
                      let percentage = '-';
                      if (studentMarks !== null && studentMarks !== undefined && !isNaN(studentMarks) && maxMarks && maxMarks > 0) {
                        percentage = ((studentMarks / maxMarks) * 100).toFixed(2);
                      }
                      // Debug log for first 3 students to verify calculation
                      if (index < 3) {
                        console.log(`Student ${index + 1} (${student.name}):`, { 
                          studentMarks, 
                          maxMarks, 
                          percentage,
                          grade: grades[student.panNumber]
                        });
                      }
                      
                      return (
                        <tr key={student.panNumber}>
                          <td>{index + 1}</td>
                          <td>{student.rollNumber || '-'}</td>
                          <td className="pan-number">{student.panNumber}</td>
                          <td className="student-name">{student.name}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max={maxMarks}
                              step="0.5"
                              value={studentMarks ?? ''}
                              onChange={(e) => handleMarksChange(student.panNumber, e.target.value)}
                              placeholder="Enter marks"
                              className="marks-input"
                            />
                          </td>
                          <td>
                            <span className={`grade-badge grade-${grades[student.panNumber]?.replace('+', 'plus')}`}>
                              {grades[student.panNumber] || '-'}
                            </span>
                          </td>
                          <td className="percentage">
                            {percentage !== '-' ? `${percentage}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {students.length > 0 && (
          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || !selectedClassId || !selectedExamId || !selectedSubjectId}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Uploading...
                </>
              ) : (
                <>
                  Upload Marks
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default MarksUpload;
