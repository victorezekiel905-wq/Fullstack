import { apiClient } from './api';

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeSession: string;
  recentActivity: any[];
}

export const dashboardService = {
  async getStats() {
    const response = await apiClient.get<{ data: DashboardStats }>('/dashboard/stats');
    return response.data;
  },

  async getHealth() {
    const response = await apiClient.get<any>('/health');
    return response;
  },
};
