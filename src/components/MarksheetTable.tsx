import React, { useMemo } from 'react';
import { StudentResultsDTO } from '../services/resultService';
import './MarksheetTable.css';

interface MarksheetTableProps {
  studentResults: StudentResultsDTO;
  onDownload: () => void;
}

interface MarksheetRow {
  subjectName: string;
  examMarks: { [examName: string]: { marks: number; maxMarks: number } };
  totalObtained: number;
  totalMax: number;
  percentage: number;
}

const MarksheetTable: React.FC<MarksheetTableProps> = ({ studentResults, onDownload }) => {
  // Transform exam-centric data to subject-centric data
  const marksheetData = useMemo(() => {
    const subjectMap = new Map<string, MarksheetRow>();

    // Collect all exams
    const exams = studentResults.examResults || [];

    // Build subject-wise data
    exams.forEach((exam) => {
      exam.subjectScores?.forEach((score) => {
        if (!subjectMap.has(score.subjectName)) {
          subjectMap.set(score.subjectName, {
            subjectName: score.subjectName,
            examMarks: {},
            totalObtained: 0,
            totalMax: 0,
            percentage: 0
          });
        }

        const subject = subjectMap.get(score.subjectName)!;
        subject.examMarks[exam.examName] = {
          marks: score.marks,
          maxMarks: score.maxMarks
        };
        subject.totalObtained += score.marks || 0;
        subject.totalMax += score.maxMarks || 0;
      });
    });

    // Calculate percentages
    subjectMap.forEach((subject) => {
      if (subject.totalMax > 0) {
        subject.percentage = (subject.totalObtained / subject.totalMax) * 100;
      }
    });

    return {
      exams: exams.map(e => e.examName),
      subjects: Array.from(subjectMap.values())
    };
  }, [studentResults]);

  // Calculate overall totals
  const overallTotals = useMemo(() => {
    const totals: { [examName: string]: { obtained: number; max: number } } = {};
    
    marksheetData.subjects.forEach((subject) => {
      Object.entries(subject.examMarks).forEach(([examName, marks]) => {
        if (!totals[examName]) {
          totals[examName] = { obtained: 0, max: 0 };
        }
        totals[examName].obtained += marks.marks || 0;
        totals[examName].max += marks.maxMarks || 0;
      });
    });

    return totals;
  }, [marksheetData]);

  const grandTotal = useMemo(() => {
    let obtained = 0;
    let max = 0;
    Object.values(overallTotals).forEach((total) => {
      obtained += total.obtained;
      max += total.max;
    });
    return { obtained, max, percentage: max > 0 ? (obtained / max) * 100 : 0 };
  }, [overallTotals]);

  return (
    <div className="marksheet-container">
      {/* Header Section */}
      <div className="marksheet-header">
        <div className="student-info">
          <h2>{studentResults.studentName}</h2>
          <p>Class: {studentResults.className}</p>
          <p>PAN: {studentResults.studentPanNumber}</p>
        </div>
        <button className="download-btn" onClick={onDownload}>
           Download Marksheet
        </button>
      </div>

      {/* Marksheet Table */}
      <div className="marksheet-table-wrapper">
        <table className="marksheet-table">
          <thead>
            <tr>
              <th className="subject-header" rowSpan={2}>Subject</th>
              {marksheetData.exams.map((examName, idx) => (
                <th key={idx} className="exam-header" colSpan={2}>
                  {examName}
                </th>
              ))}
              <th className="total-header" colSpan={2}>Total</th>
              <th className="percentage-header" rowSpan={2}>%</th>
            </tr>
            <tr className="subheader-row">
              {marksheetData.exams.map((_, idx) => (
                <React.Fragment key={idx}>
                  <th className="marks-subheader">Obt.</th>
                  <th className="marks-subheader">Max</th>
                </React.Fragment>
              ))}
              <th className="marks-subheader">Obt.</th>
              <th className="marks-subheader">Max</th>
            </tr>
          </thead>
          <tbody>
            {marksheetData.subjects.map((subject, idx) => (
              <tr key={idx} className="subject-row">
                <td className="subject-name">{subject.subjectName}</td>
                {marksheetData.exams.map((examName, examIdx) => {
                  const examMarks = subject.examMarks[examName];
                  return (
                    <React.Fragment key={examIdx}>
                      <td className="marks-cell">
                        {examMarks ? examMarks.marks ?? '-' : '-'}
                      </td>
                      <td className="marks-cell max-marks">
                        {examMarks ? examMarks.maxMarks : '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="marks-cell total-obtained">{subject.totalObtained}</td>
                <td className="marks-cell total-max">{subject.totalMax}</td>
                <td className="percentage-cell">
                  {subject.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td className="total-label">Overall Total</td>
              {marksheetData.exams.map((examName, idx) => {
                const total = overallTotals[examName];
                return (
                  <React.Fragment key={idx}>
                    <td className="total-marks">{total?.obtained ?? 0}</td>
                    <td className="total-marks">{total?.max ?? 0}</td>
                  </React.Fragment>
                );
              })}
              <td className="grand-total">{grandTotal.obtained}</td>
              <td className="grand-total">{grandTotal.max}</td>
              <td className="grand-percentage">{grandTotal.percentage.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MarksheetTable;
