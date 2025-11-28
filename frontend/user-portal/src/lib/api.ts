import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:60002';
const LINK_SERVICE_URL = import.meta.env.VITE_LINK_SERVICE_URL || 'http://localhost:60003';
const ANALYTICS_SERVICE_URL = import.meta.env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:60020';
const QR_SERVICE_URL = import.meta.env.VITE_QR_SERVICE_URL || 'http://localhost:60005';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: AxiosError) => {
  // Network error (no response)
  if (!error.response) return true;

  // Retryable status codes
  return RETRYABLE_STATUS_CODES.includes(error.response.status);
};

const createApiClient = (baseURL: string) => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000, // 30 seconds timeout
  });

  // Request interceptor - add auth token
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor - handle errors and retry
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as ExtendedAxiosRequestConfig;

      // Handle 401 - unauthorized
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Skip retry for non-retryable errors or if no config
      if (!config || !isRetryableError(error)) {
        return Promise.reject(error);
      }

      // Skip retry for non-idempotent methods (POST, PATCH, DELETE) unless explicitly marked
      const nonIdempotentMethods = ['post', 'patch', 'delete'];
      if (nonIdempotentMethods.includes(config.method?.toLowerCase() || '')) {
        return Promise.reject(error);
      }

      // Initialize retry count
      config._retryCount = config._retryCount ?? 0;

      // Check if we've exceeded max retries
      if (config._retryCount >= MAX_RETRIES) {
        return Promise.reject(error);
      }

      // Increment retry count
      config._retryCount += 1;

      // Calculate delay with exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);

      // Wait before retrying
      await sleep(delay);

      // Retry the request
      return client(config);
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
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; folderId?: string }) =>
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

// Folder API
export const folderService = {
  getAll: () => linkApi.get('/folders'),
  getTree: () => linkApi.get('/folders/tree'),
  getOne: (id: string) => linkApi.get(`/folders/${id}`),
  create: (data: { name: string; color?: string; icon?: string; parentId?: string }) =>
    linkApi.post('/folders', data),
  update: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    linkApi.put(`/folders/${id}`, data),
  delete: (id: string) => linkApi.delete(`/folders/${id}`),
  reorder: (orderedIds: string[]) => linkApi.post('/folders/reorder', { orderedIds }),
};

// Link Template API
export const linkTemplateService = {
  getAll: (params?: { page?: number; limit?: number; search?: string; favoritesOnly?: boolean }) =>
    linkApi.get('/link-templates', { params }),
  getOne: (id: string) => linkApi.get(`/link-templates/${id}`),
  create: (data: any) => linkApi.post('/link-templates', data),
  update: (id: string, data: any) => linkApi.put(`/link-templates/${id}`, data),
  delete: (id: string) => linkApi.delete(`/link-templates/${id}`),
  toggleFavorite: (id: string) => linkApi.post(`/link-templates/${id}/favorite`),
  createLinkFromTemplate: (data: { templateId: string; originalUrl: string; customSlug?: string; title?: string }) =>
    linkApi.post('/link-templates/create-link', data),
  getPresets: () => linkApi.get('/link-templates/presets'),
  getPresetsByCategory: (category: string) => linkApi.get(`/link-templates/presets/category/${category}`),
  createFromPreset: (presetId: string, name: string) =>
    linkApi.post('/link-templates/from-preset', { presetId, name }),
  getMostUsed: (limit?: number) => linkApi.get('/link-templates/most-used', { params: { limit } }),
  getRecentlyUsed: (limit?: number) => linkApi.get('/link-templates/recently-used', { params: { limit } }),
};

// Redirect Rules API
export const redirectRulesService = {
  getAll: (linkId: string) => linkApi.get(`/redirect-rules/link/${linkId}`),
  getOne: (id: string) => linkApi.get(`/redirect-rules/${id}`),
  create: (linkId: string, data: any) => linkApi.post(`/redirect-rules/link/${linkId}`, data),
  update: (id: string, data: any) => linkApi.put(`/redirect-rules/${id}`, data),
  delete: (id: string) => linkApi.delete(`/redirect-rules/${id}`),
  toggle: (id: string) => linkApi.post(`/redirect-rules/${id}/toggle`),
  reorder: (linkId: string, ruleIds: string[]) =>
    linkApi.post(`/redirect-rules/link/${linkId}/reorder`, { ruleIds }),
  getStats: (linkId: string) => linkApi.get(`/redirect-rules/link/${linkId}/stats`),
};

// Security API
export const securityService = {
  analyze: (url: string) => linkApi.post('/security/analyze', { url }),
  quickCheck: (url: string) => linkApi.post('/security/quick-check', { url }),
  batchScan: (urls: string[]) => linkApi.post('/security/batch-scan', { urls }),
  getScanHistory: (url: string, limit?: number) =>
    linkApi.get('/security/history', { params: { url, limit } }),
  getStats: () => linkApi.get('/security/stats'),
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
