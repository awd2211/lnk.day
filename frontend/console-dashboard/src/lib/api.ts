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
  updateConfig: (data: any) => api.put('/system/config', data),
  resetConfig: () => api.post('/system/config/reset'),
  testEmail: (data: { to: string }) => api.post('/system/test-email', data),
  getQueues: () => api.get('/system/queues'),
  clearQueue: (queueName: string) => api.post(`/system/queues/${queueName}/clear`),
  getCache: () => api.get('/system/cache'),
  clearCache: (pattern?: string) => api.post('/system/cache/clear', { pattern }),
  getDatabase: () => api.get('/system/database'),
  getLogs: (params?: { level?: string; service?: string; limit?: number }) =>
    api.get('/system/logs', { params }),
  getBackups: () => api.get('/system/backups'),
  createBackup: () => api.post('/system/backups'),
  restoreBackup: (id: string) => api.post(`/system/backups/${id}/restore`),
};

// Proxy to other services
export const proxyService = {
  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string; status?: string; plan?: string }) =>
    api.get('/proxy/users', { params }),
  getUser: (id: string) => api.get(`/proxy/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/proxy/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/proxy/users/${id}`),
  toggleUserStatus: (id: string, status: 'active' | 'disabled') =>
    api.patch(`/proxy/users/${id}/status`, { status }),
  bulkDeleteUsers: (ids: string[]) => api.post('/proxy/users/bulk-delete', { ids }),
  bulkToggleStatus: (ids: string[], status: 'active' | 'disabled') =>
    api.post('/proxy/users/bulk-status', { ids, status }),
  forceLogout: (id: string) => api.post(`/proxy/users/${id}/force-logout`),
  getUserLoginHistory: (id: string) => api.get(`/proxy/users/${id}/login-history`),
  getUserActivity: (id: string) => api.get(`/proxy/users/${id}/activity`),
  resetUserPassword: (id: string) => api.post(`/proxy/users/${id}/reset-password`),

  // Teams
  getTeams: (params?: { page?: number; limit?: number; status?: string; plan?: string }) =>
    api.get('/proxy/teams', { params }),
  getTeam: (id: string) => api.get(`/proxy/teams/${id}`),
  updateTeam: (id: string, data: any) => api.put(`/proxy/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/proxy/teams/${id}`),
  toggleTeamStatus: (id: string, status: 'active' | 'suspended') =>
    api.patch(`/proxy/teams/${id}/status`, { status }),
  getTeamMembers: (id: string) => api.get(`/proxy/teams/${id}/members`),
  updateTeamMember: (teamId: string, memberId: string, data: any) =>
    api.put(`/proxy/teams/${teamId}/members/${memberId}`, data),
  removeTeamMember: (teamId: string, memberId: string) =>
    api.delete(`/proxy/teams/${teamId}/members/${memberId}`),
  updateTeamQuota: (id: string, quota: any) => api.patch(`/proxy/teams/${id}/quota`, quota),

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

// Subscriptions
export const subscriptionsService = {
  getStats: () => api.get('/proxy/subscriptions/stats'),
  getSubscriptions: (params?: {
    page?: number;
    limit?: number;
    plan?: string;
    status?: string;
    search?: string;
  }) => api.get('/proxy/subscriptions', { params }),
  getSubscription: (id: string) => api.get(`/proxy/subscriptions/${id}`),
  changePlan: (id: string, data: { plan: string; billingCycle: 'monthly' | 'annual' }) =>
    api.patch(`/proxy/subscriptions/${id}/plan`, data),
  cancelSubscription: (id: string, data?: { immediately?: boolean }) =>
    api.post(`/proxy/subscriptions/${id}/cancel`, data),
  reactivateSubscription: (id: string) =>
    api.post(`/proxy/subscriptions/${id}/reactivate`),
  getInvoices: (subscriptionId: string) =>
    api.get(`/proxy/subscriptions/${subscriptionId}/invoices`),
  refundInvoice: (subscriptionId: string, invoiceId: string) =>
    api.post(`/proxy/subscriptions/${subscriptionId}/invoices/${invoiceId}/refund`),
  extendTrial: (id: string, days: number) =>
    api.post(`/proxy/subscriptions/${id}/extend-trial`, { days }),
};

// Content Moderation
export const moderationService = {
  getStats: () => api.get('/proxy/moderation/stats'),
  getFlaggedLinks: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    reason?: string;
    severity?: string;
    search?: string;
  }) => api.get('/proxy/moderation/flagged-links', { params }),
  getFlaggedLink: (id: string) => api.get(`/proxy/moderation/flagged-links/${id}`),
  approveLink: (id: string, data?: { note?: string }) =>
    api.post(`/proxy/moderation/flagged-links/${id}/approve`, data),
  blockLink: (id: string, data?: { note?: string; blockUser?: boolean }) =>
    api.post(`/proxy/moderation/flagged-links/${id}/block`, data),
  bulkApprove: (ids: string[], data?: { note?: string }) =>
    api.post('/proxy/moderation/flagged-links/bulk-approve', { ids, ...data }),
  bulkBlock: (ids: string[], data?: { note?: string; blockUsers?: boolean }) =>
    api.post('/proxy/moderation/flagged-links/bulk-block', { ids, ...data }),
  getReports: (linkId: string) => api.get(`/proxy/moderation/flagged-links/${linkId}/reports`),
  blockUser: (userId: string, data?: { reason?: string }) =>
    api.post(`/proxy/moderation/users/${userId}/block`, data),
  unblockUser: (userId: string) => api.post(`/proxy/moderation/users/${userId}/unblock`),
  getBlockedUsers: (params?: { page?: number; limit?: number }) =>
    api.get('/proxy/moderation/blocked-users', { params }),
  getSettings: () => api.get('/proxy/moderation/settings'),
  updateSettings: (data: any) => api.put('/proxy/moderation/settings', data),
};

// Audit Logs
export const auditService = {
  getStats: () => api.get('/audit/stats'),
  getLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    actorType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/audit/logs', { params }),
  getLog: (id: string) => api.get(`/audit/logs/${id}`),
  exportLogs: (params?: {
    format?: 'csv' | 'json';
    startDate?: string;
    endDate?: string;
    category?: string;
  }) => api.post('/audit/export', params),
};

// Alerts
export const alertsService = {
  getAlerts: (params?: { status?: string }) => api.get('/alerts', { params }),
  getAlert: (id: string) => api.get(`/alerts/${id}`),
  acknowledgeAlert: (id: string) => api.post(`/alerts/${id}/acknowledge`),
  resolveAlert: (id: string) => api.post(`/alerts/${id}/resolve`),

  // Alert Rules
  getRules: () => api.get('/alerts/rules'),
  getRule: (id: string) => api.get(`/alerts/rules/${id}`),
  createRule: (data: any) => api.post('/alerts/rules', data),
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
  toggleRule: (id: string, enabled: boolean) => api.patch(`/alerts/rules/${id}/toggle`, { enabled }),
};
