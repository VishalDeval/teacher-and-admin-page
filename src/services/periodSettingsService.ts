import { api } from './api';

export interface PeriodSettings {
  id?: number;
  periodDuration: number; // in minutes
  schoolStartTime: string; // HH:MM format
  lunchPeriod: number; // after which period (1-8)
  lunchDuration: number; // in minutes
}

export class PeriodSettingsService {
  /**
   * Get current period settings
   * If no settings exist, returns default values
   * Falls back to localStorage if backend is not available
   */
  static async getPeriodSettings(): Promise<PeriodSettings> {
    try {
      const response = await api.get('/period-settings');
      
      if (response.status >= 200 && response.status < 300 && response.data.data) {
        // Cache to localStorage
        localStorage.setItem('periodSettings', JSON.stringify(response.data.data));
        return response.data.data;
      }
      
      // Return defaults if none exist
      return this.getDefaultSettings();
    } catch (error: any) {
      console.warn('Backend period settings not available, using localStorage fallback:', error.message);
      
      // Try to get from localStorage first
      const cached = localStorage.getItem('periodSettings');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached settings:', e);
        }
      }
      
      // Return defaults
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default settings
   */
  private static getDefaultSettings(): PeriodSettings {
    return {
      periodDuration: 60,
      schoolStartTime: '08:00',
      lunchPeriod: 5,
      lunchDuration: 60
    };
  }

  /**
   * Save or update period settings
   * This will affect all timetable displays globally
   * Falls back to localStorage if backend is not available
   */
  static async savePeriodSettings(settings: PeriodSettings): Promise<PeriodSettings> {
    try {
      // Validate settings
      const validationError = this.validateSettings(settings);
      if (validationError) {
        throw new Error(validationError);
      }

      try {
        const response = await api.post('/period-settings', settings);
        
        if (response.status >= 200 && response.status < 300) {
          // Cache to localStorage
          localStorage.setItem('periodSettings', JSON.stringify(response.data.data));
          return response.data.data;
        }
      } catch (apiError: any) {
        console.warn('Backend save failed, using localStorage fallback:', apiError.message);
        // Fall through to localStorage save
      }
      
      // Save to localStorage as fallback
      localStorage.setItem('periodSettings', JSON.stringify(settings));
      console.log('Period settings saved to localStorage');
      return settings;
      
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to save period settings';
      throw new Error(message);
    }
  }

  /**
   * Validate period settings
   */
  static validateSettings(settings: PeriodSettings): string | null {
    if (!settings.periodDuration || settings.periodDuration < 30 || settings.periodDuration > 120) {
      return 'Period duration must be between 30 and 120 minutes';
    }

    if (!settings.schoolStartTime || !settings.schoolStartTime.match(/^\d{2}:\d{2}$/)) {
      return 'Invalid school start time format (expected HH:MM)';
    }

    if (!settings.lunchPeriod || settings.lunchPeriod < 1 || settings.lunchPeriod > 8) {
      return 'Lunch period must be between 1 and 8';
    }

    if (!settings.lunchDuration || settings.lunchDuration < 20 || settings.lunchDuration > 120) {
      return 'Lunch duration must be between 20 and 120 minutes';
    }

    return null;
  }
}

export default PeriodSettingsService;
