import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

// User API
export const userAPI = {
  createTeamLead: (data) => api.post('/admin/users/teamlead', data),
  createEmployee: (data) => api.post('/teamlead/users/employee', data),
  getAllUsers: () => api.get('/users'),
  getMyEmployees: () => api.get('/teamlead/employees'),
  getUserById: (id) => api.get(`/users/${id}`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteEmployeeAsTeamLead: (id) => api.delete(`/teamlead/users/${id}`),
  changePassword: (data) => api.post('/users/change-password', data),
};

// Project API
export const projectAPI = {
  create: (data) => api.post('/projects', data),
  getAll: () => api.get('/projects'),
  getMy: () => api.get('/projects/my'),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Milestone API
export const milestoneAPI = {
  create: (data) => api.post('/milestones', data),
  getAll: () => api.get('/milestones'),
  getByProject: (projectId) => api.get(`/milestones/project/${projectId}`),
  getById: (id) => api.get(`/milestones/${id}`),
  update: (id, data) => api.put(`/milestones/${id}`, data),
  delete: (id) => api.delete(`/milestones/${id}`),
};

// Task API
export const taskAPI = {
  create: (data) => api.post('/tasks', data),
  getAll: () => api.get('/tasks'),
  getMy: () => api.get('/tasks/my'),
  getByMilestone: (milestoneId) => api.get(`/tasks/milestone/${milestoneId}`),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Note API
export const noteAPI = {
  create: (data) => api.post('/notes', data),
  getByTask: (taskId) => api.get(`/notes/task/${taskId}`),
  getByProject: (projectId) => api.get(`/notes/project/${projectId}`),
  getById: (id) => api.get(`/notes/${id}`),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const statusRequestAPI = {
  create: (data) => api.post('/requests', data), // { targetType: 'TASK'|'PROJECT', targetId, requestedStatus }
  listForTeamLead: () => api.get('/teamlead/requests'),
  approve: (id) => api.post(`/teamlead/requests/${id}/approve`),
  reject: (id) => api.post(`/teamlead/requests/${id}/reject`),
};

export const changelogAPI = {
  create: (data) => api.post('/changelog', data),
  byProject: (projectId) => api.get(`/changelog/project/${projectId}`),
  byMilestone: (milestoneId) => api.get(`/changelog/milestone/${milestoneId}`),
  byTask: (taskId) => api.get(`/changelog/task/${taskId}`),
};

export default api;
