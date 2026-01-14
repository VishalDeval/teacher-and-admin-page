import { api } from './api';

export interface SessionData {
  id?: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  active: boolean;
}

export interface SessionResponse {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export class SessionService {
  // Get all sessions
  static async getAllSessions(): Promise<SessionResponse[]> {
    try {
      const response = await api.get('/sessions');
      
      if (response.status >= 200 && response.status < 300) {
        return response.data.data || [];
      }
      throw new Error(response.data.message || 'Failed to fetch sessions');
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch sessions');
    }
  }

  // Get session by ID
  static async getSessionById(id: number): Promise<SessionResponse> {
    try {
      const response = await api.get(`/sessions/${id}`);
      
      if (response.status >= 200 && response.status < 300) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch session');
    } catch (error: any) {
      console.error('Failed to fetch session:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch session');
    }
  }

  // Create new session
  static async createSession(sessionData: SessionData): Promise<SessionResponse> {
    try {
      const response = await api.post('/sessions', sessionData);
      
      if (response.status >= 200 && response.status < 300) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to create session');
    } catch (error: any) {
      console.error('Failed to create session:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create session');
    }
  }

  // Update existing session
  static async updateSession(id: number, sessionData: SessionData): Promise<SessionResponse> {
    try {
      const response = await api.put(`/sessions/${id}`, sessionData);
      
      if (response.status >= 200 && response.status < 300) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update session');
    } catch (error: any) {
      console.error('Failed to update session:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update session');
    }
  }

  // Delete session
  static async deleteSession(id: number): Promise<void> {
    try {
      const response = await api.delete(`/sessions/${id}`);
      
      if (response.status >= 200 && response.status < 300) {
        return;
      }
      throw new Error(response.data.message || 'Failed to delete session');
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete session');
    }
  }

  // Set active session (deactivates all others)
  static async setActiveSession(id: number): Promise<SessionResponse> {
    try {
      const response = await api.put(`/sessions/${id}/activate`);
      
      if (response.status >= 200 && response.status < 300) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to activate session');
    } catch (error: any) {
      console.error('Failed to activate session:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to activate session');
    }
  }

  // Get active session
  static async getActiveSession(): Promise<SessionResponse | null> {
    // try {
    //   const sessions = await this.getAllSessions();
    //   return sessions.find(session => session.active) || null;
    // } catch (error: any) {
    //   console.error('Failed to get active session:', error);
    //   return null;
    // }
    try {
      const sessions = await this.getAllSessions();
      // console.log("All sessions fetched:", sessions);
      const active = sessions.find(s => s.active);
      if (!active) console.warn("No active session found in response");
      return active || null;
    } catch (error: any) {
      console.error("getActiveSession failed:", error);
      return null;
    }
  }

  // Validate session dates
  static validateSessionDates(startDate: string, endDate: string): { valid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
      return { valid: false, error: 'Invalid start date' };
    }
    
    if (isNaN(end.getTime())) {
      return { valid: false, error: 'Invalid end date' };
    }
    
    if (start >= end) {
      return { valid: false, error: 'End date must be after start date' };
    }
    
    // Removed: 12-month constraint and overlap check
    // Sessions can now be of any length (as long as end > start)
    
    return { valid: true };
  }

  // Check if session overlaps with existing sessions
  static async checkSessionOverlap(
    startDate: string, 
    endDate: string, 
    excludeId?: number
  ): Promise<{ overlaps: boolean; conflictingSessions?: SessionResponse[] }> {
    try {
      const sessions = await this.getAllSessions();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const conflictingSessions = sessions.filter(session => {
        if (excludeId && session.id === excludeId) {
          return false; // Skip the session being edited
        }
        
        const sessionStart = new Date(session.startDate);
        const sessionEnd = new Date(session.endDate);
        
        // Check for overlap
        return (start <= sessionEnd && end >= sessionStart);
      });
      
      return {
        overlaps: conflictingSessions.length > 0,
        conflictingSessions: conflictingSessions.length > 0 ? conflictingSessions : undefined
      };
    } catch (error) {
      console.error('Failed to check session overlap:', error);
      return { overlaps: false };
    }
  }
}

export default SessionService;
