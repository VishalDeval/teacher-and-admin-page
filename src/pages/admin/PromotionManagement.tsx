import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import './PromotionManagement.css';

interface Session {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface Promotion {
  id: number;
  studentPan: string;
  studentName: string;
  fromClassName: string;
  toClassName: string | null;
  status: 'PENDING' | 'PROMOTED' | 'DETAINED' | 'GRADUATED';
  remarks: string;
  isGraduated: boolean;
}

const PromotionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fromSessionId, setFromSessionId] = useState<number | null>(null);
  const [toSessionId, setToSessionId] = useState<number | null>(null);
  const [pendingPromotions, setPendingPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (fromSessionId) {
      loadPendingPromotions();
    }
  }, [fromSessionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions');
      
      if (response.status >= 200 && response.status < 300) {
        const sessionList = response.data.data || [];
        setSessions(sessionList);
        
        // Auto-select active session as "from" session
        const activeSession = sessionList.find((s: Session) => s.active);
        if (activeSession) {
          setFromSessionId(activeSession.id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPromotions = async () => {
    if (!fromSessionId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Changed to fetch ALL promotions for the session, not just pending ones
      const response = await api.get(`/promotions/session/${fromSessionId}`);

      if (response.status >= 200 && response.status < 300) {
        setPendingPromotions(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePromotions = async () => {
    if (!fromSessionId || !toSessionId) {
      setError('Please select both source and target sessions');
      return;
    }

    if (fromSessionId === toSessionId) {
      setError('Source and target sessions must be different');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmExecutePromotions = async () => {
    setShowConfirmDialog(false);
    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      // Count pending promotions before execution
      const pendingCount = pendingPromotions.filter(p => p.status === 'PENDING').length;
      
      const response = await api.post('/promotions/execute', null, {
        params: {
          fromSessionId,
          toSessionId
        }
      });

      if (response.status >= 200 && response.status < 300) {
        setSuccess(
          `Successfully executed promotions! ${pendingCount} students processed.`
        );
        
        // Reload promotions to show updated statuses
        await loadPendingPromotions();
        
        // Clear target session selection
        setToSessionId(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to execute promotions';
      setError(errorMessage);
      console.error('Promotion execution error:', err);
    } finally {
      setExecuting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'PROMOTED':
        return 'status-promoted';
      case 'DETAINED':
        return 'status-detained';
      case 'GRADUATED':
        return 'status-graduated';
      default:
        return '';
    }
  };

  const getPromotionSummary = () => {
    // Filter only PENDING promotions for counts used in execution
    const pending = pendingPromotions.filter(p => p.status === 'PENDING');
    const promoted = pending.filter(p => p.toClassName && !p.isGraduated).length;
    const graduated = pending.filter(p => p.isGraduated).length;
    const detained = pending.filter(p => !p.toClassName && !p.isGraduated).length;

    return { 
      promoted, 
      graduated, 
      detained, 
      total: pending.length,
      // Also include executed counts for display
      totalAll: pendingPromotions.length,
      pendingCount: pending.length
    };
  };

  const summary = getPromotionSummary();

  return (
    <div className="promotion-management">
      <div className="promotion-header">
        <h2>Promotion Management</h2>
        <p>Execute student promotions to transition to a new academic session</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {error}
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
          <button className="alert-close" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="promotion-controls">
        <div className="control-group">
          <label>From Session (Current):</label>
          <select
            value={fromSessionId || ''}
            onChange={(e) => setFromSessionId(Number(e.target.value))}
            disabled={loading || executing}
          >
            <option value="">Select session...</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name} {session.active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="arrow-icon">→</div>

        <div className="control-group">
          <label>To Session (New):</label>
          <select
            value={toSessionId || ''}
            onChange={(e) => setToSessionId(Number(e.target.value))}
            disabled={loading || executing || !fromSessionId}
          >
            <option value="">Select session...</option>
            {sessions
              .filter(s => s.id !== fromSessionId)
              .map(session => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
          </select>
        </div>

        <button
          className="execute-btn"
          onClick={handleExecutePromotions}
          disabled={loading || executing || !fromSessionId || !toSessionId || summary.pendingCount === 0}
        >
          {executing ? 'Executing...' : `Execute ${summary.pendingCount} Pending Promotions`}
        </button>
      </div>

      {fromSessionId && summary.totalAll > 0 && (
        <div className="promotion-summary">
          <h3>Promotion Summary</h3>
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="card-icon">👥</div>
              <div className="card-content">
                <div className="card-value">{summary.pendingCount}</div>
                <div className="card-label">Pending Promotions</div>
              </div>
            </div>
            <div className="summary-card promoted">
              <div className="card-icon">⬆️</div>
              <div className="card-content">
                <div className="card-value">{summary.promoted}</div>
                <div className="card-label">To be Promoted</div>
              </div>
            </div>
            <div className="summary-card graduated">
              <div className="card-icon">🎓</div>
              <div className="card-content">
                <div className="card-value">{summary.graduated}</div>
                <div className="card-label">To be Graduated</div>
              </div>
            </div>
            <div className="summary-card detained">
              <div className="card-icon">⏸️</div>
              <div className="card-content">
                <div className="card-value">{summary.detained}</div>
                <div className="card-label">To be Detained</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading pending promotions...</p>
        </div>
      )}

      {!loading && pendingPromotions.length === 0 && fromSessionId && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Promotions Found</h3>
          <p>No promotion assignments have been made for this session yet.</p>
          <p className="hint">Teachers must assign promotions in their dashboard before you can execute them.</p>
        </div>
      )}

      {!loading && pendingPromotions.length > 0 && (
        <div className="promotions-table-container">
          <h3>Promotions for Session ({pendingPromotions.length} total)</h3>
          <div className="table-responsive">
            <table className="promotions-table">
              <thead>
                <tr>
                  <th>Student PAN</th>
                  <th>Student Name</th>
                  <th>Current Class</th>
                  <th>Promotion To</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {pendingPromotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td>{promotion.studentPan}</td>
                    <td>{promotion.studentName}</td>
                    <td>
                      <span className="class-badge">{promotion.fromClassName}</span>
                    </td>
                    <td>
                      {promotion.isGraduated ? (
                        <span className="promotion-badge graduated"> Graduated</span>
                      ) : promotion.toClassName ? (
                        <span className="promotion-badge promoted">
                          {promotion.toClassName}
                        </span>
                      ) : (
                        <span className="promotion-badge detained"> Detained</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(promotion.status)}`}>
                        {promotion.status}
                      </span>
                    </td>
                    <td className="remarks-cell">{promotion.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="modal-overlay">
          <div className="confirm-dialog">
            <h3>⚠️ Confirm Promotion Execution</h3>
            <p>
              You are about to execute promotions for <strong>{summary.total} students</strong>:
            </p>
            <ul className="confirm-list">
              <li>✅ {summary.promoted} students will be promoted to their assigned classes</li>
              <li>🎓 {summary.graduated} students will be marked as graduated</li>
              <li>⏸️ {summary.detained} students will be detained in their current class</li>
            </ul>
            <p className="warning-text">
              <strong>Warning:</strong> This action cannot be undone. Student records will be updated immediately.
            </p>
            <div className="dialog-actions">
              <button
                className="btn btn-cancel"
                onClick={() => setShowConfirmDialog(false)}
                disabled={executing}
              >
                Cancel
              </button>
              <button
                className="btn btn-confirm"
                onClick={confirmExecutePromotions}
                disabled={executing}
              >
                {executing ? 'Executing...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;
