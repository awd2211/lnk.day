import axios from 'axios';

const CONSOLE_SERVICE_URL = import.meta.env.VITE_CONSOLE_SERVICE_URL || 'http://localhost:60001';

export const api = axios.create({
  baseURL: CONSOLE_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('console_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('console_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin Auth
export const adminAuthService = {
  login: (email: string, password: string) => api.post('/admin/login', { email, password }),
  getAdmins: () => api.get('/admin'),
  getAdmin: (id: string) => api.get(`/admin/${id}`),
  createAdmin: (data: any) => api.post('/admin', data),
  updateAdmin: (id: string, data: any) => api.put(`/admin/${id}`, data),
  deleteAdmin: (id: string) => api.delete(`/admin/${id}`),
};

// Dashboard
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: (limit?: number) => api.get('/dashboard/activity', { params: { limit } }),
  getTopLinks: (limit?: number) => api.get('/dashboard/top-links', { params: { limit } }),
  getHealth: () => api.get('/dashboard/health'),
  getMetrics: (period?: string) => api.get('/dashboard/metrics', { params: { period } }),
};

// System
export const systemService = {
  getInfo: () => api.get('/system/info'),
  getServices: () => api.get('/system/services'),
  getConfig: () => api.get('/system/config'),
  getQueues: () => api.get('/system/queues'),
  getCache: () => api.get('/system/cache'),
  getDatabase: () => api.get('/system/database'),
};

// Proxy to other services
export const proxyService = {
  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/proxy/users', { params }),
  getUser: (id: string) => api.get(`/proxy/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/proxy/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/proxy/users/${id}`),

  // Teams
  getTeams: (params?: { page?: number; limit?: number }) => api.get('/proxy/teams', { params }),
  getTeam: (id: string) => api.get(`/proxy/teams/${id}`),

  // Links
  getLinks: (teamId: string, params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/proxy/links', { params: { teamId, ...params } }),
  getLink: (id: string) => api.get(`/proxy/links/${id}`),
  deleteLink: (id: string) => api.delete(`/proxy/links/${id}`),

  // Analytics
  getAnalyticsSummary: () => api.get('/proxy/analytics/summary'),
  getLinkAnalytics: (linkId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/proxy/analytics/links/${linkId}`, { params }),
  getTeamAnalytics: (teamId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/proxy/analytics/teams/${teamId}`, { params }),

  // Campaigns
  getCampaigns: (teamId: string, params?: { status?: string }) =>
    api.get('/proxy/campaigns', { params: { teamId, ...params } }),
  getCampaign: (id: string) => api.get(`/proxy/campaigns/${id}`),
  deleteCampaign: (id: string) => api.delete(`/proxy/campaigns/${id}`),

  // Pages
  getPages: (teamId: string, params?: { status?: string }) =>
    api.get('/proxy/pages', { params: { teamId, ...params } }),
  getPage: (id: string) => api.get(`/proxy/pages/${id}`),
  deletePage: (id: string) => api.delete(`/proxy/pages/${id}`),

  // Notifications
  sendBroadcast: (data: { subject: string; body: string; recipients: string[] }) =>
    api.post('/proxy/notifications/broadcast', data),
};
