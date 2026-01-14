import React, { useState, useEffect } from 'react';
import './TeacherDashboard.css';
import { 
  Teacher, 
  AssignedClass, 
  ClassStudent,
  TCApprovalRequest
} from '../../types/teacher';
import TeacherService from '../../services/teacherService';
import LeaveService, { StudentLeaveResponse, StaffLeaveResponse, LeaveAllowanceInfo } from '../../services/leaveService';
import QueryService, { StudentQueryResponse, TeacherQueryResponse } from '../../services/queryService';
import VideoLectureService, { VideoLecture } from '../../services/videoLectureService';
import MarkAttendance from './MarkAttendance';
import NotificationService, { NotificationDto } from '../../services/notificationService';
import { SessionService } from '../../services/sessionService';
import HolidayService, { Holiday } from '../../services/holidayService';
import PromotionAssignment from '../../components/PromotionAssignment';

interface TeacherDashboardProps {
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTCModal, setShowTCModal] = useState(false);
  const [selectedTCRequest, setSelectedTCRequest] = useState<TCApprovalRequest | null>(null);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<AssignedClass | null>(null);
  
  // State for data from database
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [studentCounts, setStudentCounts] = useState<{[classId: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [classTeacherClassIds, setClassTeacherClassIds] = useState<number[]>([]); // Store class IDs where teacher is class teacher

  // New states for queries and leaves
  const [studentQueries, setStudentQueries] = useState<StudentQueryResponse[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<StudentLeaveResponse[]>([]);
  const [myTeacherQueries, setMyTeacherQueries] = useState<TeacherQueryResponse[]>([]);
  const [myStaffLeaves, setMyStaffLeaves] = useState<StaffLeaveResponse[]>([]);
  const [leaveAllowance, setLeaveAllowance] = useState<LeaveAllowanceInfo | null>(null);
  
  // Form states for teacher's own queries and leave requests
  const [querySubject, setQuerySubject] = useState('');
  const [queryContent, setQueryContent] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [responseText, setResponseText] = useState<{[key: number]: string}>({});
  const [leaveResponseText, setLeaveResponseText] = useState<{[key: number]: string}>({});

  // Video Lecture states
  const [videoLectures, setVideoLectures] = useState<VideoLecture[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoLecture | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    youtubeLink: '',
    subject: '',
    className: '',
    section: '',
    duration: '',
    topic: ''
  });

  // @ts-ignore - Used for future feature
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  // @ts-ignore - Used for future feature
  const [sessionLoading, setSessionLoading] = useState(true);

  // Fetch active session
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        setSessionLoading(true);
        const session = await SessionService.getActiveSession();
        if (session && session.id) {
          setActiveSessionId(session.id);
        } else {
          console.warn('No active session found');
        }
      } catch (err) {
        console.error('Failed to fetch active session:', err);
      } finally {
        setSessionLoading(false);
      }
    };
    fetchActiveSession();
  }, []);

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const holidayData = await HolidayService.getAllHolidays();
        setHolidays(holidayData);
      } catch (err) {
        console.error('Error fetching holidays:', err);
      }
    };
    fetchHolidays();
  }, []);

  // Fetch student queries for teacher
  const fetchStudentQueries = async () => {
    try {
      const queries = await QueryService.getStudentQueriesForTeacher();
      setStudentQueries(queries);
    } catch (err: any) {
      console.error('Error fetching student queries:', err);
    }
  };

  // Fetch student leave requests for teacher
  const fetchStudentLeaves = async () => {
    try {
      const leaves = await LeaveService.getStudentLeavesForTeacher();
      setStudentLeaves(leaves);
    } catch (err: any) {
      console.error('Error fetching student leaves:', err);
    }
  };

  // Fetch teacher's own queries to admin
  const fetchMyTeacherQueries = async () => {
    try {
      const queries = await QueryService.getMyTeacherQueries();
      setMyTeacherQueries(queries);
    } catch (err: any) {
      console.error('Error fetching teacher queries:', err);
    }
  };

  // Fetch teacher's own leave requests
  const fetchMyStaffLeaves = async () => {
    try {
      const leaves = await LeaveService.getMyStaffLeaves();
      setMyStaffLeaves(leaves);
    } catch (err: any) {
      console.error('Error fetching staff leaves:', err);
    }
  };

  // Fetch leave allowance for current teacher
  const fetchLeaveAllowance = async () => {
    try {
      const allowance = await LeaveService.getMyLeaveAllowance();
      setLeaveAllowance(allowance);
    } catch (err: any) {
      console.error('Error fetching leave allowance:', err);
    }
  };

  // Handle teacher responding to student query
  const handleRespondToQuery = async (queryId: number) => {
    try {
      const response = responseText[queryId];
      if (!response || !response.trim()) {
        alert('Please enter a response');
        return;
      }
      await QueryService.respondToStudentQuery({ queryId, response });
      alert('Response sent successfully!');
      
      // Clear the response text to hide the form
      const newResponseText = { ...responseText };
      delete newResponseText[queryId];
      setResponseText(newResponseText);
      
      fetchStudentQueries();
    } catch (err: any) {
      alert('Failed to send response: ' + err.message);
    }
  };

  // Handle teacher approving/rejecting student leave
  const handleLeaveAction = async (leaveId: number, status: 'APPROVED' | 'REJECTED', responseMessage: string) => {
    try {
      await LeaveService.takeActionOnStudentLeave(leaveId, { status, responseMessage });
      alert(`Leave request ${status.toLowerCase()} successfully!`);
      
      // Clear the leave response text to hide the form
      const newLeaveResponseText = { ...leaveResponseText };
      delete newLeaveResponseText[leaveId];
      setLeaveResponseText(newLeaveResponseText);
      
      fetchStudentLeaves();
    } catch (err: any) {
      alert('Failed to process leave request: ' + err.message);
    }
  };

  // Handle teacher submitting own query to admin
  const handleSubmitTeacherQuery = async () => {
    try {
      if (!querySubject.trim() || !queryContent.trim()) {
        alert('Please fill in all fields');
        return;
      }
      await QueryService.raiseTeacherQuery({ subject: querySubject, content: queryContent });
      alert('Query sent to admin successfully!');
      setQuerySubject('');
      setQueryContent('');
      setShowQueryForm(false);
      fetchMyTeacherQueries();
    } catch (err: any) {
      alert('Failed to send query: ' + err.message);
    }
  };

  // Handle teacher submitting own leave request
  const handleSubmitStaffLeave = async () => {
    try {
      if (!leaveReason.trim() || !leaveStartDate || !leaveEndDate || !teacher?.id) {
        alert('Please fill in all fields');
        return;
      }

      // Calculate days requested
      const start = new Date(leaveStartDate);
      const end = new Date(leaveEndDate);
      const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Validate against remaining leaves (not total allowed)
      if (leaveAllowance && daysRequested > leaveAllowance.remainingLeaves) {
        alert(`You cannot request ${daysRequested} days of leave. You only have ${leaveAllowance.remainingLeaves} days remaining. (${leaveAllowance.leavesUsed} already used out of ${leaveAllowance.allowedLeaves} total)`);
        return;
      }

      await LeaveService.createStaffLeaveRequest({
        teacherId: parseInt(teacher.id),
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason
      });
      alert('Leave request submitted successfully!');
      setLeaveReason('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setShowLeaveForm(false);
      fetchMyStaffLeaves();
      fetchLeaveAllowance();
    } catch (err: any) {
      alert('Failed to submit leave request: ' + err.message);
    }
  };

  // Video Lecture Functions
  const fetchVideoLectures = async () => {
    try {
      if (teacher?.id) {
        const lectures = await VideoLectureService.getVideoLecturesByTeacher(parseInt(teacher.id));
        setVideoLectures(lectures);
      }
    } catch (err: any) {
      console.error('Error fetching video lectures:', err);
    }
  };

  const handleVideoFormChange = (field: string, value: string) => {
    setVideoForm({ ...videoForm, [field]: value });
  };

  const handleSubmitVideo = async () => {
    try {
      if (!videoForm.title || !videoForm.youtubeLink || !videoForm.subject || !videoForm.className || !videoForm.section || !teacher?.id) {
        alert('Please fill in all required fields (Title, YouTube Link, Subject, Class, Section)');
        return;
      }

      const videoData: VideoLecture = {
        ...videoForm,
        teacherId: parseInt(teacher.id),
        isActive: true
      };

      if (editingVideo && editingVideo.id) {
        await VideoLectureService.updateVideoLecture(editingVideo.id, videoData);
        alert('Video lecture updated successfully!');
      } else {
        await VideoLectureService.createVideoLecture(videoData);
        alert('Video lecture uploaded successfully!');
      }

      // Reset form
      setVideoForm({
        title: '',
        description: '',
        youtubeLink: '',
        subject: '',
        className: '',
        section: '',
        duration: '',
        topic: ''
      });
      setShowVideoForm(false);
      setEditingVideo(null);
      fetchVideoLectures();
    } catch (err: any) {
      alert('Failed to save video lecture: ' + err.message);
    }
  };

  const handleEditVideo = (video: VideoLecture) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      youtubeLink: video.youtubeLink,
      subject: video.subject,
      className: video.className,
      section: video.section,
      duration: video.duration || '',
      topic: video.topic || ''
    });
    setShowVideoForm(true);
  };

  const handleDeleteVideo = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this video lecture?')) {
      try {
        await VideoLectureService.deleteVideoLecture(id);
        alert('Video lecture deleted successfully!');
        fetchVideoLectures();
      } catch (err: any) {
        alert('Failed to delete video lecture: ' + err.message);
      }
    }
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const data = await NotificationService.getMyNotifications();
      setNotifications(data);
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await NotificationService.markAsRead(notificationId);
      await fetchNotifications(); // Refresh notifications
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      await fetchNotifications(); // Refresh notifications
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  };

  const mockTCApprovalRequests: TCApprovalRequest[] = [
    {
      id: 'tc001',
      studentId: '1',
      studentName: 'Rahul Kumar',
      studentClass: '10th',
      section: 'A',
      reason: 'Family relocation to another city',
      requestDate: '2024-01-15',
      adminMessage: 'Please review this transfer certificate request and provide your approval or rejection with remarks.',
      adminName: 'Principal',
      status: 'pending'
    },
    {
      id: 'tc002',
      studentId: '2',
      studentName: 'Priya Sharma',
      studentClass: '9th',
      section: 'B',
      reason: 'Transfer to another school',
      requestDate: '2024-01-14',
      adminMessage: 'Student has requested transfer due to academic reasons. Please evaluate and respond.',
      adminName: 'Principal',
      status: 'pending'
    }
  ];

  // Fetch data from database on component mount
  useEffect(() => {
    fetchTeacherData();
    fetchStudentQueries();
    fetchStudentLeaves();
    fetchMyTeacherQueries();
    fetchMyStaffLeaves();
    fetchLeaveAllowance();
  }, []);

  // Fetch video lectures when teacher data is loaded
  useEffect(() => {
    if (teacher?.id) {
      fetchVideoLectures();
    }
  }, [teacher]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch teacher profile
      const teacherData = await TeacherService.getCurrentTeacher();
      
      console.log('===== FETCHING CLASS TEACHER ASSIGNMENTS =====');
      console.log('Teacher ID:', teacherData.id);
      
      // Fetch classes where THIS teacher is the class teacher
      // We need to query the class_entity table where class_teacher_id = teacher.id
      try {
        const allClasses = await TeacherService.getAllClasses();
        console.log('All classes fetched:', allClasses);
        
        // Filter classes where this teacher is the class teacher
        const classTeacherClasses = allClasses.filter((cls: any) => {
          const isClassTeacher = cls.classTeacherId === teacherData.id;
          console.log(`Class ${cls.className} (ID: ${cls.id}) - classTeacherId: ${cls.classTeacherId}, teacher.id: ${teacherData.id}, match: ${isClassTeacher}`);
          return isClassTeacher;
        });
        
        console.log('Classes where teacher is class teacher:', classTeacherClasses);
        
        // Extract class IDs
        const classIds = classTeacherClasses.map((cls: any) => Number(cls.id));
        console.log('Extracted classTeacherClassIds:', classIds);
        setClassTeacherClassIds(classIds);
      } catch (classError) {
        console.error('Error fetching class teacher assignments:', classError);
        setClassTeacherClassIds([]);
      }
      
      console.log('==============================================');
      
      // Transform backend data to match frontend Teacher interface
      const transformedTeacher: Teacher = {
        id: teacherData.id?.toString() || '',
        name: teacherData.name || '',
        mobileNumber: teacherData.contactNumber || teacherData.mobileNumber || '',
        email: teacherData.email || '',
        qualification: teacherData.qualification || '',
        designation: teacherData.designation || 'Teacher',
        currentSchool: teacherData.currentSchool || 'SLMS School',
        profilePhoto: '👨‍🏫',
        personalInfo: {
          address: teacherData.address || '',
          emergencyContact: teacherData.emergencyContact || teacherData.contactNumber || '',
          bloodGroup: teacherData.bloodGroup || '',
          dateOfBirth: teacherData.dateOfBirth || '',
          joiningDate: teacherData.joiningDate || ''
        }
      };
      setTeacher(transformedTeacher);

      // Fetch assigned classes from timetable
      try {
        const timetableData = await TeacherService.getTeacherTimeTable();
        
        const transformedClasses: AssignedClass[] = timetableData.map((item: any) => {
          return {
            id: item.id?.toString() || '',
            classId: item.classId?.toString() || '', // Store actual class ID
            className: item.className || item.class?.name || '',
            section: item.section || item.class?.section || '',
            subject: item.subjectName || item.subject?.name || '',
            periodNumber: item.period || 0,
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            dayOfWeek: item.dayOfWeek || '',
            totalStudents: item.totalStudents || 0
          };
        });
        
        setAssignedClasses(transformedClasses);

        // Fetch student counts for all classes
        const counts: {[classId: string]: number} = {};
        for (const cls of transformedClasses) {
          if (cls.classId) {
            try {
              const students = await TeacherService.getStudentsByClass(parseInt(cls.classId));
              counts[cls.classId] = students.length;
              // console.log(`Class ${cls.className}-${cls.section} (ID: ${cls.classId}) has ${students.length} students`);
            } catch (err) {
              console.warn(`Failed to fetch students for class ${cls.classId}:`, err);
              counts[cls.classId] = 0;
            }
          }
        }
        setStudentCounts(counts);

        // Fetch students for the first class (if any)
        if (transformedClasses.length > 0 && transformedClasses[0].classId) {
          await fetchStudentsForClass(transformedClasses[0].classId);
        }
      } catch (timetableError: any) {
        console.warn('No timetable assigned to teacher yet:', timetableError.message);
        setAssignedClasses([]); // Set empty array if no timetable exists
      }

    } catch (err: any) {
      console.error('Error fetching teacher data:', err);
      setError(err.message || 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForClass = async (classId: string) => {
    if (!classId) {
      console.error('Cannot fetch students: classId is empty or undefined');
      setClassStudents([]);
      return;
    }
    
    try {
      const studentsData = await TeacherService.getStudentsByClass(parseInt(classId));
      
      const transformedStudents: ClassStudent[] = studentsData.map((student: any) => {
        return {
          id: student.panNumber || student.id?.toString() || '',
          name: student.name || 'N/A',
          parentName: student.parentName || student.guardianName || 'N/A',
          mobileNumber: student.mobileNumber || student.contactNumber || 'N/A',
          currentClass: student.currentClass || student.className || '',
          section: student.section || '',
          rollNumber: student.classRollNumber || 0,
          feeStatus: (student.feeStatus || 'PENDING').toLowerCase() as 'paid' | 'pending' | 'overdue',
          attendance: {
            present: student.attendancePresent || 0,
            absent: student.attendanceAbsent || 0,
            total: (student.attendancePresent || 0) + (student.attendanceAbsent || 0)
          },
          performance: {
            averageScore: student.averageScore || 0,
            grade: student.grade || 'N/A'
          }
        };
      });
      
      setClassStudents(transformedStudents);
    } catch (err: any) {
      console.error('Error fetching students for classId', classId, ':', err);
      // Set empty array if class not found or error occurs
      setClassStudents([]);
    }
  };

  const handleTCResponse = (tcId: string, response: 'approved' | 'rejected', remarks: string) => {
    const tcRequest = mockTCApprovalRequests.find(req => req.id === tcId);
    if (tcRequest) {
      tcRequest.status = response;
      tcRequest.teacherResponse = remarks;
      tcRequest.responseDate = new Date().toISOString();
    }
    setShowTCModal(false);
    setSelectedTCRequest(null);
  };

  const renderNotifications = () => (
    <div className={`notifications-panel ${showNotifications ? 'show' : ''}`}>
      <div className="notifications-header">
        <h3>Notifications ({unreadCount} unread)</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {unreadCount > 0 && (
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Mark All Read
            </button>
          )}
          <button 
            className="close-notifications"
            onClick={() => setShowNotifications(false)}
          >
            ×
          </button>
        </div>
      </div>
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            <span style={{ fontSize: '3rem' }}>No notifications</span>
            <p style={{ marginTop: '1rem' }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
              onClick={() => !notification.isRead && notification.id && markNotificationAsRead(notification.id)}
              style={{
                cursor: notification.isRead ? 'default' : 'pointer',
                background: notification.isRead ? '#f9fafb' : 'white',
                borderLeft: `4px solid ${
                  notification.priority === 'HIGH' ? '#ef4444' :
                  notification.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'
                }`
              }}
            >
              <div className="notification-icon">
                {notification.priority === 'HIGH' && '🔴'}
                {notification.priority === 'MEDIUM' && '🟡'}
                {notification.priority === 'LOW' && '🟢'}
              </div>
              <div className="notification-content">
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {notification.title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                  {notification.message}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="notification-time" style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'N/A'}
                  </span>
                  {notification.senderName && (
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      From: {notification.senderName}
                    </span>
                  )}
                </div>
              </div>
              {!notification.isRead && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  marginLeft: '1rem'
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderTCModal = () => (
    showTCModal && selectedTCRequest && (
      <div className="tc-modal-overlay">
        <div className="tc-modal">
          <div className="tc-modal-header">
            <h3>Transfer Certificate Approval</h3>
            <button 
              className="close-tc-modal"
              onClick={() => setShowTCModal(false)}
            >
              ×
            </button>
          </div>
          <div className="tc-modal-content">
            <div className="tc-student-info">
              <h4>Student Information</h4>
              <p><strong>Name:</strong> {selectedTCRequest.studentName}</p>
              <p><strong>Class:</strong> {selectedTCRequest.studentClass} - {selectedTCRequest.section}</p>
              <p><strong>Reason:</strong> {selectedTCRequest.reason}</p>
              <p><strong>Request Date:</strong> {selectedTCRequest.requestDate}</p>
            </div>
            
            <div className="admin-message">
              <h4>Admin Message</h4>
              <p><strong>From:</strong> {selectedTCRequest.adminName}</p>
              <p>{selectedTCRequest.adminMessage}</p>
            </div>

            {selectedTCRequest.status === 'pending' && (
              <div className="tc-response-form">
                <h4>Your Response</h4>
                <textarea 
                  placeholder="Add your remarks (optional)"
                  className="tc-remarks"
                  rows={3}
                />
                <div className="tc-actions">
                  <button 
                    className="action-btn approve"
                    onClick={() => handleTCResponse(selectedTCRequest.id, 'approved', 'Approved')}
                  >
                    Approve
                  </button>
                  <button 
                    className="action-btn reject"
                    onClick={() => handleTCResponse(selectedTCRequest.id, 'rejected', 'Rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {selectedTCRequest.status !== 'pending' && (
              <div className="tc-response-status">
                <h4>Your Response</h4>
                <p><strong>Status:</strong> 
                  <span className={`status-badge ${selectedTCRequest.status}`}>
                    {selectedTCRequest.status}
                  </span>
                </p>
                {selectedTCRequest.teacherResponse && (
                  <p><strong>Remarks:</strong> {selectedTCRequest.teacherResponse}</p>
                )}
                {selectedTCRequest.responseDate && (
                  <p><strong>Response Date:</strong> {selectedTCRequest.responseDate}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );

  const renderHome = () => {
    if (loading) return <div className="loading-message">Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!teacher) return <div className="error-message">No teacher data available</div>;

    return (
      <div className="home-section">
        <div className="teacher-profile" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '2.5rem',
          color: 'white',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
          marginBottom: '2rem'
        }}>
          <div className="profile-header" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            marginBottom: '2rem',
            paddingBottom: '2rem',
            borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div className="profile-photo" style={{
              fontSize: '5rem',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
            }}>
              {teacher.profilePhoto}
            </div>
            <div className="profile-info" style={{ flex: 1 }}>
              <h2 style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: '2.5rem', 
                fontWeight: '700',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                lineHeight: '1.2'
              }}>
                {teacher.name}
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  {teacher.designation}
                </span>
                {teacher.qualification && teacher.qualification !== 'N/A' && teacher.qualification.trim() !== '' && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.25)',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    {teacher.qualification}
                  </span>
                )}
                <span style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  {teacher.currentSchool}
                </span>
              </div>
            </div>
          </div>
          
          <div className="personal-info-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            <div className="info-item" style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '1.25rem',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'transform 0.2s, background 0.2s'
            }}>
              <label style={{ 
                fontSize: '0.85rem', 
                opacity: 0.7, 
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '400',
                letterSpacing: '0.5px',
                color: 'white'
              }}>EMAIL</label>
              <span style={{ 
                fontSize: '1rem', 
                fontWeight: '600',
                wordBreak: 'break-word',
              }}>{teacher.email}</span>
            </div>
            
            {teacher.mobileNumber && teacher.mobileNumber !== 'N/A' && teacher.mobileNumber.trim() !== '' && (
              <div className="info-item" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '1.25rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, background 0.2s'
              }}>
                <label style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '400',
                  letterSpacing: '0.5px',
                  color: 'white'
                }}>MOBILE NUMBER</label>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{teacher.mobileNumber}</span>
              </div>
            )}
            
            {teacher.personalInfo.address && teacher.personalInfo.address !== 'N/A' && teacher.personalInfo.address.trim() !== '' && (
              <div className="info-item" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '1.25rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, background 0.2s'
              }}>
                <label style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '400',
                  letterSpacing: '0.5px',
                  color: 'white'
                }}>ADDRESS</label>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{teacher.personalInfo.address}</span>
              </div>
            )}
            
            {teacher.personalInfo.emergencyContact && teacher.personalInfo.emergencyContact !== 'N/A' && teacher.personalInfo.emergencyContact.trim() !== '' && (
              <div className="info-item" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '1.25rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, background 0.2s'
              }}>
                <label style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '400',
                  letterSpacing: '0.5px',
                  color: 'white'
                }}>EMERGENCY CONTACT</label>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{teacher.personalInfo.emergencyContact}</span>
              </div>
            )}
            
            {teacher.personalInfo.bloodGroup && teacher.personalInfo.bloodGroup !== 'N/A' && teacher.personalInfo.bloodGroup.trim() !== '' && (
              <div className="info-item" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '1.25rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, background 0.2s'
              }}>
                <label style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '400',
                  letterSpacing: '0.5px'
                }}>🩸 BLOOD GROUP</label>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{teacher.personalInfo.bloodGroup}</span>
              </div>
            )}
            
            {teacher.personalInfo.dateOfBirth && teacher.personalInfo.dateOfBirth !== 'N/A' && teacher.personalInfo.dateOfBirth.trim() !== '' && (
              <div className="info-item" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '1.25rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, background 0.2s'
              }}>
                <label style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '400',
                  letterSpacing: '0.5px'
                }}>DATE OF BIRTH</label>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{teacher.personalInfo.dateOfBirth}</span>
              </div>
            )}
            
            {teacher.personalInfo.joiningDate && teacher.personalInfo.joiningDate !== 'N/A' && teacher.personalInfo.joiningDate.trim() !== '' && (
              <div className="info-item" style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '1.25rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, background 0.2s'
              }}>
                <label style={{ 
                  fontSize: '0.85rem', 
                  opacity: 0.7, 
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '400',
                  letterSpacing: '0.5px',
                  color: 'white'
                }}>JOINING DATE</label>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>{teacher.personalInfo.joiningDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>Total Classes</h3>
              <p className="stat-number">{assignedClasses.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Total Students</h3>
              <p className="stat-number">
                {Object.values(studentCounts).reduce((sum: number, count: number) => sum + count, 0)}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❓</div>
            <div className="stat-content">
              <h3>Pending Queries</h3>
              <p className="stat-number">{studentQueries.filter(q => q.status === 'OPEN').length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Leave Requests</h3>
              <p className="stat-number">{studentLeaves.filter(l => l.status === 'PENDING').length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAssignedClasses = () => {
    if (loading) return <div className="loading-message">Loading...</div>;
    
    // Get current day of week and date
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDate = new Date();
    const today = daysOfWeek[currentDate.getDay()];
    const todayDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check if today is a holiday
    const isTodayHoliday = holidays.some(holiday => {
      const startDate = holiday.startDate || holiday.date;
      const endDate = holiday.endDate || holiday.startDate || holiday.date;
      
      if (!startDate) return false;
      
      // Normalize dates to compare only date parts (no time)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
      
      const todayDate = new Date(todayDateString);
      todayDate.setHours(0, 0, 0, 0);
      
      return todayDate >= start && todayDate <= end;
    });
    
    // If today is a holiday, don't show any classes
    if (isTodayHoliday) {
      const todayHoliday = holidays.find(holiday => {
        const startDate = holiday.startDate || holiday.date;
        const endDate = holiday.endDate || holiday.startDate || holiday.date;
        if (!startDate) return false;
        
        // Normalize dates to compare only date parts (no time)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = endDate ? new Date(endDate) : new Date(startDate);
        end.setHours(23, 59, 59, 999);
        
        const todayDate = new Date(todayDateString);
        todayDate.setHours(0, 0, 0, 0);
        
        return todayDate >= start && todayDate <= end;
      });
      
      return (
        <div className="assigned-classes-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <h3 style={{ margin: 0 }}>Today's Classes ({today})</h3>
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Holiday
            </div>
          </div>
          
          <div className="no-data-message" style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            backgroundColor: '#fef3c7',
            borderRadius: '12px',
            border: '2px solid #fbbf24'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎊</div>
            <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}>
              Holiday Today!
            </p>
            <p style={{ fontSize: '1.1rem', color: '#78350f', fontWeight: '600', marginBottom: '0.5rem' }}>
              {todayHoliday?.occasion || todayHoliday?.title || 'Public Holiday'}
            </p>
            <p style={{ color: '#92400e' }}>No classes are scheduled today. Enjoy your day off!</p>
          </div>
        </div>
      );
    }
    
    // Filter classes for today only
    const todayClasses = assignedClasses.filter(cls => 
      cls.dayOfWeek?.toUpperCase() === today
    );
    
    return (
      <div className="assigned-classes-section">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0 }}>Today's Classes ({today})</h3>
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#eef1ff',
            color: '#3b82f6',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            {todayClasses.length} {todayClasses.length === 1 ? 'Class' : 'Classes'} Today
          </div>
        </div>

        {todayClasses.length === 0 ? (
          <div className="no-data-message" style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              No Classes Today!
            </p>
            <p style={{ color: '#6b7280' }}>You don't have any classes scheduled for {today}.</p>
          </div>
        ) : (
          <div className="classes-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginTop: '1rem'
          }}>
            {todayClasses.sort((a, b) => a.periodNumber - b.periodNumber).map((cls) => (
          <div key={cls.id} className="class-card" style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
          }}>
            <div className="class-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f3f4f6'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937', fontWeight: '600' }}>
                  {cls.className}
                </h4>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.25rem' }}>Section {cls.section}</div>
              </div>
              <span className="subject-badge" style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>{cls.subject}</span>
            </div>
            <div className="class-details" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Day</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f2937' }}>
                    {cls.dayOfWeek || 'Not Set'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Period</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f2937' }}>{cls.periodNumber}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Time</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f2937' }}>{cls.startTime} - {cls.endTime}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Students</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f2937' }}>{studentCounts[cls.classId] ?? cls.totalStudents ?? 0}</div>
                </div>
              </div>
            </div>
            <div className="class-actions" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <button 
                className="action-btn"
                style={{
                  padding: '0.6rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                onClick={async () => {
                  if (!cls.classId) {
                    alert('Class ID is missing. Please contact administrator.');
                    return;
                  }
                  
                  await fetchStudentsForClass(cls.classId);
                  setActiveTab('students');
                }}
              >
                 View Students
              </button>
              <button 
                className="action-btn"
                style={{
                  padding: '0.6rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                onClick={() => {
                  // Pre-fill video form with class information
                  setVideoForm({
                    title: '',
                    description: '',
                    youtubeLink: '',
                    subject: cls.subject || '',
                    className: cls.className || '',
                    section: cls.section || '',
                    duration: '',
                    topic: ''
                  });
                  setEditingVideo(null);
                  setShowVideoForm(true);
                  setActiveTab('lectures'); // Redirect to video lectures tab
                }}
              >
                 Upload Lecture
              </button>
            </div>
          </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQueries = () => (
    <div className="queries-section">
      {/* Section Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem', fontWeight: '700' }}>
            Student Queries
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Manage and respond to student questions
          </p>
        </div>
        <button 
          onClick={() => setShowQueryForm(!showQueryForm)}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            marginLeft:'10px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          {showQueryForm ? 'Cancel' : 'Query Admin'}
        </button>
      </div>

      {/* Form for teacher to send query to admin */}
      {showQueryForm && (
        <div style={{ 
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '2px solid #3b82f6'
        }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#1f2937', fontSize: '1.25rem', fontWeight: '600' }}>
            Send Query to Admin
          </h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600', 
              color: '#374151',
              fontSize: '0.95rem'
            }}>
              Subject <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text"
              value={querySubject}
              onChange={(e) => setQuerySubject(e.target.value)}
              placeholder="Enter query subject..."
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                border: '2px solid #e5e7eb',
                fontSize: '0.95rem',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600', 
              color: '#374151',
              fontSize: '0.95rem'
            }}>
              Question <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea 
              value={queryContent}
              onChange={(e) => setQueryContent(e.target.value)}
              placeholder="Describe your query in detail..."
              rows={5}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                border: '2px solid #e5e7eb',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <button 
            onClick={handleSubmitTeacherQuery}
            disabled={!querySubject.trim() || !queryContent.trim()}
            style={{ 
              backgroundColor: !querySubject.trim() || !queryContent.trim() ? '#9ca3af' : '#10b981',
              color: 'white', 
              padding: '0.75rem 2rem', 
              borderRadius: '8px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: !querySubject.trim() || !queryContent.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
            }}
          >
             Submit Query
          </button>
        </div>
      )}

      {/* Show teacher's own queries to admin */}
      {myTeacherQueries.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            marginBottom: '1rem', 
            color: '#1f2937',
            fontSize: '1.25rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}></span>
            My Queries to Admin ({myTeacherQueries.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myTeacherQueries.map((query) => (
              <div key={query.adminId} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${query.status === 'RESPONDED' ? '#10b981' : '#f59e0b'}`,
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
                      {query.subject}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                       Sent: {query.createdAt ? new Date(query.createdAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor: query.status === 'OPEN' ? '#fef3c7' : '#d1fae5',
                    color: query.status === 'OPEN' ? '#92400e' : '#065f46',
                    whiteSpace: 'nowrap'
                  }}>
                    {query.status === 'OPEN' ? 'Pending' : 'Responded'}
                  </span>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '6px',
                  marginBottom: query.response ? '1rem' : 0
                }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#374151', lineHeight: '1.6' }}>
                    {query.content}
                  </p>
                </div>

                {query.response && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    backgroundColor: '#ecfdf5', 
                    borderRadius: '6px',
                    borderLeft: '3px solid #10b981'
                  }}>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#065f46', fontSize: '0.9rem' }}>
                      Admin's Response:
                    </p>
                    <p style={{ margin: 0, color: '#047857', lineHeight: '1.6' }}>
                      {query.response}
                    </p>
                    {query.respondedAt && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#059669' }}>
                        {new Date(query.respondedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student queries list */}
      <div>
        <h3 style={{ 
          marginBottom: '1rem', 
          color: '#1f2937',
          fontSize: '1.25rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}></span>
          Queries from Students ({studentQueries.length})
        </h3>

        {studentQueries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px dashed #d1d5db'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <p style={{ margin: 0, fontSize: '1.1rem', color: '#6b7280' }}>
              No student queries yet
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#9ca3af' }}>
              Student questions will appear here
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {studentQueries.map((query) => (
              <div key={query.teacherId} style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${query.status === 'RESPONDED' ? '#10b981' : '#3b82f6'}`,
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
                      {query.subject}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                      {query.studentName || 'Student'} •  {query.createdAt ? new Date(query.createdAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor: query.status === 'OPEN' ? '#dbeafe' : '#d1fae5',
                    color: query.status === 'OPEN' ? '#1e40af' : '#065f46',
                    whiteSpace: 'nowrap'
                  }}>
                    {query.status === 'OPEN' ? 'Open' : 'Replied'}
                  </span>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                     Question:
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#374151', lineHeight: '1.6' }}>
                    {query.content}
                  </p>
                </div>

                {query.response && (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: '#ecfdf5', 
                    borderRadius: '6px',
                    borderLeft: '3px solid #10b981',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#065f46', fontSize: '0.9rem' }}>
                      Your Reply:
                    </p>
                    <p style={{ margin: 0, color: '#047857', lineHeight: '1.6' }}>
                      {query.response}
                    </p>
                    {query.respondedAt && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#059669' }}>
                        {new Date(query.respondedAt).toLocaleString()}
                      </p>
                    )}
                    {query.status !== 'CLOSED' && (
                      <button
                        onClick={() => {
                          console.log('Editing response for query:', query);
                          setResponseText({ ...responseText, [query.id]: query.response || '' });
                        }}
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem 1rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}
                      >
                        Edit Response
                      </button>
                    )}
                  </div>
                )}

                {((query.status === 'OPEN' && !query.response) || (query.response && responseText[query.id])) && query.status !== 'CLOSED' && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.75rem', 
                      fontWeight: '600',
                      color: '#1f2937',
                      fontSize: '0.95rem'
                    }}>
                      {query.response && responseText[query.id] ? 'Edit Your Response:' : 'Your Response:'}
                    </label>
                    <textarea
                      value={responseText[query.id] || ''}
                      onChange={(e) => {
                        setResponseText({ ...responseText, [query.id]: e.target.value });
                      }}
                      placeholder="Type your response to the student..."
                      rows={4}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        border: '2px solid #e2e8f0',
                        marginBottom: '1rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'border-color 0.2s',
                        pointerEvents: 'auto',
                        userSelect: 'text',
                        cursor: 'text',
                        zIndex: 1,
                        position: 'relative'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => {
                          if (responseText[query.id]?.trim()) {
                            handleRespondToQuery(query.id);
                          }
                        }}
                        disabled={!responseText[query.id]?.trim()}
                        style={{ 
                          backgroundColor: !responseText[query.id]?.trim() ? '#d1d5db' : '#10b981',
                          color: 'white', 
                          padding: '0.75rem 1.5rem', 
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          cursor: !responseText[query.id]?.trim() ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: !responseText[query.id]?.trim() ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          if (responseText[query.id]?.trim()) {
                            e.currentTarget.style.backgroundColor = '#059669';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (responseText[query.id]?.trim()) {
                            e.currentTarget.style.backgroundColor = '#10b981';
                          }
                        }}
                      >
                        {query.response && responseText[query.id] ? 'Update Reply' : 'Send Reply'}
                      </button>
                      {query.response && responseText[query.id] && (
                        <button
                          onClick={() => {
                            setResponseText({ ...responseText, [query.id]: '' });
                          }}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>  
    </div>
  );

  const renderVideoLectures = () => (
    <div className="video-lectures-section">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0 }}>Video Lectures</h3>
        <button 
          className="action-btn upload-btn"
          onClick={() => {
            setEditingVideo(null);
            setVideoForm({
              title: '',
              description: '',
              youtubeLink: '',
              subject: '',
              className: '',
              section: '',
              duration: '',
              topic: ''
            });
            setShowVideoForm(!showVideoForm);
          }}
          style={{
            backgroundColor: showVideoForm ? '#ef4444' : '#10b981',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {showVideoForm ? '✕ Cancel' : '+ Upload New Lecture'}
        </button>
      </div>

      {/* Video Upload Form */}
      {showVideoForm && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ marginTop: 0, color: '#1f2937' }}>
            {editingVideo ? 'Edit Video Lecture' : 'Upload New Video Lecture'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Title *
              </label>
              <input
                type="text"
                value={videoForm.title}
                onChange={(e) => handleVideoFormChange('title', e.target.value)}
                placeholder="e.g., Introduction to Quadratic Equations"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                YouTube Link *
              </label>
              <input
                type="url"
                value={videoForm.youtubeLink}
                onChange={(e) => handleVideoFormChange('youtubeLink', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Subject *
              </label>
              <input
                type="text"
                value={videoForm.subject}
                onChange={(e) => handleVideoFormChange('subject', e.target.value)}
                placeholder="e.g., Mathematics"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            {/* <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Topic
              </label>
              <input
                type="text"
                value={videoForm.topic}
                onChange={(e) => handleVideoFormChange('topic', e.target.value)}
                placeholder="e.g., Algebra - Quadratic Formulas"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div> */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Class *
              </label>
              <input
                type="text"
                value={videoForm.className}
                onChange={(e) => handleVideoFormChange('className', e.target.value)}
                placeholder="e.g., 9th"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Section *
              </label>
              <input
                type="text"
                value={videoForm.section}
                onChange={(e) => handleVideoFormChange('section', e.target.value)}
                placeholder="e.g., A"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            {/* <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Duration
              </label>
              <input
                type="text"
                value={videoForm.duration}
                onChange={(e) => handleVideoFormChange('duration', e.target.value)}
                placeholder="e.g., 45:30 or 1h 15m"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem'
                }}
              />
            </div> */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Description
              </label>
              <textarea
                value={videoForm.description}
                onChange={(e) => handleVideoFormChange('description', e.target.value)}
                placeholder="Brief description of the video lecture content..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={handleSubmitVideo}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {editingVideo ? '💾 Update Lecture' : '📤 Upload Lecture'}
            </button>
            <button
              onClick={() => {
                setShowVideoForm(false);
                setEditingVideo(null);
              }}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Video Lectures Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</div>
      ) : videoLectures.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
          <p style={{ color: '#6b7280', margin: 0 }}>No video lectures uploaded yet.</p>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Click "Upload New Lecture" to add your first video.
          </p>
        </div>
      ) : (
        <div className="lectures-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {videoLectures.map((lecture) => {
            const thumbnailUrl = VideoLectureService.getYouTubeThumbnail(lecture.youtubeLink);
            
            return (
              <div key={lecture.id} className="lecture-card" style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}>
                {/* Thumbnail */}
                <div style={{ position: 'relative', paddingBottom: '56.25%', backgroundColor: '#000' }}>
                  <img 
                    src={thumbnailUrl} 
                    alt={lecture.title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    ▶️
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937', fontSize: '1.1rem' }}>
                    {lecture.title}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {lecture.className} - {lecture.section}
                    </span>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {lecture.subject}
                    </span>
                  </div>
                  {lecture.topic && (
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.5rem 0' }}>
                      📚 {lecture.topic}
                    </p>
                  )}
                  {lecture.description && (
                    <p style={{ 
                      fontSize: '0.9rem', 
                      color: '#4b5563', 
                      margin: '0.5rem 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {lecture.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                    {lecture.duration && <span>⏱️ {lecture.duration}</span>}
                    {lecture.uploadedAt && (
                      <span>📅 {new Date(lecture.uploadedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ 
                  padding: '1rem',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <button
                    onClick={() => window.open(lecture.youtubeLink, '_blank')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Watch
                  </button>
                  <button
                    onClick={() => handleEditVideo(lecture)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => lecture.id && handleDeleteVideo(lecture.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLeaveRequests = () => {
    if (loading) return <div className="loading-message">Loading leave requests...</div>;
    
    return (
      <div className="leave-requests-section">
        {/* Leave Allowance Summary */}
        {leaveAllowance && (
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>Your Leave Allowance</h3>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>
                Session: <strong>{leaveAllowance.sessionName || 'Current Session'}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {leaveAllowance.allowedLeaves}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total Allowed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {leaveAllowance.leavesUsed}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Leaves Taken</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {leaveAllowance.remainingLeaves}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Remaining</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Student Leave Requests</h3>
          <button 
            className="action-btn"
            onClick={() => setShowLeaveForm(!showLeaveForm)}
            style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px' }}
          >
            {showLeaveForm ? 'Cancel' : '+ Request My Leave'}
          </button>
        </div>

        {/* Form for teacher to submit own leave request */}
        {showLeaveForm && (
          <div style={{ 
            border: '2px solid #3b82f6', 
            borderRadius: '8px', 
            padding: '1.5rem', 
            marginBottom: '1.5rem',
            backgroundColor: '#f0f9ff'
          }}>
            <h4 style={{ marginBottom: '1rem' }}>Request Leave</h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reason</label>
              <input 
                type="text"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g., Medical, Personal, Family"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Date</label>
                <input 
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>End Date</label>
                <input 
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  min={leaveStartDate}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            {/* Show days requested calculation */}
            {leaveStartDate && leaveEndDate && (() => {
              const start = new Date(leaveStartDate);
              const end = new Date(leaveEndDate);
              const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const canRequest = !leaveAllowance || daysRequested <= leaveAllowance.remainingLeaves;
              return (
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '0.75rem', 
                  backgroundColor: canRequest ? '#d1fae5' : '#fee2e2', 
                  borderRadius: '6px',
                  border: `2px solid ${canRequest ? '#10b981' : '#ef4444'}`
                }}>
                  <div style={{ fontWeight: '500', color: canRequest ? '#065f46' : '#991b1b' }}>
                    Days Requested: <strong>{daysRequested}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: canRequest ? '#047857' : '#b91c1c', marginTop: '0.25rem' }}>
                    {canRequest 
                      ? `✅ You have ${leaveAllowance?.remainingLeaves || 0} days remaining`
                      : `❌ Insufficient balance! You only have ${leaveAllowance?.remainingLeaves || 0} days remaining`
                    }
                  </div>
                </div>
              );
            })()}
            <button 
              className="action-btn"
              onClick={handleSubmitStaffLeave}
              style={{ backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '6px' }}
            >
              Submit Leave Request
            </button>
          </div>
        )}

        {/* Show teacher's own leave requests */}
        {myStaffLeaves.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: '#3b82f6' }}>My Leave Requests</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myStaffLeaves.map((leave) => (
                <div key={leave.id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: leave.status === 'APPROVED' ? '#f0fdf4' : leave.status === 'REJECTED' ? '#fef2f2' : '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{leave.reason}</strong>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      backgroundColor: leave.status === 'PENDING' ? '#fef3c7' : leave.status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
                      color: leave.status === 'PENDING' ? '#92400e' : leave.status === 'APPROVED' ? '#065f46' : '#991b1b'
                    }}>
                      {leave.status}
                    </span>
                  </div>
                  <p><strong>Duration:</strong> {leave.startDate} to {leave.endDate} ({leave.daysRequested} days)</p>
                  {leave.adminResponse && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                      <p><strong>Admin's Response:</strong></p>
                      <p style={{ marginTop: '0.25rem' }}>{leave.adminResponse}</p>
                    </div>
                  )}
                  {leave.processedBy && (
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      Processed by: {leave.processedBy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student leave requests */}
        <h4 style={{ marginBottom: '1rem' }}>Leave Requests from Students</h4>
        {studentLeaves.length === 0 ? (
          <div className="no-data-message">No student leave requests yet.</div>
        ) : (
          <div className="leave-requests-list">
            {studentLeaves.map((request) => (
          <div key={request.id} className={`leave-request-card ${request.status?.toLowerCase()}`} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: request.status === 'APPROVED' ? '#f0fdf4' : request.status === 'REJECTED' ? '#fef2f2' : '#fff'
          }}>
            <div className="leave-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0 }}>{request.studentName || 'Student'}</h4>
              <span className={`status-badge ${request.status?.toLowerCase()}`} style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                backgroundColor: request.status === 'PENDING' ? '#fef3c7' : request.status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
                color: request.status === 'PENDING' ? '#92400e' : request.status === 'APPROVED' ? '#065f46' : '#991b1b'
              }}>
                {request.status}
              </span>
            </div>
            <div className="leave-details">
              <p><strong>Reason:</strong> {request.reason}</p>
              <p><strong>Duration:</strong> {request.startDate} to {request.endDate} ({request.daysRequested} days)</p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Submitted: {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'N/A'}
              </p>
              {request.proofImage && (
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Proof Image:</strong></p>
                  <a href={request.proofImage} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={request.proofImage} 
                      alt="Leave Proof" 
                      style={{ 
                        maxWidth: '300px', 
                        maxHeight: '300px', 
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        marginTop: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }} 
                      title="Click to view full size"
                    />
                  </a>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Click image to view full size
                  </p>
                </div>
              )}
            </div>
            {request.classTeacherResponse && (
              <div className="teacher-remarks" style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '6px' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '0.5rem' 
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Your Response:</p>
                  <button 
                    onClick={() => {
                      // Set leave as being edited
                      setLeaveResponseText({ ...leaveResponseText, [request.id]: request.classTeacherResponse || '' });
                    }}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Edit
                  </button>
                </div>
                <p style={{ margin: 0 }}>{request.classTeacherResponse}</p>
              </div>
            )}
            <div className="leave-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              {(request.status === 'PENDING' || leaveResponseText[request.id] !== undefined) && (
                <>
                  <input
                    type="text"
                    placeholder="Add remarks (optional)"
                    value={leaveResponseText[request.id] || ''}
                    onChange={(e) => setLeaveResponseText({ ...leaveResponseText, [request.id]: e.target.value })}
                    style={{ 
                      flex: 1, 
                      padding: '0.5rem', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd' 
                    }}
                  />
                  <button 
                    className="action-btn approve"
                    onClick={() => handleLeaveAction(request.id, 'APPROVED', leaveResponseText[request.id] || 'Approved')}
                    style={{ 
                      backgroundColor: '#10b981', 
                      color: 'white', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '6px' 
                    }}
                  >
                    Approve
                  </button>
                  <button 
                    className="action-btn reject"
                    onClick={() => handleLeaveAction(request.id, 'REJECTED', leaveResponseText[request.id] || 'Rejected')}
                    style={{ 
                      backgroundColor: '#ef4444', 
                      color: 'white', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '6px' 
                    }}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
        )}
      </div>
    );
  };


  const renderStudentInfo = () => {
    const handleClassChange = async (classValue: string) => {
      console.log('Class dropdown changed to:', classValue);
      setSelectedClass(classValue);
      
      if (classValue) {
        // Find the selected class
        const selectedClassData = assignedClasses.find(cls => `${cls.className}-${cls.section}` === classValue);
        console.log('Selected class data:', selectedClassData);
        
        if (selectedClassData && selectedClassData.classId) {
          console.log('Fetching students for selected class, classId:', selectedClassData.classId);
          await fetchStudentsForClass(selectedClassData.classId);
        } else {
          console.error('Selected class has no classId:', selectedClassData);
          alert('Unable to load students. Class ID is missing.');
        }
      } else {
        // Clear students if no class selected
        setClassStudents([]);
      }
    };

    return (
      <div className="student-info-section">
        <h3>Student Information</h3>
        {assignedClasses.length === 0 ? (
          <div className="no-data-message">
            <p>No classes assigned yet. Please contact the administrator.</p>
          </div>
        ) : (
          <>
            <div className="class-selector">
              <select 
                value={selectedClass} 
                onChange={(e) => handleClassChange(e.target.value)}
                className="class-select"
              >
                <option value="">Select Class</option>
                {Array.from(new Set(assignedClasses.map(cls => `${cls.className}-${cls.section}`))).map((className: string) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
            
            {selectedClass && (
          <div className="students-table">
            {loading ? (
              <div className="loading-message">Loading students...</div>
            ) : classStudents.length === 0 ? (
              <div className="no-data-message">No students found for this class.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>PAN Number</th>
                    <th>Name</th>
                    <th>Parent Name</th>
                    <th>Mobile</th>
                    <th>Class</th>
                    <th>Fee Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
                        No students found in this class
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.rollNumber || 'N/A'}</td>
                        <td>{student.id}</td>
                        <td>{student.name}</td>
                        <td>{student.parentName}</td>
                        <td>{student.mobileNumber}</td>
                        <td>{student.currentClass}-{student.section}</td>
                        <td>
                          <span className={`status-badge ${student.feeStatus}`}>
                            {student.feeStatus.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button className="action-btn" onClick={() => {
                            console.log('View details for student:', student);
                            alert(`Student Details:\n\nName: ${student.name}\nPAN: ${student.id}\nParent: ${student.parentName}\nMobile: ${student.mobileNumber}\nClass: ${student.currentClass}-${student.section}\nRoll No: ${student.rollNumber || 'N/A'}\nFee Status: ${student.feeStatus}`);
                          }}>View Details</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
          </>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    // Filter assigned classes to only show classes where teacher is class teacher
    // classTeacherClassIds contains the IDs from backend (where teacher is class teacher)
    const uniqueClassIds = new Set<string>();
    const allUniqueClasses = assignedClasses.filter((cls) => {
      console.log('Processing class for uniqueness:', cls.classId, cls.className);
      // Only include each classId once
      if (!uniqueClassIds.has(cls.classId)) {
        uniqueClassIds.add(cls.classId);
        return true;
      }
      return false;
    });

    console.log('===== ATTENDANCE FILTERING DEBUG =====');
    console.log('allUniqueClasses:', allUniqueClasses.map(c => ({ id: c.classId, name: c.className })));
    console.log('classTeacherClassIds array:', classTeacherClassIds);
    console.log('classTeacherClassIds type:', typeof classTeacherClassIds);
    
    // Filter to only show classes where teacher is class teacher
    const classTeacherClasses = allUniqueClasses.filter(cls => {
      const classId = parseInt(cls.classId);
      const isIncluded = classTeacherClassIds.includes(classId);
      console.log("isIncluded check:", { classId, isIncluded });
      // console.log(`Class ${cls.classId} (${cls.className}) - parsed: ${classId}, included: ${isIncluded}`);
      return isIncluded;
    });
    
    console.log('Filtered classTeacherClasses:', classTeacherClasses.map(c => ({ id: c.classId, name: c.className })));
    console.log('======================================');

    if (classTeacherClasses.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No Class Teacher Assignment</h3>
          <p style={{ color: '#94a3b8' }}>
            This tab is only available for class teachers. If you are a class teacher, please contact the administrator.
          </p>
        </div>
      );
    }

    return (
      <div className="attendance-section">
        <div style={{ 
          marginBottom: '2rem',
          width:'100%',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem', fontWeight: '700' }}>
              Class Attendance
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
              Mark attendance for your assigned class
            </p>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.5rem',
          width:'100%',
        }}>
          {classTeacherClasses.map((cls) => (
            <div 
              key={cls.classId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                border: '2px solid transparent',
                width:'100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.25rem', 
                    color: '#1f2937',
                    fontWeight: '600'
                  }}>
                    {cls.className} - {cls.section}
                  </h3>
                  <p style={{ 
                    margin: '0.5rem 0 0', 
                    color: '#6b7280',
                    fontSize: '0.9rem'
                  }}>
                    Class ID: {cls.classId}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {studentCounts[cls.classId] || 0} Students
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                onClick={() => {
                  setSelectedClassForAttendance(cls);
                  setShowMarkAttendance(true);
                }}
              >
                <span></span>
                <span>Mark Attendance</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHome();
      case 'classes':
        return renderAssignedClasses();
      case 'attendance':
        return renderAttendance();
      case 'promotion':
        // Show promotion assignment for the class teacher's class
        console.log('===== PROMOTION TAB DEBUG =====');
        console.log('classTeacherClassIds:', classTeacherClassIds);
        console.log('classTeacherClassIds[0]:', classTeacherClassIds[0]);
        console.log('activeSessionId:', activeSessionId);
        console.log('===============================');
        
        if (classTeacherClassIds.length > 0 && activeSessionId) {
          return <PromotionAssignment classId={classTeacherClassIds[0]} sessionId={activeSessionId} />;
        } else {
          return (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No Class Teacher Assignment</h3>
              <p style={{ color: '#94a3b8' }}>
                This feature is only available for class teachers.
              </p>
            </div>
          );
        }
      case 'queries':
        return renderQueries();
      case 'lectures':
        return renderVideoLectures();
      case 'leave':
        return renderLeaveRequests();
      case 'students':
        return renderStudentInfo();
      default:
        return renderHome();
    }
  };

  return (
    <div className="teacher-dashboard">
      <nav className="teacher-navbar">
        <div className="nav-brand">
          <div className="brand-icon">👨‍🏫</div>
          <h2>SLMS Teacher</h2>
        </div>
        <div className="nav-actions">
          <button 
            className="nav-btn notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          <button className="nav-btn">👤</button>
          <button className="nav-btn logout" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="teacher-content">
        <aside className="teacher-sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Home
            </button>
            <button
              className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
              onClick={() => setActiveTab('classes')}
            >
              Assigned Classes
            </button>
            <button
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              Attendance
            </button>
            <button
              className={`nav-item ${activeTab === 'promotion' ? 'active' : ''}`}
              onClick={() => setActiveTab('promotion')}
            >
              Promote Students
            </button>
            <button
              className={`nav-item ${activeTab === 'queries' ? 'active' : ''}`}
              onClick={() => setActiveTab('queries')}
            >
              Queries
            </button>
            <button
              className={`nav-item ${activeTab === 'lectures' ? 'active' : ''}`}
              onClick={() => setActiveTab('lectures')}
            >
              Video Lectures
            </button>
            <button
              className={`nav-item ${activeTab === 'leave' ? 'active' : ''}`}
              onClick={() => setActiveTab('leave')}
            >
             Leave Requests
            </button>
            <button
              className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              Student Information
            </button>
          </nav>
        </aside>

        <main className="teacher-main">
          <div className="main-header">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}</h1>
          </div>
          <div className="main-content">
            {renderContent()}
          </div>
        </main>
      </div>
      {renderNotifications()}
      {renderTCModal()}
      
      {/* Mark Attendance Modal */}
      {showMarkAttendance && selectedClassForAttendance && (
        <MarkAttendance
          classId={selectedClassForAttendance.classId}
          className={selectedClassForAttendance.className}
          section={selectedClassForAttendance.section}
          onClose={() => {
            setShowMarkAttendance(false);
            setSelectedClassForAttendance(null);
          }}
        />
      )}
    </div>
  );
};

export default TeacherDashboard; 