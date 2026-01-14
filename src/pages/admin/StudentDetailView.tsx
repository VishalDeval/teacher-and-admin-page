import React, { useState, useEffect } from 'react';
import { Student, FeeCatalog } from '../../types/admin';
import './StudentDetailView.css';
import { StudentService } from '../../services/studentService';
import FeeService from '../../services/feeService';
import { api } from '../../services/api';
import { generateReportCard } from '../../utils/pdfGenerator';

interface StudentDetailViewProps {
  student: Student;
  feeCatalog: FeeCatalog;
  onClose: () => void;
  onUpdate?: () => void; // Callback after successful update
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ student, feeCatalog: initialFeeCatalog, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feeCatalog, setFeeCatalog] = useState<FeeCatalog>(initialFeeCatalog);
  const [isGeneratingFees, setIsGeneratingFees] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  
  // Editable student data
  const [editedStudent, setEditedStudent] = useState<Student>({ ...student });

  // Sync editedStudent when student prop changes (after successful update)
  useEffect(() => {
    setEditedStudent({ ...student });
  }, [student]);

  // Check if fees need to be generated
  useEffect(() => {
    console.log('Initial fee catalog check:', {
      monthlyFeesLength: feeCatalog.monthlyFees.length,
      totalAmount: feeCatalog.totalAmount,
      monthlyFees: feeCatalog.monthlyFees
    });
    
    // Don't auto-generate fees - let admin manually trigger if needed
    // Check if fees are truly empty (length 0) OR all items are empty objects
    const hasValidFees = feeCatalog.monthlyFees.length > 0 && 
                         feeCatalog.monthlyFees.some(fee => fee.month && fee.amount);
    
    if (!hasValidFees) {
      console.log('No valid fees found. Admin can manually generate if needed.');
    }
  }, []);

  // Generate fees for student
  const generateFeesForStudent = async () => {
    try {
      setIsGeneratingFees(true);
      setError(null);
      await FeeService.generateFeesForStudent(student.id);
      
      // Refresh fee catalog
      const updatedCatalog = await FeeService.getFeeCatalogByPan(student.id);
      setFeeCatalog(updatedCatalog);
      setSuccess('Fees generated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to generate fees:', error);
      // Check if it's a duplicate entry error
      if (error.message && error.message.includes('already exist')) {
        setError('Fee records already exist for this student.');
        // Try to refresh the catalog to show existing fees
        try {
          const updatedCatalog = await FeeService.getFeeCatalogByPan(student.id);
          setFeeCatalog(updatedCatalog);
        } catch (refreshError) {
          console.error('Failed to refresh fee catalog:', refreshError);
        }
      } else {
        setError(error.message || 'Failed to generate fees');
      }
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGeneratingFees(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof Student, value: any) => {
    setEditedStudent(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate required fields
      if (!editedStudent.name || !editedStudent.currentClass || !editedStudent.section) {
        setError('Please fill in all required fields');
        setIsSaving(false);
        return;
      }

      // Clean up class and section
      const cleanClass = editedStudent.currentClass.trim();
      const cleanSection = editedStudent.section.trim();

      // Check if class or section changed
      const classChanged = cleanClass !== student.currentClass || cleanSection !== student.section;

      // Prepare data for backend - combine class and section into className format
      const updateData = {
        ...editedStudent,
        className: `${cleanClass}-${cleanSection}`, // Backend expects "1-A" format
        gender: editedStudent.gender?.toUpperCase(), // Backend expects MALE, FEMALE, OTHER (uppercase)
        // Remove frontend-only fields that backend doesn't recognize
        currentClass: undefined,
        section: undefined,
        classId: undefined,
        feeStatus: undefined,
        feeCatalogStatus: undefined,
      };

      console.log('Sending update data:', updateData);

      // Call update API
      const updatedStudentData = await StudentService.updateStudent(editedStudent.id, updateData);
      
      console.log('Received updated student data:', updatedStudentData);

      // Refresh fee catalog if class changed
      if (classChanged) {
        console.log('Class changed! Refreshing fee catalog...');
        try {
          // Wait for backend to complete fee regeneration (delete old + generate new)
          await new Promise(resolve => setTimeout(resolve, 2500));
          
          // Retry logic: Try up to 8 times to get updated fee catalog
          let updatedCatalog = null;
          let retries = 8;
          
          while (retries > 0) {
            try {
              console.log(`Attempting to fetch fee catalog (attempt ${9 - retries}/8)...`);
              const catalog = await FeeService.getFeeCatalogByPan(editedStudent.id);
              console.log('Fetched catalog:', catalog);
              
              // Verify the catalog has fees and check if fee amount matches new class
              if (catalog && catalog.monthlyFees && catalog.monthlyFees.length > 0) {
                // Check if any fee has updated amount (class 2 should have 2000, class 1 should have 1000)
                const firstFee = catalog.monthlyFees[0];
                console.log('First fee amount:', firstFee.amount);
                
                updatedCatalog = catalog;
                setFeeCatalog(updatedCatalog);
                console.log('✅ Fee catalog successfully refreshed after class change');
                break;
              } else {
                console.log('Fee catalog empty or invalid, retrying...', retries - 1, 'attempts left');
                retries--;
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            } catch (retryErr) {
              console.error('Retry failed:', retryErr);
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          
          if (!updatedCatalog) {
            console.warn('⚠️ Could not fetch updated fee catalog after class change, forcing fee generation...');
            // Trigger manual refresh by calling generate fees
            await FeeService.generateFeesForStudent(editedStudent.id);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const finalCatalog = await FeeService.getFeeCatalogByPan(editedStudent.id);
            setFeeCatalog(finalCatalog);
            console.log('✅ Fee catalog regenerated and refreshed');
          }
        } catch (err) {
          console.error('❌ Failed to refresh fee catalog:', err);
          setError('Student updated but fee catalog refresh failed. Please close and reopen to see updated fees.');
        }
      }
      
      // Update editedStudent with fresh data from backend
      const updatedStudent = {
        ...editedStudent,
        currentClass: updatedStudentData.currentClass,
        section: updatedStudentData.section,
        classRollNumber: updatedStudentData.classRollNumber,
        className: updatedStudentData.className
      };
      setEditedStudent(updatedStudent);
      
      if (classChanged) {
        setSuccess('Student information updated successfully! Fee structure has been updated for the new class. Please close and reopen this dialog to view updated fees.');
        // Close the modal after 3 seconds to force refresh
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 3000);
      } else {
        setSuccess('Student information updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
      setIsEditing(false);
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update student information');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditedStudent({ ...student });
    setIsEditing(false);
    setError(null);
  };

  // Enter edit mode
  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  // Get the year from the fee data, or use current year as fallback
  const getFeeYear = () => {
    if (feeCatalog.monthlyFees && feeCatalog.monthlyFees.length > 0) {
      const firstFeeWithYear = feeCatalog.monthlyFees.find(fee => fee.year);
      return firstFeeWithYear ? firstFeeWithYear.year : new Date().getFullYear();
    }
    return new Date().getFullYear();
  };

  const currentYear = getFeeYear();

  // Determine session start month from fee data
  const getSessionStartMonth = () => {
    if (feeCatalog.monthlyFees && feeCatalog.monthlyFees.length > 0) {
      // Find the first fee entry (should be session start)
      const sortedFees = [...feeCatalog.monthlyFees].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return months.indexOf(a.month?.toUpperCase()) - months.indexOf(b.month?.toUpperCase());
      });
      return sortedFees[0]?.month?.toUpperCase() || 'APRIL';
    }
    return 'APRIL'; // Default to April
  };

  const sessionStartMonth = getSessionStartMonth();
  const sessionStartIndex = months.indexOf(sessionStartMonth);

  // Reorder months to start from session start month
  const getSessionMonths = () => {
    if (sessionStartIndex === -1 || sessionStartIndex === 0) {
      return months.map(month => ({ month, year: currentYear }));
    }
    
    // Create array starting from session start month
    const reorderedMonths: Array<{ month: string; year: number }> = [];
    
    // Add months from session start to end of year
    for (let i = sessionStartIndex; i < months.length; i++) {
      reorderedMonths.push({ month: months[i], year: currentYear });
    }
    
    // Add months from start of next year to session start
    for (let i = 0; i < sessionStartIndex; i++) {
      reorderedMonths.push({ month: months[i], year: currentYear + 1 });
    }
    
    return reorderedMonths;
  };

  const sessionMonths = getSessionMonths();

  const renderPersonalInfo = () => {
    const displayStudent = isEditing ? editedStudent : student;
    
    return (
      <div className="personal-info">
        <div className="info-section">
          <h3 className="section-title">Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name: <span className='astrick' style={{color: 'red',}}>*</span></label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={displayStudent.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              ) : (
                <span>{displayStudent.name}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Class: <span className='astrick' style={{color: 'red'}}>*</span></label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={displayStudent.currentClass || ''}
                  onChange={(e) => handleInputChange('currentClass', e.target.value)}
                  required
                  placeholder="e.g., 1, 2, 10"
                />
              ) : (
                <span className="badge-class">{displayStudent.currentClass}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Section: <span className='astrick' style={{color: 'red'}}>*</span></label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={displayStudent.section || ''}
                  onChange={(e) => handleInputChange('section', e.target.value)}
                  required
                  placeholder="e.g., A, B, C"
                />
              ) : (
                <span>{displayStudent.section}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Roll Number:</label>
              {isEditing ? (
                <input
                  type="number"
                  className="edit-input"
                  value={displayStudent.classRollNumber || ''}
                  onChange={(e) => handleInputChange('classRollNumber', parseInt(e.target.value) || 0)}
                />
              ) : (
                <span className="badge-primary">{displayStudent.classRollNumber}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Date of Birth:</label>
              {isEditing ? (
                <input
                  type="date"
                  className="edit-input"
                  value={displayStudent.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              ) : (
                <span>{displayStudent.dateOfBirth}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Gender:</label>
              {isEditing ? (
                <select
                  className="edit-input"
                  value={displayStudent.gender || 'male'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <span style={{textTransform: 'capitalize'}}>{displayStudent.gender}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Blood Group:</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={displayStudent.bloodGroup || ''}
                  onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                />
              ) : (
                <span className="badge-blood">{displayStudent.bloodGroup}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Admission Date:</label>
              {isEditing ? (
                <input
                  type="date"
                  className="edit-input"
                  value={displayStudent.admissionDate || ''}
                  onChange={(e) => handleInputChange('admissionDate', e.target.value)}
                />
              ) : (
                <span>{displayStudent.admissionDate}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Previous School:</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={displayStudent.previousSchool || ''}
                  onChange={(e) => handleInputChange('previousSchool', e.target.value)}
                  placeholder="Enter previous school (optional)"
                />
              ) : (
                <span>{displayStudent.previousSchool || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3 className="section-title">Contact Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Parent Name:</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={displayStudent.parentName || ''}
                  onChange={(e) => handleInputChange('parentName', e.target.value)}
                />
              ) : (
                <span>{displayStudent.parentName}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Mobile Number:</label>
              {isEditing ? (
                <input
                  type="tel"
                  className="edit-input"
                  value={displayStudent.mobileNumber || ''}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                />
              ) : (
                <span>{displayStudent.mobileNumber}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Emergency Contact:</label>
              {isEditing ? (
                <input
                  type="tel"
                  className="edit-input"
                  value={displayStudent.emergencyContact || ''}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                />
              ) : (
                <span>{displayStudent.emergencyContact}</span>
              )}
            </div>
            
            <div className="info-item full-width">
              <label>Address:</label>
              {isEditing ? (
                <textarea
                  className="edit-textarea"
                  value={displayStudent.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              ) : (
                <span>{displayStudent.address}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFeeCatalog = () => {
    console.log('Fee Catalog Data:', feeCatalog);
    console.log('Monthly Fees:', feeCatalog.monthlyFees);
    console.log('Monthly Fees detailed:', JSON.stringify(feeCatalog.monthlyFees, null, 2));
    
    // Check if fees are valid (not just empty objects)
    const hasValidFees = feeCatalog.monthlyFees.length > 0 && 
                         feeCatalog.monthlyFees.some(fee => fee.month && fee.amount !== undefined);
    
    // Check if fees need to be generated
    if (!hasValidFees && !isGeneratingFees) {
      return (
        <div className="fee-catalog">
          <div className="no-fees-message">
            <h3>No Fee Records Found</h3>
            <p>This student doesn't have any fee records yet.</p>
            <button 
              className="generate-fees-btn"
              onClick={generateFeesForStudent}
              disabled={isGeneratingFees}
            >
              {isGeneratingFees ? 'Generating Fees...' : 'Generate Fee Records'}
            </button>
          </div>
        </div>
      );
    }

    if (isGeneratingFees) {
      return (
        <div className="fee-catalog">
          <div className="loading-message">
            <p>Generating fee records...</p>
          </div>
        </div>
      );
    }
    
    return (
    <div className="fee-catalog">
      <div className="fee-summary">
        <div className="fee-summary-card">
          <h4>Total Fee Amount</h4>
          <span className="amount">₹{feeCatalog.totalAmount.toLocaleString()}</span>
        </div>
        <div className="fee-summary-card paid">
          <h4>Total Paid</h4>
          <span className="amount">₹{feeCatalog.totalPaid.toLocaleString()}</span>
        </div>
        <div className="fee-summary-card pending">
          <h4>Total Pending</h4>
          <span className="amount">₹{feeCatalog.totalPending.toLocaleString()}</span>
        </div>
        <div className="fee-summary-card overdue">
          <h4>Total Overdue</h4>
          <span className="amount">₹{feeCatalog.totalOverdue.toLocaleString()}</span>
        </div>
      </div>

      <div className="fee-calendar">
        <h4>Monthly Fee Calendar - Session {currentYear}-{currentYear + 1}</h4>
        <div className="calendar-grid">
          {sessionMonths.map(({ month, year }) => {
            const monthFee = feeCatalog.monthlyFees.find(
              fee => fee && fee.month && fee.month.toUpperCase() === month.toUpperCase() && fee.year === year
            );
            
            // Safely get status with fallback
            let status = 'pending';
            if (monthFee && monthFee.status) {
              status = monthFee.status.toLowerCase();
            }

            // Safely get amount with fallback
            const amount = monthFee && monthFee.amount !== undefined ? monthFee.amount : 0;

            return (
              <div key={`${month}-${year}`} className={`calendar-month ${status}`}>
                <div className="month-name">{month}</div>
                <div className="month-year">{year}</div>
                <div className="month-status">
                  {status === 'paid' && <span className="status-paid">✓</span>}
                  {status === 'overdue' && <span className="status-overdue">⚠</span>}
                  {status === 'pending' && <span className="status-pending">○</span>}
                  {status === 'unpaid' && <span className="status-pending">○</span>}
                </div>
                <div className="month-amount">
                  ₹{amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fee-details">
        <h4>Detailed Fee Records</h4>
        <div className="fee-table">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Receipt No.</th>
              </tr>
            </thead>
            <tbody>
              {feeCatalog.monthlyFees.length > 0 ? (
                feeCatalog.monthlyFees.map((fee, index) => (
                  <tr key={index} className={`fee-row ${fee.status || 'pending'}`}>
                    <td>{fee.month || 'N/A'} {fee.year || ''}</td>
                    <td>₹{fee.amount !== undefined ? fee.amount.toLocaleString() : '0'}</td>
                    <td>{fee.dueDate || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${fee.status || 'pending'}`}>
                        {fee.status || 'N/A'}
                      </span>
                    </td>
                    <td>{fee.paymentDate || '-'}</td>
                    <td>{fee.receiptNumber || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    No fee records available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  const renderAcademicInfo = () => (
    <div className="academic-info">
      <h4>Academic Information</h4>
      <div className="info-grid">
        <div className="info-item">
          <label>Current Class:</label>
          <span>{student.currentClass}</span>
        </div>
        <div className="info-item">
          <label>Section:</label>
          <span>{student.section}</span>
        </div>
        <div className="info-item">
          <label>Roll Number:</label>
          <span>{student.classRollNumber}</span>
        </div>
        <div className="info-item">
          <label>Admission Date:</label>
          <span>{student.admissionDate}</span>
        </div>
      </div>
      
      <div className="academic-actions">
        <button 
          className="action-btn"
          onClick={async () => {
            try {
              setLoadingResults(true);
              setShowResultsModal(true);
              const response = await api.get(`/results/student/${student.id}`);
              if (response.data && response.data.examResults) {
                setStudentResults(response.data.examResults);
              } else {
                setStudentResults([]);
              }
            } catch (err: any) {
              console.error('Failed to load results:', err);
              alert(err.message || 'Failed to load results');
              setShowResultsModal(false);
            } finally {
              setLoadingResults(false);
            }
          }}
        >
          View Results
        </button>

        <button 
          className="action-btn"
          onClick={async () => {
            try {
              // Fetch student results
              const response = await api.get(`/results/student/${student.id}`);
              
              if (!response.data || !response.data.examResults || response.data.examResults.length === 0) {
                alert('No exam results found for this student. Cannot generate report card.');
                return;
              }

              // Get current session year
              const currentYear = new Date().getFullYear();
              const sessionYear = `${currentYear}-${currentYear + 1}`;

              // Prepare data for PDF generation
              const reportCardData = {
                studentInfo: {
                  name: student.name,
                  id: student.id,
                  className: student.currentClass,
                  section: student.section,
                  rollNumber: student.classRollNumber,
                  fatherName: student.parentName || 'N/A',
                  dateOfBirth: student.dateOfBirth || 'N/A'
                },
                examResults: response.data.examResults,
                sessionYear: sessionYear,
                schoolName: 'School Management System', // Can be fetched from settings
                generatedDate: new Date().toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              };

              // Generate PDF
              await generateReportCard(reportCardData);
              alert('Report card generated successfully!');
            } catch (err: any) {
              console.error('Failed to generate report card:', err);
              alert(err.message || 'Failed to generate report card. Please try again.');
            }
          }}
        >
          Generate Report Card
        </button>
      </div>

      {/* Results Modal */}
      {showResultsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Exam Results - {student.name}</h3>
              <button onClick={() => setShowResultsModal(false)} style={{ fontSize: '1.5rem', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
            {loadingResults ? (
              <p>Loading results...</p>
            ) : studentResults.length === 0 ? (
              <p>No exam results found for this student.</p>
            ) : (
              <div>
                {studentResults.map((exam: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '1.5rem', border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                    <h4>{exam.examName}</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #ddd' }}>Subject</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #ddd' }}>Marks</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #ddd' }}>Max Marks</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #ddd' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.subjectScores?.map((subject: any, sIdx: number) => (
                          <tr key={sIdx}>
                            <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{subject.subjectName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #ddd' }}>
                              {subject.marks !== null ? subject.marks : '-'}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #ddd' }}>{subject.maxMarks}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #ddd' }}>
                              <span style={{ color: subject.grade !== 'Not Added' && subject.marks !== null ? '#10b981' : '#6b7280' }}>
                                {subject.grade || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                      Total: {exam.obtainedMarks} / {exam.totalMarks}
                    </p>
                    <p style={{ marginTop: '0.25rem', color: '#6b7280' }}>
                      Percentage: {exam.percentage?.toFixed(2)}% | Overall Grade: {exam.overallGrade}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return renderPersonalInfo();
      case 'fees':
        return renderFeeCatalog();
      case 'academic':
        return renderAcademicInfo();
      default:
        return renderPersonalInfo();
    }
  };

  return (
    <div className="student-detail-overlay">
      <div className="student-detail-modal">
        <div className="modal-header">
          <h2>Student Details - {student.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Info
          </button>
          <button
            className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`}
            onClick={async () => {
              setActiveTab('fees');
              // Refresh fee catalog when tab is opened
              try {
                console.log('Fee Catalog tab clicked, refreshing...');
                const updatedCatalog = await FeeService.getFeeCatalogByPan(student.id);
                setFeeCatalog(updatedCatalog);
                console.log('Fee catalog refreshed on tab click');
              } catch (err) {
                console.error('Failed to refresh fee catalog:', err);
              }
            }}
          >
            Fee Catalog
          </button>
          <button
            className={`tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
            onClick={() => setActiveTab('academic')}
          >
            Academic Info
          </button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              borderLeft: '4px solid #10b981',
              fontWeight: '500'
            }}>
              {success}
            </div>
          )}
          {renderContent()}
        </div>

        <div className="modal-footer">
          <div className="footer-buttons">
            {isEditing ? (
              <>
                <button 
                  type="button"
                  className="action-btn secondary" 
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="action-btn primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  className="action-btn secondary" 
                  onClick={onClose}
                >
                  Close
                </button>
                <button 
                  type="button"
                  className="action-btn"
                  onClick={handleEdit}
                >
                  Edit Student
                </button>
                <button 
                  type="button"
                  className="action-btn"
                  onClick={() => window.print()}
                >
                  Print Details
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailView; 