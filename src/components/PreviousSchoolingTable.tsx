import React from 'react';
import { PreviousSchoolingRecord } from '../services/previousSchoolingService';
import './PreviousSchoolingTable.css';

interface PreviousSchoolingTableProps {
  records: PreviousSchoolingRecord[];
}

const PreviousSchoolingTable: React.FC<PreviousSchoolingTableProps> = ({ records }) => {
  return (
    <div id="previous-schooling-container" className="previous-schooling-container">
      {/* Header Section */}
      <div id="previous-schooling-header" className="previous-schooling-header">
        <div className="header-info">
          <h2>📚 Academic History</h2>
          <p>Complete record of all previous sessions</p>
        </div>
      </div>

      {/* Previous Schooling Table */}
      <div id="previous-schooling-table-wrapper" className="previous-schooling-table-wrapper">
        <table id="previous-schooling-table" className="previous-schooling-table">
          <thead>
            <tr className="subheader-row">
              <th className="marks-subheader">Session</th>
              <th className="marks-subheader">Class</th>
              <th className="marks-subheader">Status</th>
              {/* <th className="marks-subheader">Passing Year</th> */}
              <th className="marks-subheader">Present</th>
              <th className="marks-subheader">Absent</th>
              <th className="marks-subheader">Attendance %</th>
              <th className="marks-subheader">Overall %</th>
              <th className="marks-subheader">Grade</th>
              <th className="marks-subheader">Details</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={idx} className="record-row">
                <td className="session-name">{record.sessionName}</td>
                <td className="class-info">
                  <span className="class-badge">
                    {record.className}-{record.section}
                  </span>
                </td>
                <td className="status-cell">
                  <span className={`status-badge status-${record.status.toLowerCase()}`}>
                    {record.status}
                  </span>
                </td>
                {/* <td className="passing-year">{record.passingYear}</td> */}
                <td className="attendance-cell">{record.totalPresent}</td>
                <td className="attendance-cell absent">{record.totalAbsent}</td>
                <td className="attendance-percentage">
                  {record.attendancePercentage.toFixed(1)}%
                </td>
                <td className="performance-percentage">
                  {record.overallPercentage.toFixed(1)}%
                </td>
                <td className="grade-cell">
                  <span className={`grade-badge grade-${record.overallGrade.replace('+', 'plus').toLowerCase()}`}>
                    {record.overallGrade}
                  </span>
                </td>
                <td className="exam-details-cell">
                  {record.examResults && record.examResults.length > 0 ? (
                    <details className="exam-details">
                      <summary className="exam-summary">
                        View {record.examResults.length} Exam{record.examResults.length > 1 ? 's' : ''}
                      </summary>
                      <div className="exam-list">
                        {record.examResults.map((exam, examIdx) => (
                          <div key={examIdx} className="exam-item">
                            <div className="exam-name">{exam.examName}</div>
                            <div className="exam-marks">
                              {exam.obtainedMarks}/{exam.totalMarks}
                            </div>
                            <div className="exam-performance">
                              <span className="exam-percentage">{exam.percentage.toFixed(1)}%</span>
                              <span className={`exam-grade grade-${exam.grade.replace('+', 'plus').toLowerCase()}`}>
                                {exam.grade}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <span className="no-exam">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div id="previous-schooling-summary" className="records-summary">
        <div className="summary-item">
          <span className="summary-label">Total Sessions:</span>
          <span className="summary-value">{records.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Average Performance:</span>
          <span className="summary-value">
            {records.length > 0
              ? (records.reduce((sum, r) => sum + r.overallPercentage, 0) / records.length).toFixed(1)
              : 0}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Average Attendance:</span>
          <span className="summary-value">
            {records.length > 0
              ? (records.reduce((sum, r) => sum + r.attendancePercentage, 0) / records.length).toFixed(1)
              : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviousSchoolingTable;
