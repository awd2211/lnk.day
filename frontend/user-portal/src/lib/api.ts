import axios from 'axios';

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:60002';
const LINK_SERVICE_URL = import.meta.env.VITE_LINK_SERVICE_URL || 'http://localhost:60003';
const ANALYTICS_SERVICE_URL = import.meta.env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:60020';
const QR_SERVICE_URL = import.meta.env.VITE_QR_SERVICE_URL || 'http://localhost:60005';

const createApiClient = (baseURL: string) => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const api = createApiClient(USER_SERVICE_URL);
export const linkApi = createApiClient(LINK_SERVICE_URL);
export const analyticsApi = createApiClient(ANALYTICS_SERVICE_URL);
export const qrApi = createApiClient(QR_SERVICE_URL);

// Auth API
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string }) => api.post('/auth/register', data),
  me: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/users/me/password', data),
};

// Link API
export const linkService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    linkApi.get('/links', { params }),
  getOne: (id: string) => linkApi.get(`/links/${id}`),
  create: (data: { originalUrl: string; customCode?: string; title?: string; tags?: string[] }) =>
    linkApi.post('/links', data),
  update: (id: string, data: any) => linkApi.put(`/links/${id}`, data),
  delete: (id: string) => linkApi.delete(`/links/${id}`),
  getStats: (id: string) => linkApi.get(`/links/${id}/stats`),
  bulkCreate: (links: Array<{ originalUrl: string; title?: string }>) =>
    linkApi.post('/links/bulk', { links }),
  bulkOperation: (ids: string[], operation: string, data?: any) =>
    linkApi.post('/links/bulk/operation', { ids, operation, ...data }),
};

// Analytics API
export const analyticsService = {
  getSummary: () => analyticsApi.get('/api/analytics/summary'),
  getLinkAnalytics: (linkId: string, params?: { startDate?: string; endDate?: string }) =>
    analyticsApi.get(`/api/analytics/links/${linkId}`, { params }),
  getTeamAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    analyticsApi.get('/api/analytics/team', { params }),
  getRealtime: (linkId: string) => analyticsApi.get(`/api/analytics/links/${linkId}/realtime`),
};

// QR Code API
export const qrService = {
  generate: (data: {
    content: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: string;
  }) => qrApi.post('/qr/generate', data, { responseType: 'blob' }),
  getStyles: () => qrApi.get('/qr/styles'),
};

// User/Team API
export const userService = {
  // Team management
  getCurrentTeam: () => api.get('/teams/current'),
  getTeamMembers: (teamId: string) => api.get(`/teams/${teamId}/members`),
  getTeamInvitations: (teamId: string) => api.get(`/teams/${teamId}/invitations`),
  inviteTeamMember: (teamId: string, data: { email: string; role: string }) =>
    api.post(`/teams/${teamId}/members/invite`, data),
  updateTeamMemberRole: (teamId: string, memberId: string, data: { role: string }) =>
    api.patch(`/teams/${teamId}/members/${memberId}`, data),
  removeTeamMember: (teamId: string, memberId: string) =>
    api.delete(`/teams/${teamId}/members/${memberId}`),
  cancelTeamInvitation: (teamId: string, invitationId: string) =>
    api.delete(`/teams/${teamId}/invitations/${invitationId}`),
  resendTeamInvitation: (teamId: string, invitationId: string) =>
    api.post(`/teams/${teamId}/invitations/${invitationId}/resend`),
  updateTeam: (teamId: string, data: any) => api.patch(`/teams/${teamId}`, data),
};
