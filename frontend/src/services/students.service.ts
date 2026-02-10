import { apiClient } from './api';

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  classId?: string;
  parentId?: string;
  photoUrl?: string;
  createdAt: string;
}

export const studentsService = {
  async getAll(params?: { page?: number; limit?: number }) {
    const response = await apiClient.get<{ data: Student[] }>('/students', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<{ data: Student }>(`/students/${id}`);
    return response.data;
  },

  async create(data: Partial<Student>) {
    const response = await apiClient.post<{ data: Student }>('/students', data);
    return response.data;
  },

  async update(id: string, data: Partial<Student>) {
    const response = await apiClient.patch<{ data: Student }>(`/students/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    await apiClient.delete(`/students/${id}`);
  },
};
