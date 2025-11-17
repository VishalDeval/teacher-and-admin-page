import React, { useState, useEffect } from 'react';
import './GradeManagement.css';
import GradeDistributionService, { GradeDistributionDto } from '../../services/gradeDistributionService';

const GradeManagement: React.FC = () => {
    const [grades, setGrades] = useState<GradeDistributionDto[]>([]);
    const [defaultGrades, setDefaultGrades] = useState<GradeDistributionDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [isCustom, setIsCustom] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    useEffect(() => {
        loadGradeDistribution();
        loadDefaultGrades();
    }, []);

    const loadGradeDistribution = async () => {
        try {
            setLoading(true);
            const data = await GradeDistributionService.getGradeDistribution();
            setGrades(data);
            setError('');
        } catch (err: any) {
            setError('Failed to load grade distribution');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadDefaultGrades = async () => {
        try {
            const data = await GradeDistributionService.getDefaultGradeDistribution();
            setDefaultGrades(data);
        } catch (err: any) {
            console.error('Failed to load default grades:', err);
        }
    };

    const handleGradeChange = (index: number, field: keyof GradeDistributionDto, value: any) => {
        const updatedGrades = [...grades];
        updatedGrades[index] = {
            ...updatedGrades[index],
            [field]: value
        };
        setGrades(updatedGrades);
        setValidationErrors([]);
        setIsCustom(true);
    };

    const addGrade = () => {
        const newGrade: GradeDistributionDto = {
            grade: '',
            minPercentage: 0,
            maxPercentage: 0,
            description: ''
        };
        setGrades([...grades, newGrade]);
        setIsCustom(true);
    };

    const removeGrade = (index: number) => {
        const updatedGrades = grades.filter((_, i) => i !== index);
        setGrades(updatedGrades);
        setIsCustom(true);
    };

    const handleSave = async () => {
        // Validate first
        const validation = GradeDistributionService.validateGradeDistribution(grades);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            setError('Please fix validation errors before saving');
            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess('');
            setValidationErrors([]);
            
            await GradeDistributionService.setGradeDistribution(grades);
            setSuccess('Grade distribution saved successfully!');
            setIsCustom(false);
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save grade distribution');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefault = async () => {
        if (!window.confirm('Are you sure you want to reset to default grade distribution? This will delete any custom grades.')) {
            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess('');
            setValidationErrors([]);
            
            const data = await GradeDistributionService.resetToDefault();
            setGrades(data);
            setSuccess('Reset to default grade distribution successfully!');
            setIsCustom(false);
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset to default');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadDefault = () => {
        setGrades([...defaultGrades]);
        setIsCustom(true);
        setValidationErrors([]);
    };

    if (loading) {
        return (
            <div className="grade-management-container">
                <div className="grade-loading">Loading grade distribution...</div>
            </div>
        );
    }

    return (
        <div className="grade-management-container">
            <div className="grade-management-header">
                <h2>Grade Distribution Management</h2>
                <p className="grade-description">
                    Configure the grading system for your school. Define grade boundaries based on percentage scores.
                </p>
            </div>

            {error && (
                <div className="grade-alert grade-alert-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {success && (
                <div className="grade-alert grade-alert-success">
                    <strong>Success:</strong> {success}
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="grade-alert grade-alert-warning">
                    <strong>Validation Errors:</strong>
                    <ul>
                        {validationErrors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grade-actions">
                <button 
                    className="btn-grade btn-grade-primary" 
                    onClick={addGrade}
                    disabled={saving}
                >
                    + Add Grade
                </button>
                <button 
                    className="btn-grade btn-grade-secondary" 
                    onClick={handleLoadDefault}
                    disabled={saving}
                >
                    Load Default
                </button>
                <button 
                    className="btn-grade btn-grade-warning" 
                    onClick={handleResetToDefault}
                    disabled={saving}
                >
                    Reset to Default
                </button>
            </div>

            <div className="grade-table-container">
                <table className="grade-table">
                    <thead>
                        <tr>
                            <th>Grade</th>
                            <th>Min %</th>
                            <th>Max %</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grades.sort((a, b) => b.minPercentage - a.minPercentage).map((grade, index) => (
                            <tr key={index} className={grade.id ? '' : 'grade-row-new'}>
                                <td>
                                    <input
                                        type="text"
                                        className="grade-input grade-input-small"
                                        value={grade.grade}
                                        onChange={(e) => handleGradeChange(index, 'grade', e.target.value)}
                                        placeholder="e.g., A+"
                                        disabled={saving}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="grade-input grade-input-small"
                                        value={grade.minPercentage}
                                        onChange={(e) => handleGradeChange(index, 'minPercentage', parseFloat(e.target.value))}
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        disabled={saving}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="grade-input grade-input-small"
                                        value={grade.maxPercentage}
                                        onChange={(e) => handleGradeChange(index, 'maxPercentage', parseFloat(e.target.value))}
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        disabled={saving}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="grade-input"
                                        value={grade.description || ''}
                                        onChange={(e) => handleGradeChange(index, 'description', e.target.value)}
                                        placeholder="Optional description"
                                        disabled={saving}
                                    />
                                </td>
                                <td>
                                    <button
                                        className="btn-grade btn-grade-danger btn-grade-small"
                                        onClick={() => removeGrade(index)}
                                        disabled={saving}
                                        title="Remove grade"
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {grades.length === 0 && (
                            <tr>
                                <td colSpan={5} className="grade-table-empty">
                                    No grades configured. Click "Add Grade" or "Load Default" to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grade-preview">
                <h3>Grade Preview</h3>
                <div className="grade-preview-cards">
                    {grades
                        .sort((a, b) => b.minPercentage - a.minPercentage)
                        .map((grade, idx) => (
                            <div key={idx} className="grade-preview-card">
                                <div className="grade-preview-letter">{grade.grade}</div>
                                <div className="grade-preview-range">
                                    {grade.minPercentage}% - {grade.maxPercentage}%
                                </div>
                                {grade.description && (
                                    <div className="grade-preview-desc">{grade.description}</div>
                                )}
                            </div>
                        ))}
                </div>
            </div>

            <div className="grade-save-section">
                <button
                    className="btn-grade btn-grade-success btn-grade-large"
                    onClick={handleSave}
                    disabled={saving || !isCustom}
                >
                    {saving ? 'Saving...' : 'Save Grade Distribution'}
                </button>
                {!isCustom && grades.length > 0 && (
                    <p className="grade-save-hint">Make changes to enable save button</p>
                )}
            </div>

            <div className="grade-info-section">
                <h3>Important Information</h3>
                <ul className="grade-info-list">
                    <li>Grades must cover the full range from 0% to 100%</li>
                    <li>There should be no overlaps between grade ranges</li>
                    <li>There should be no gaps between grade ranges</li>
                    <li>Max percentage must be greater than min percentage for each grade</li>
                    <li>Changes will affect all future grade calculations</li>
                    <li>Existing student grades will not be recalculated automatically</li>
                </ul>
            </div>
        </div>
    );
};

export default GradeManagement;
