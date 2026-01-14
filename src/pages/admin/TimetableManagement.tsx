import React, { useState, useEffect } from 'react';
import './TimetableManagement.css';
import TimetableService from '../../services/timetableService';
import { ClassService } from '../../services/classService';
import { TeacherService } from '../../services/teacherService';
import { SubjectService } from '../../services/subjectService';
import PeriodSettingsService, { PeriodSettings } from '../../services/periodSettingsService';

interface Teacher {
  id: number;
  name: string;
  email: string;
  contactNumber: string;
}

interface Subject {
  id: number;
  subjectName: string;
  teacherId: number;
  teacherName?: string;
}

interface Class {
  id: number;
  className: string;
  section: string;
  classTeacherId: number;
  classTeacherName?: string;
}

interface TimetableSlot {
  id?: number;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  roomNumber?: string;
}

const TimetableManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetableData, setTimetableData] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // For the slot editor modal
  const [showSlotEditor, setShowSlotEditor] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    day: string;
    period: number;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  
  // Global period settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [periodDuration, setPeriodDuration] = useState<number>(60); // in minutes
  const [schoolStartTime, setSchoolStartTime] = useState<string>('08:00');
  const [lunchPeriod, setLunchPeriod] = useState<number>(5); // after which period
  const [lunchDuration, setLunchDuration] = useState<number>(60); // in minutes
  const [savingSettings, setSavingSettings] = useState(false);

  const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  
  // Generate periods dynamically based on settings
  const generatePeriods = () => {
    const periods: any[] = [];
    let currentTime = schoolStartTime;
    
    for (let i = 1; i <= 8; i++) {
      // Add the period first
      const periodStart = currentTime;
      const periodEnd = addMinutesToTime(currentTime, periodDuration);
      periods.push({
        number: i,
        time: `${formatTime(periodStart)} - ${formatTime(periodEnd)}`,
        start: periodStart,
        end: periodEnd
      });
      currentTime = periodEnd;
      
      // Add lunch break AFTER the specified period
      if (i === lunchPeriod) {
        const lunchStart = currentTime;
        const lunchEnd = addMinutesToTime(currentTime, lunchDuration);
        periods.push({
          number: 0,
          time: `${formatTime(lunchStart)} - ${formatTime(lunchEnd)}`,
          start: lunchStart,
          end: lunchEnd,
          isLunch: true
        });
        currentTime = lunchEnd;
      }
    }
    
    return periods;
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const formatTime = (time: string): string => {
    const [hours, mins] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
  };

  const periods = generatePeriods();

  // Load period settings from database
  const loadPeriodSettings = async () => {
    try {
      const settings = await PeriodSettingsService.getPeriodSettings();
      setPeriodDuration(settings.periodDuration);
      setSchoolStartTime(settings.schoolStartTime);
      setLunchPeriod(settings.lunchPeriod);
      setLunchDuration(settings.lunchDuration);
      console.log('✅ Period settings loaded:', settings);
    } catch (err: any) {
      console.error('Error loading period settings:', err);
      // Keep default values if loading fails
      // Don't show error to user as defaults work fine
    }
  };

  // Save period settings to database
  const handleSavePeriodSettings = async () => {
    const settings: PeriodSettings = {
      periodDuration,
      schoolStartTime,
      lunchPeriod,
      lunchDuration
    };

    try {
      setSavingSettings(true);
      setError(null);
      
      await PeriodSettingsService.savePeriodSettings(settings);
      
      setSuccess('✅ Period settings saved successfully! All timetables will use these new timings.');
      setShowSettingsModal(false);
      
      // Reload timetable to reflect new period times
      if (selectedClass) {
        await loadTimetable();
      }
      
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save period settings');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSavingSettings(false);
    }
  };

  // Load classes on mount
  // Load period settings and classes on mount
  useEffect(() => {
    loadPeriodSettings();
    loadClasses();
  }, []);

  // Load teachers and subjects when class is selected
  useEffect(() => {
    if (selectedClass) {
      loadTeachersAndSubjects();
      loadTimetable();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await ClassService.getAllClasses();
      // Map the response to include section property
      const mappedClasses = (response || []).map((cls: any) => ({
        id: cls.id,
        className: cls.className,
        section: cls.section || 'A',
        classTeacherId: cls.classTeacherId,
        classTeacherName: cls.classTeacherName
      }));
      setClasses(mappedClasses);
    } catch (err: any) {
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachersAndSubjects = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const [teachersData, subjectsData] = await Promise.all([
        TeacherService.getAllTeachers(),
        SubjectService.getSubjectsByClass(selectedClass)
      ]);
      
      setTeachers(teachersData || []);
      setSubjects(subjectsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load teachers and subjects');
    } finally {
      setLoading(false);
    }
  };

  const loadTimetable = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const data = await TimetableService.getTimetableByClass(selectedClass);
      console.log('📅 Loaded timetable data:', data);
      console.log('📊 Total slots:', data?.length);
      setTimetableData(data || []);
    } catch (err: any) {
      console.error('Error loading timetable:', err);
      setTimetableData([]);
    } finally {
      setLoading(false);
    }
  };

  const getSlot = (day: string, period: number): TimetableSlot | undefined => {
    const slot = timetableData.find(slot => slot.day === day && slot.period === period);
    // if (slot) {
    //   console.log(`✅ Found slot for ${day} Period ${period}:`, slot);
    // }
    return slot;
  };

  const handleSlotClick = (day: string, period: number, periodInfo: any) => {
    if (periodInfo.isLunch) return;
    
    const existingSlot = getSlot(day, period);
    
    if (existingSlot) {
      setSelectedSubject(existingSlot.subjectId);
      setSelectedTeacher(existingSlot.teacherId);
      setRoomNumber(existingSlot.roomNumber || '');
      
      // FIXED: Use existing slot's actual times from database, not period settings
      setEditingSlot({
        day,
        period,
        startTime: existingSlot.startTime,
        endTime: existingSlot.endTime
      });
    } else {
      setSelectedSubject(null);
      setSelectedTeacher(null);
      setRoomNumber('');
      
      // For new slots, use period settings times
      setEditingSlot({
        day,
        period,
        startTime: periodInfo.start,
        endTime: periodInfo.end
      });
    }
    
    setShowSlotEditor(true);
  };

  const handleSaveSlot = async () => {
    if (!editingSlot || !selectedClass || !selectedSubject || !selectedTeacher) {
      setError('Please select both subject and teacher');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubject);
    const teacher = teachers.find(t => t.id === selectedTeacher);

    if (!subject || !teacher) {
      setError('Invalid subject or teacher selection');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const existingSlot = getSlot(editingSlot.day, editingSlot.period);
      
      const slotData = {
        classId: selectedClass,
        day: editingSlot.day,
        period: editingSlot.period,
        startTime: editingSlot.startTime,
        endTime: editingSlot.endTime,
        subjectId: selectedSubject,
        teacherId: selectedTeacher,
        roomNumber: roomNumber || null
      };

      if (existingSlot?.id) {
        // Update existing slot
        await TimetableService.updateTimetableEntry(existingSlot.id, slotData);
      } else {
        // Create new slot
        await TimetableService.createTimetableEntry(slotData);
      }

      setSuccess('Timetable slot saved successfully!');
      setShowSlotEditor(false);
      
      // Immediately reload timetable to show changes
      await loadTimetable();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save timetable slot');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (day: string, period: number) => {
    const slot = getSlot(day, period);
    if (!slot?.id) return;

    if (!window.confirm('Are you sure you want to delete this timetable slot?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await TimetableService.deleteTimetableEntry(slot.id);
      
      setSuccess('Timetable slot deleted successfully!');
      await loadTimetable();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete timetable slot');
    } finally {
      setSaving(false);
    }
  };

  const getSubjectColor = (subjectName: string): string => {
    const colors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
      '#10b981', '#06b6d4', '#f97316', '#6366f1'
    ];
    const hash = subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="timetable-management">
      <div className="timetable-header">
        <div>
          <h1>Timetable Management</h1>
          <p>Create and manage class schedules with an intuitive visual interface</p>
        </div>
        <button 
          className="btn-settings" 
          onClick={() => setShowSettingsModal(true)}
          title="Configure Period Duration"
        >
          Period Settings
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="notification error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {success && (
        <div className="notification success">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {/* Class Selection */}
      <div className="class-selector-card">
        <label htmlFor="class-select">
          <span className="label-icon"></span>
          Select Class to Manage Timetable
        </label>
        <select
          id="class-select"
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(Number(e.target.value))}
          className="class-select"
          disabled={loading}
        >
          <option value="">-- Choose a Class --</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.className}
            </option>
          ))}
        </select>
      </div>

      {/* Timetable Grid */}
      {selectedClass && !loading && (
        <div className="timetable-container">
          <div className="timetable-info">
            <div className="info-item">
              <span className="info-icon">📚</span>
              <span>{subjects.length} Subjects</span>
            </div>
            <div className="info-item">
              <span className="info-icon">👨‍🏫</span>
              <span>{teachers.length} Teachers</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🕐</span>
              <span>{timetableData.length} Slots Filled</span>
            </div>
          </div>

          <div className="timetable-grid-wrapper">
            <div className="timetable-instructions">
              <p>💡 <strong>Quick Guide:</strong> Click on any empty slot to assign a subject and teacher. 
              Click on filled slots to edit or delete them.</p>
            </div>

            <table className="timetable-grid">
              <thead>
                <tr>
                  <th className="day-header">Day / Period</th>
                  {periods.map((p, idx) => (
                    <th 
                      key={idx} 
                      className={`period-header ${p.isLunch ? 'lunch-header' : ''}`}
                    >
                      <div className="period-number">
                        {p.isLunch ? '🍽️ LUNCH' : `Period ${p.number}`}
                      </div>
                      <div className="period-time">{p.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map(day => (
                  <tr key={day}>
                    <td className="day-cell">{day}</td>
                    {periods.map((p, idx) => {
                      if (p.isLunch) {
                        return (
                          <td key={idx} className="lunch-cell">
                            <div className="lunch-indicator">LUNCH BREAK</div>
                          </td>
                        );
                      }

                      const slot = getSlot(day, p.number);
                      
                      return (
                        <td 
                          key={idx} 
                          className={`slot-cell ${slot ? 'filled' : 'empty'}`}
                          onClick={() => handleSlotClick(day, p.number, p)}
                        >
                          {slot ? (
                            <div 
                              className="slot-content"
                              style={{ borderLeft: `4px solid ${getSubjectColor(slot.subjectName)}` }}
                            >
                              <div className="slot-subject">{slot.subjectName}</div>
                              <div className="slot-teacher">👨‍🏫 {slot.teacherName}</div>
                              {slot.roomNumber && (
                                <div className="slot-room">🚪 Room {slot.roomNumber}</div>
                              )}
                              <button
                                className="delete-slot-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSlot(day, p.number);
                                }}
                                disabled={saving}
                              >
                                🗑️
                              </button>
                            </div>
                          ) : (
                            <div className="empty-slot">
                              <span>+ Add</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Period Settings</h2>
              <button className="close-btn" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="settings-info">
                <p>⚙️ Configure global period duration and school timings. These settings will apply to all classes and be saved automatically.</p>
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> School Start Time
                </label>
                <input
                  type="time"
                  value={schoolStartTime}
                  onChange={(e) => setSchoolStartTime(e.target.value)}
                  className="form-control"
                />
                <small>Time when first period begins</small>
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> Period Duration (minutes)
                </label>
                <select
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(Number(e.target.value))}
                  className="form-control"
                >
                  <option value="35">35 minutes</option>
                  <option value="40">40 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="50">50 minutes</option>
                  <option value="55">55 minutes</option>
                  <option value="60">1 hour (60 minutes)</option>
                  <option value="70">1 hour 10 minutes</option>
                  <option value="90">1.5 hours (90 minutes)</option>
                </select>
                <small>Duration of each class period</small>
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> Lunch Break After Period
                </label>
                <select
                  value={lunchPeriod}
                  onChange={(e) => setLunchPeriod(Number(e.target.value))}
                  className="form-control"
                >
                  <option value="3">After Period 3</option>
                  <option value="4">After Period 4</option>
                  <option value="5">After Period 5</option>
                  <option value="6">After Period 6</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> Lunch Duration (minutes)
                </label>
                <select
                  value={lunchDuration}
                  onChange={(e) => setLunchDuration(Number(e.target.value))}
                  className="form-control"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>

              <div className="settings-preview">
                <h4>📋 Preview</h4>
                <div className="preview-periods">
                  {generatePeriods().slice(0, 4).map((p, idx) => (
                    <div key={idx} className="preview-period">
                      <span className="preview-label">
                        {p.isLunch ? '🍽️ Lunch' : `Period ${p.number}`}
                      </span>
                      <span className="preview-time">{p.time}</span>
                    </div>
                  ))}
                  <div className="preview-more">... and more periods</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowSettingsModal(false)}
                disabled={savingSettings}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSavePeriodSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <>
                    <span className="spinner-small"></span>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Editor Modal */}
      {showSlotEditor && editingSlot && (
        <div className="modal-overlay" onClick={() => setShowSlotEditor(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {getSlot(editingSlot.day, editingSlot.period) ? '✏️ Edit' : '➕ Add'} Timetable Slot
              </h2>
              <button className="close-btn" onClick={() => setShowSlotEditor(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="slot-info">
                <div className="info-badge">
                  <strong>Day:</strong> {editingSlot.day}
                </div>
                <div className="info-badge">
                  <strong>Period:</strong> {editingSlot.period}
                </div>
                <div className="info-badge">
                  <strong>Time:</strong> {editingSlot.startTime} - {editingSlot.endTime}
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> Subject
                </label>
                <select
                  value={selectedSubject || ''}
                  onChange={(e) => setSelectedSubject(Number(e.target.value))}
                  className="form-control"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <span className="required">*</span> Teacher
                </label>
                <select
                  value={selectedTeacher || ''}
                  onChange={(e) => setSelectedTeacher(Number(e.target.value))}
                  className="form-control"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Room Number (Optional)</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="form-control"
                  placeholder="e.g., 101, Lab-A, etc."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowSlotEditor(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveSlot}
                disabled={saving || !selectedSubject || !selectedTeacher}
              >
                {saving ? 'Saving...' : 'Save Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableManagement;
