import api from './api';

export interface GradeDistributionDto {
    id?: number;
    grade: string;
    minPercentage: number;
    maxPercentage: number;
    description?: string;
}

export interface GradeDistributionResponse {
    data: GradeDistributionDto[];
    message: string;
    status: number;
    timestamp: string;
}

class GradeDistributionService {
    /**
     * Get grade distribution for the school (custom or default)
     */
    async getGradeDistribution(): Promise<GradeDistributionDto[]> {
        try {
            const response = await api.get<GradeDistributionResponse>('/grade-distribution');
            return response.data.data;
        } catch (error: any) {
            console.error('Error fetching grade distribution:', error);
            throw error;
        }
    }

    /**
     * Get the default grade distribution
     */
    async getDefaultGradeDistribution(): Promise<GradeDistributionDto[]> {
        try {
            const response = await api.get<GradeDistributionResponse>('/grade-distribution/default');
            return response.data.data;
        } catch (error: any) {
            console.error('Error fetching default grade distribution:', error);
            throw error;
        }
    }

    /**
     * Set custom grade distribution for the school (Admin only)
     */
    async setGradeDistribution(grades: GradeDistributionDto[]): Promise<GradeDistributionDto[]> {
        try {
            const response = await api.post<GradeDistributionResponse>('/grade-distribution', grades);
            return response.data.data;
        } catch (error: any) {
            console.error('Error setting grade distribution:', error);
            throw error;
        }
    }

    /**
     * Reset to default grade distribution (Admin only)
     */
    async resetToDefault(): Promise<GradeDistributionDto[]> {
        try {
            const response = await api.delete<GradeDistributionResponse>('/grade-distribution/reset');
            return response.data.data;
        } catch (error: any) {
            console.error('Error resetting grade distribution:', error);
            throw error;
        }
    }

    /**
     * Validate grade distribution for overlaps and gaps
     */
    validateGradeDistribution(grades: GradeDistributionDto[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Sort by min percentage
        const sortedGrades = [...grades].sort((a, b) => a.minPercentage - b.minPercentage);

        // Check for overlaps and gaps
        for (let i = 0; i < sortedGrades.length - 1; i++) {
            const current = sortedGrades[i];
            const next = sortedGrades[i + 1];

            if (current.maxPercentage < current.minPercentage) {
                errors.push(`${current.grade}: Max percentage must be greater than min percentage`);
            }

            if (current.maxPercentage >= next.minPercentage) {
                errors.push(`${current.grade} and ${next.grade}: Overlapping ranges`);
            }

            if (current.maxPercentage + 0.01 < next.minPercentage) {
                errors.push(`Gap between ${current.grade} and ${next.grade}`);
            }
        }

        // Check first and last grades cover full range
        if (sortedGrades.length > 0) {
            if (sortedGrades[0].minPercentage > 0) {
                errors.push('Grades must start from 0%');
            }
            if (sortedGrades[sortedGrades.length - 1].maxPercentage < 100) {
                errors.push('Grades must cover up to 100%');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default new GradeDistributionService();
