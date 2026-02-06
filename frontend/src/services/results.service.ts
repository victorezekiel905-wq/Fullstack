import { apiClient } from './api';

export interface Result {
  id: string;
  studentId: string;
  sessionId: string;
  termId: string;
  subjectId: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  position?: number;
  remarks?: string;
  published: boolean;
}

export const resultsService = {
  async getByStudent(studentId: string, params?: { sessionId?: string; termId?: string }) {
    const response = await apiClient.get<{ data: Result[] }>(`/results/student/${studentId}`, { params });
    return response.data;
  },

  async computeResults(data: { sessionId: string; termId: string; classId: string }) {
    const response = await apiClient.post<{ data: any }>('/results/compute', data);
    return response.data;
  },

  async publishResults(data: { sessionId: string; termId: string; classId: string }) {
    const response = await apiClient.post<{ data: any }>('/results/publish', data);
    return response.data;
  },

  async getBroadsheet(params: { sessionId: string; termId: string; classId: string }) {
    const response = await apiClient.get<{ data: any }>('/results/broadsheet', { params });
    return response.data;
  },
};
