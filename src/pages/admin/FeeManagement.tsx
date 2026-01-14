import React, { useState, useEffect } from 'react';
import { FeeService, FeeCatalog, MonthlyFee, FeePaymentData } from '../../services/feeService';
import AdminService, { StudentResponse } from '../../services/adminService';
import './FeeManagement.css';

const FeeManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);
  const [feeCatalog, setFeeCatalog] = useState<FeeCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<MonthlyFee | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');

  useEffect(() => {
    loadStudents();

    // Reload students when window/tab regains focus
    const handleFocus = () => {
      console.log('Tab focused, reloading students...');
      loadStudents();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getAllStudents();
      // console.log('Loaded students:', data);
      setStudents(data);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (student: StudentResponse) => {
    setSelectedStudent(student);
    setSuccessMessage('');
    setErrorMessage('');
    setSelectedMonth(null);
    
    setLoading(true);
    try {
      const catalog = await FeeService.getFeeCatalogByPan(student.panNumber);
      setFeeCatalog(catalog);
    } catch (error: any) {
      setErrorMessage(error.message);
      setFeeCatalog(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFee = async () => {
    if (!selectedMonth || !selectedStudent) {
      setErrorMessage('Please select a month');
      return;
    }

    if (!selectedStudent.classId) {
      setErrorMessage('Cannot process payment: Student is not assigned to any class. Please assign the student to a class first.');
      return;
    }

    setPaymentLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const paymentData: FeePaymentData = {
        studentPanNumber: selectedStudent.panNumber,
        amount: selectedMonth.amount,
        month: selectedMonth.month,
        sessionId: selectedStudent.sessionId,
        classId: selectedStudent.classId,
        receiptNumber: receiptNumber.trim() || '' // Auto-generate if empty
      };

      const response = await FeeService.processFeePayment(paymentData);
      console.log('Payment response:', response);
      
      setSuccessMessage(`Fee payment for ${selectedMonth.month} processed successfully!`);
      
      // Reload fee catalog
      const updatedCatalog = await FeeService.getFeeCatalogByPan(selectedStudent.panNumber);
      setFeeCatalog(updatedCatalog);
      
      // Reset
      setSelectedMonth(null);
      setReceiptNumber('');
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = student.name?.toLowerCase().includes(searchLower);
    const panMatch = student.panNumber?.toLowerCase().includes(searchLower);
    const classMatch = student.className?.toLowerCase().includes(searchLower);
    return nameMatch || panMatch || classMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return '✓';
      case 'pending': return '⏳';
      case 'overdue': return '⚠';
      default: return '○';
    }
  };

  return (
    <div className="fee-management-container">
      <div className="fee-header">
        <h2>Fee Management</h2>
        <p>Manage student fee payments and view payment status</p>
      </div>

      <div className="fee-content">
        {/* Student Selection Panel */}
        <div className="student-selection-panel">
          <div className="student-search-wrapper">
            <input
              type="text"
              placeholder="Search students by name, PAN, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="student-search-input"
            />
            <button 
              className="refresh-button"
              onClick={loadStudents}
              disabled={loading}
              title="Refresh student list"
            >
              {loading ? '🔄' : '↻'}
            </button>
          </div>

          <div className="student-list">
            {loading && !selectedStudent ? (
              <div className="loading-state">Loading students...</div>
            ) : (
              filteredStudents.map(student => (
                <div
                  key={student.panNumber}
                  className={`student-item ${selectedStudent?.panNumber === student.panNumber ? 'selected' : ''}`}
                  onClick={() => handleStudentSelect(student)}
                >
                  <div className="student-info">
                    <div className="student-name">{student.name}</div>
                    <div className="student-details">
                      {student.className ? (
                        <>
                          Class: {student.className} | PAN: {student.panNumber}
                        </>
                      ) : (
                        <>
                          <span style={{color: '#ef4444', fontWeight: 600}}>⚠ Class: Not Assigned</span> | PAN: {student.panNumber}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fee Details Panel */}
        <div className="fee-details-panel">
          {!selectedStudent ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h3>Select a Student</h3>
              <p>Choose a student from the list to view and manage their fees</p>
            </div>
          ) : loading ? (
            <div className="loading-state">Loading fee details...</div>
          ) : feeCatalog ? (
            <>
              <div className="student-fee-header">
                <h3>{selectedStudent.name}</h3>
                <div className="student-meta">
                  <span>PAN: {selectedStudent.panNumber}</span>
                  {selectedStudent.className && (
                    <span>Class: {selectedStudent.className}</span>
                  )}
                  {selectedStudent.sessionName && (
                    <span>Session: {selectedStudent.sessionName}</span>
                  )}
                </div>
              </div>

              {/* Fee Summary */}
              <div className="fee-summary">
                <div className="summary-card">
                  <div className="summary-label">Total Amount</div>
                  <div className="summary-value">₹{feeCatalog.totalAmount.toFixed(2)}</div>
                </div>
                <div className="summary-card paid">
                  <div className="summary-label">Total Paid</div>
                  <div className="summary-value">₹{feeCatalog.totalPaid.toFixed(2)}</div>
                </div>
                <div className="summary-card pending">
                  <div className="summary-label">Total Pending</div>
                  <div className="summary-value">₹{feeCatalog.totalPending.toFixed(2)}</div>
                </div>
                <div className="summary-card overdue">
                  <div className="summary-label">Total Overdue</div>
                  <div className="summary-value">₹{feeCatalog.totalOverdue.toFixed(2)}</div>
                </div>
              </div>

              {/* Messages */}
              {successMessage && (
                <div className="success-message">
                  ✓ {successMessage}
                </div>
              )}
              {errorMessage && (
                <div className="error-message">
                  ✗ {errorMessage}
                </div>
              )}

              {/* Monthly Fees */}
              <div className="monthly-fees-section">
                <h4>Monthly Fee Details</h4>
                <div className="monthly-fees-grid">
                  {feeCatalog.monthlyFees.map((monthFee, index) => (
                    <div
                      key={index}
                      className={`fee-month-card ${monthFee.status} ${selectedMonth?.month === monthFee.month ? 'selected' : ''}`}
                      onClick={() => monthFee.status !== 'paid' && setSelectedMonth(monthFee)}
                    >
                      <div className="fee-month-header">
                        <span className="month-name">{monthFee.month}</span>
                        <span
                          className="fee-status-badge"
                          style={{ backgroundColor: getStatusColor(monthFee.status) }}
                        >
                          {getStatusIcon(monthFee.status)} {monthFee.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="fee-month-details">
                        <div className="fee-amount">₹{monthFee.amount.toFixed(2)}</div>
                        <div className="fee-due-date">Due: {new Date(monthFee.dueDate).toLocaleDateString()}</div>
                        {monthFee.paymentDate && (
                          <div className="fee-payment-date">
                            Paid: {new Date(monthFee.paymentDate).toLocaleDateString()}
                          </div>
                        )}
                        {monthFee.receiptNumber && (
                          <div className="fee-receipt">Receipt: {monthFee.receiptNumber}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Form */}
              {selectedMonth && (
                <div className="payment-form-section">
                  <h4>💳 Process Payment for {selectedMonth.month}</h4>
                  <div className="payment-form">
                    <div className="payment-details">
                      <div className="payment-info-row">
                        <span className="label">Amount:</span>
                        <span className="value">₹{selectedMonth.amount.toFixed(2)}</span>
                      </div>
                      <div className="payment-info-row">
                        <span className="label">Due Date:</span>
                        <span className="value">{new Date(selectedMonth.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="payment-info-row">
                        <span className="label">Status:</span>
                        <span
                          className="value"
                          style={{ color: getStatusColor(selectedMonth.status) }}
                        >
                          {selectedMonth.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Receipt Number (Optional - Auto-generated if empty)</label>
                      <input
                        type="text"
                        placeholder="Leave empty for auto-generation or enter custom (e.g., REC2024001)"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        className="receipt-input"
                      />
                    </div>

                    <div className="payment-actions">
                      <button
                        className="btn-cancel"
                        onClick={() => {
                          setSelectedMonth(null);
                          setReceiptNumber('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-pay"
                        onClick={handlePayFee}
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? 'Processing...' : 'Process Payment'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="error-state">
              <div className="error-icon">⚠</div>
              <h3>Unable to Load Fee Details</h3>
              <p>{errorMessage || 'No fee information available for this student'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeeManagement;
