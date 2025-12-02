import axios from 'axios';

// Console dashboard uses proxy in development, direct URL in production
const CONSOLE_SERVICE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_CONSOLE_SERVICE_URL || 'http://localhost:60009/api/v1')
  : '/api/v1';

export const api = axios.create({
  baseURL: CONSOLE_SERVICE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
  const token = localStorage.getItem('console_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('console_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin Auth
export const adminAuthService = {
  login: (email: string, password: string, rememberMe = false, twoFactorCode?: string) =>
    api.post('/admin/login', { email, password, rememberMe, twoFactorCode }),
  sendLoginCode: (email: string) => api.post('/admin/login/send-code', { email }),
  loginWithCode: (email: string, code: string, rememberMe = false) =>
    api.post('/admin/login/code', { email, code, rememberMe }),
  forgotPassword: (email: string) => api.post('/admin/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/admin/reset-password', { token, password }),
  getAdmins: () => api.get('/admin'),
  getAdmin: (id: string) => api.get(`/admin/${id}`),
  createAdmin: (data: any) => api.post('/admin', data),
  updateAdmin: (id: string, data: any) => api.put(`/admin/${id}`, data),
  deleteAdmin: (id: string) => api.delete(`/admin/${id}`),
  resetAdminPassword: (id: string) => api.post(`/admin/${id}/reset-password`),
  getAdminLoginHistory: (id: string) => api.get(`/admin/${id}/login-history`),
  toggleAdminStatus: (id: string) => api.patch(`/admin/${id}/toggle-status`),
};

// Admin Profile Management
export const profileService = {
  getProfile: () => api.get('/admin/me'),
  updateProfile: (data: { name?: string }) => api.put('/admin/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/admin/me/password', data),

  // Email Verification (for current email)
  sendEmailVerification: () => api.post('/admin/me/email/send-verification'),
  verifyEmail: (token: string) => api.post('/admin/email/verify', { token }),

  // Secure Email Change Flow
  // Step 1: Request email change (sends code to old email)
  requestEmailChange: (newEmail: string) => api.post('/admin/me/email/request-change', { newEmail }),
  // Step 2: Verify old email code
  verifyOldEmailForChange: (code: string) => api.post('/admin/me/email/verify-old', { code }),
  // Resend verification code to old email
  resendEmailChangeCode: () => api.post('/admin/me/email/resend-code'),
  // Resend new email verification link
  resendNewEmailVerification: () => api.post('/admin/me/email/resend-new-verification'),
  // Cancel pending email change
  cancelPendingEmailChange: () => api.delete('/admin/me/email/pending'),

  // Two-Factor Authentication
  setupTwoFactor: () => api.post('/admin/me/2fa/setup'),
  verifyTwoFactor: (code: string) => api.post('/admin/me/2fa/verify', { code }),
  disableTwoFactor: (code: string) => api.delete('/admin/me/2fa', { data: { code } }),
  regenerateBackupCodes: (code: string) => api.post('/admin/me/2fa/backup-codes', { code }),
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
  getEmailSettings: () => api.get('/system/email-settings'),
  updateEmailSettings: (data: any) => api.put('/system/email-settings', data),
  getEmailTemplates: () => api.get('/system/email-templates'),
  updateEmailTemplate: (id: string, data: { subject: string; html: string }) =>
    api.put(`/system/email-templates/${id}`, data),
  resetEmailTemplate: (id: string) => api.post(`/system/email-templates/${id}/reset`),
  getQueues: () => api.get('/system/queues'),
  clearQueue: (queueName: string) => api.post(`/system/queues/${queueName}/clear`),
  getCache: () => api.get('/system/cache'),
  clearCache: (pattern?: string) => api.post('/system/cache/clear', { pattern }),
  getDatabase: () => api.get('/system/database'),
  getLogs: (params?: { level?: string; service?: string; limit?: number }) =>
    api.get('/system/logs', { params }),
  getServiceLogs: (serviceName: string, params?: { lines?: number; level?: string }) =>
    api.get(`/system/services/${serviceName}/logs`, { params }),
  getBackups: () => api.get('/system/backups'),
  createBackup: () => api.post('/system/backups'),
  restoreBackup: (id: string) => api.post(`/system/backups/${id}/restore`),
};

// Proxy to other services
export const proxyService = {
  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string; status?: string; plan?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
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
  getTeams: (params?: { page?: number; limit?: number; status?: string; plan?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
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
  getCampaigns: (teamId?: string, params?: { status?: string; page?: number; limit?: number }) =>
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
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => api.get('/proxy/subscriptions', { params }),
  getSubscription: (id: string) => api.get(`/proxy/subscriptions/${id}`),
  changePlan: (id: string, data: { plan: string; billingCycle: 'monthly' | 'yearly' }) =>
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
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
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

// Billing / Invoices
export const billingService = {
  getInvoices: (params?: { page?: number; limit?: number; teamId?: string; status?: string }) =>
    api.get('/proxy/billing/invoices', { params }),
  getInvoice: (id: string) => api.get(`/proxy/billing/invoices/${id}`),
  refundInvoice: (id: string, data: { amount?: number; reason?: string }) =>
    api.post(`/proxy/billing/invoices/${id}/refund`, data),
  resendInvoice: (id: string) => api.post(`/proxy/billing/invoices/${id}/resend`),
  getRevenue: (params?: { startDate?: string; endDate?: string; groupBy?: string }) =>
    api.get('/proxy/billing/revenue', { params }),
  getPlans: () => api.get('/proxy/billing/plans'),
  updatePlan: (id: string, data: any) => api.put(`/proxy/billing/plans/${id}`, data),
};

// API Keys
export const apiKeysService = {
  getApiKeys: (params?: { page?: number; limit?: number; teamId?: string; userId?: string; status?: string }) =>
    api.get('/proxy/apikeys', { params }),
  getApiKey: (id: string) => api.get(`/proxy/apikeys/${id}`),
  revokeApiKey: (id: string, reason?: string) => api.post(`/proxy/apikeys/${id}/revoke`, { reason }),
  regenerateApiKey: (id: string) => api.post(`/proxy/apikeys/${id}/regenerate`),
  getUsage: (params?: { startDate?: string; endDate?: string; keyId?: string; teamId?: string }) =>
    api.get('/proxy/apikeys/usage', { params }),
};

// Webhooks
export const webhooksService = {
  getStats: () => api.get('/proxy/webhooks/stats'),
  getWebhooks: (params?: { page?: number; limit?: number; teamId?: string; status?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
    api.get('/proxy/webhooks', { params }),
  getWebhook: (id: string) => api.get(`/proxy/webhooks/${id}`),
  updateWebhook: (id: string, data: any) => api.put(`/proxy/webhooks/${id}`, data),
  deleteWebhook: (id: string) => api.delete(`/proxy/webhooks/${id}`),
  testWebhook: (id: string) => api.post(`/proxy/webhooks/${id}/test`),
  getLogs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/proxy/webhooks/${id}/logs`, { params }),
  retryWebhook: (id: string, logId: string) => api.post(`/proxy/webhooks/${id}/retry`, { logId }),
};

// Domains
export const domainsService = {
  getStats: () => api.get('/proxy/domains/stats'),
  getDomains: (params?: { page?: number; limit?: number; status?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
    api.get('/proxy/domains', { params }),
  getDomain: (id: string) => api.get(`/proxy/domains/${id}`),
  updateDomain: (id: string, data: { status?: string }) => api.patch(`/proxy/domains/${id}`, data),
  deleteDomain: (id: string) => api.delete(`/proxy/domains/${id}`),
  verifyDomain: (id: string) => api.post(`/proxy/domains/${id}/verify`),
};

// QR Codes
export const qrCodesService = {
  getStats: () => api.get('/proxy/qrcodes/stats'),
  getQRCodes: (params?: { page?: number; limit?: number; style?: string; teamId?: string }) =>
    api.get('/proxy/qrcodes', { params }),
  getQRCode: (id: string) => api.get(`/proxy/qrcodes/${id}`),
  deleteQRCode: (id: string) => api.delete(`/proxy/qrcodes/${id}`),
  blockQRCode: (id: string, reason: string) => api.post(`/proxy/qrcodes/${id}/block`, { reason }),
  unblockQRCode: (id: string) => api.post(`/proxy/qrcodes/${id}/unblock`),
  flagQRCode: (id: string, reason: string) => api.post(`/proxy/qrcodes/${id}/flag`, { reason }),
};

// Deep Links
export const deepLinksService = {
  getStats: () => api.get('/proxy/deeplinks/stats'),
  getDeepLinks: (params?: { page?: number; limit?: number; status?: string; teamId?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
    api.get('/proxy/deeplinks', { params }),
  getDeepLink: (id: string) => api.get(`/proxy/deeplinks/${id}`),
  deleteDeepLink: (id: string) => api.delete(`/proxy/deeplinks/${id}`),
  blockDeepLink: (id: string, reason: string) => api.post(`/proxy/deeplinks/${id}/block`, { reason }),
  unblockDeepLink: (id: string) => api.post(`/proxy/deeplinks/${id}/unblock`),
  flagDeepLink: (id: string, reason: string) => api.post(`/proxy/deeplinks/${id}/flag`, { reason }),
};

// Landing Pages
export const landingPagesService = {
  getStats: () => api.get('/proxy/pages/stats'),
  getPages: (params?: { page?: number; limit?: number; status?: string; type?: string; teamId?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
    api.get('/proxy/pages', { params }),
  getPage: (id: string) => api.get(`/proxy/pages/${id}`),
  deletePage: (id: string) => api.delete(`/proxy/pages/${id}`),
  blockPage: (id: string, reason: string) => api.post(`/proxy/pages/${id}/block`, { reason }),
  unblockPage: (id: string) => api.post(`/proxy/pages/${id}/unblock`),
  flagPage: (id: string, reason: string) => api.post(`/proxy/pages/${id}/flag`, { reason }),
};

// Role Management
export const rolesService = {
  getTeamRoles: (teamId: string) => api.get(`/proxy/teams/${teamId}/roles`),
  getAvailablePermissions: (teamId: string) => api.get(`/proxy/teams/${teamId}/roles/permissions`),
  getRole: (teamId: string, roleId: string) => api.get(`/proxy/teams/${teamId}/roles/${roleId}`),
  createRole: (teamId: string, data: { name: string; description?: string; color?: string; permissions: string[]; isDefault?: boolean }) =>
    api.post(`/proxy/teams/${teamId}/roles`, data),
  updateRole: (teamId: string, roleId: string, data: { name?: string; description?: string; color?: string; permissions?: string[]; isDefault?: boolean }) =>
    api.put(`/proxy/teams/${teamId}/roles/${roleId}`, data),
  deleteRole: (teamId: string, roleId: string) => api.delete(`/proxy/teams/${teamId}/roles/${roleId}`),
  duplicateRole: (teamId: string, roleId: string, newName: string) =>
    api.post(`/proxy/teams/${teamId}/roles/${roleId}/duplicate`, { name: newName }),
  initializeDefaults: (teamId: string) => api.post(`/proxy/teams/${teamId}/roles/initialize`),
};

// Data Export
export const exportService = {
  exportUsers: (data: { format?: string; filters?: any; fields?: string[] }) =>
    api.post('/proxy/export/users', data),
  exportTeams: (data: { format?: string; filters?: any; fields?: string[] }) =>
    api.post('/proxy/export/teams', data),
  exportLinks: (data: { format?: string; teamId?: string; filters?: any; fields?: string[] }) =>
    api.post('/proxy/export/links', data),
  exportAnalytics: (data: { format?: string; startDate?: string; endDate?: string; teamId?: string; linkId?: string }) =>
    api.post('/proxy/export/analytics', data),
  exportInvoices: (data: { format?: string; startDate?: string; endDate?: string; status?: string }) =>
    api.post('/proxy/export/invoices', data),
  getJobs: (params?: { page?: number; limit?: number }) => api.get('/proxy/export/jobs', { params }),
  getJob: (id: string) => api.get(`/proxy/export/jobs/${id}`),
  downloadExport: (id: string) => api.get(`/proxy/export/jobs/${id}/download`, { responseType: 'blob' }),
};

// Integrations
export const integrationsService = {
  getStats: () => api.get('/proxy/integrations/stats'),
  getIntegrations: (params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }) =>
    api.get('/proxy/integrations', { params }),
  getIntegration: (id: string) => api.get(`/proxy/integrations/${id}`),
  updateConfig: (id: string, config: Record<string, any>) =>
    api.put(`/proxy/integrations/${id}/config`, config),
  triggerSync: (id: string) => api.post(`/proxy/integrations/${id}/sync`),
  toggleSync: (id: string, enabled: boolean) =>
    api.patch(`/proxy/integrations/${id}/sync`, { enabled }),
  disconnect: (id: string) => api.post(`/proxy/integrations/${id}/disconnect`),
  getSyncLogs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/proxy/integrations/${id}/logs`, { params }),
};

// Integration Platform Config (Admin)
export const integrationConfigService = {
  getConfigs: () => api.get('/system/integrations'),
  getConfig: (id: string) => api.get(`/system/integrations/${id}`),
  getStats: () => api.get('/system/integrations/stats'),
  updateConfig: (id: string, data: any) => api.put(`/system/integrations/${id}`, data),
  toggleConfig: (id: string, enabled: boolean) =>
    api.patch(`/system/integrations/${id}/toggle`, { enabled }),
};

// Notifications
export const notificationsService = {
  getStats: () => api.get('/proxy/notifications/stats'),
  getLogs: (params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }) =>
    api.get('/proxy/notifications/logs', { params }),
  getLog: (id: string) => api.get(`/proxy/notifications/logs/${id}`),
  resend: (id: string) => api.post(`/proxy/notifications/logs/${id}/resend`),
  sendBroadcast: (data: { subject: string; content: string; type: string }) =>
    api.post('/proxy/notifications/broadcast', data),

  // Templates
  getTemplates: (params?: { type?: string }) => api.get('/proxy/notifications/templates', { params }),
  getTemplate: (id: string) => api.get(`/proxy/notifications/templates/${id}`),
  updateTemplate: (id: string, data: any) => api.put(`/proxy/notifications/templates/${id}`, data),
  resetTemplate: (id: string) => api.post(`/proxy/notifications/templates/${id}/reset`),

  // Channels
  getChannels: () => api.get('/proxy/notifications/channels'),
  getChannel: (id: string) => api.get(`/proxy/notifications/channels/${id}`),
  createChannel: (data: { type: string; name: string; config: Record<string, any> }) =>
    api.post('/proxy/notifications/channels', data),
  updateChannel: (id: string, data: any) => api.put(`/proxy/notifications/channels/${id}`, data),
  toggleChannel: (id: string, enabled: boolean) =>
    api.patch(`/proxy/notifications/channels/${id}`, { enabled }),
  testChannel: (id: string, recipient?: string) =>
    api.post(`/proxy/notifications/channels/${id}/test`, recipient ? { recipient } : {}),
};

// Campaigns
export const campaignsService = {
  getStats: () => api.get('/proxy/campaigns/stats'),
  getCampaigns: (params?: { page?: number; limit?: number; status?: string; type?: string; teamId?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
    api.get('/proxy/campaigns', { params }),
  getCampaign: (id: string) => api.get(`/proxy/campaigns/${id}`),
  deleteCampaign: (id: string) => api.delete(`/proxy/campaigns/${id}`),
  suspendCampaign: (id: string, reason: string) => api.post(`/proxy/campaigns/${id}/suspend`, { reason }),
  resumeCampaign: (id: string) => api.post(`/proxy/campaigns/${id}/resume`),
  flagCampaign: (id: string, reason: string) => api.post(`/proxy/campaigns/${id}/flag`, { reason }),
};

// Links (Admin)
export const linksService = {
  getStats: () => api.get('/proxy/links/stats'),
  getLinks: (params?: { page?: number; limit?: number; status?: string; teamId?: string; search?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
    api.get('/proxy/links', { params }),
  getLink: (id: string) => api.get(`/proxy/links/${id}`),
  deleteLink: (id: string) => api.delete(`/proxy/links/${id}`),
  blockLink: (id: string, reason: string) => api.post(`/proxy/links/${id}/block`, { reason }),
  unblockLink: (id: string) => api.post(`/proxy/links/${id}/unblock`),
  flagLink: (id: string, reason: string) => api.post(`/proxy/links/${id}/flag`, { reason }),
};

// Automation
export const automationService = {
  getAutomations: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/system/automation', { params }),
  getAutomation: (id: string) => api.get(`/system/automation/${id}`),
  createAutomation: (data: any) => api.post('/system/automation', data),
  updateAutomation: (id: string, data: any) => api.put(`/system/automation/${id}`, data),
  deleteAutomation: (id: string) => api.delete(`/system/automation/${id}`),
  toggleAutomation: (id: string) => api.patch(`/system/automation/${id}/toggle`),
  executeAutomation: (id: string) => api.post(`/system/automation/${id}/execute`),
  getHistory: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/system/automation/${id}/history`, { params }),
};

// Templates (Platform Presets)
export const templatesService = {
  // Global stats
  getStats: () => api.get('/templates/stats'),

  // Link Templates
  getLinkTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) =>
    api.get('/templates/links', { params }),
  getLinkTemplateStats: () => api.get('/templates/links/stats'),
  getLinkTemplate: (id: string) => api.get(`/templates/links/${id}`),
  createLinkTemplate: (data: any) => api.post('/templates/links', data),
  updateLinkTemplate: (id: string, data: any) => api.put(`/templates/links/${id}`, data),
  deleteLinkTemplate: (id: string) => api.delete(`/templates/links/${id}`),
  toggleLinkTemplate: (id: string) => api.patch(`/templates/links/${id}/toggle`),
  reorderLinkTemplates: (items: { id: string; sortOrder: number }[]) =>
    api.patch('/templates/links/reorder', { items }),

  // UTM Templates
  getUtmTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string; platform?: string; status?: string }) =>
    api.get('/templates/utm', { params }),
  getUtmPlatforms: () => api.get('/templates/utm/platforms'),
  getUtmTemplate: (id: string) => api.get(`/templates/utm/${id}`),
  createUtmTemplate: (data: any) => api.post('/templates/utm', data),
  updateUtmTemplate: (id: string, data: any) => api.put(`/templates/utm/${id}`, data),
  deleteUtmTemplate: (id: string) => api.delete(`/templates/utm/${id}`),
  seedUtmPlatforms: () => api.post('/templates/utm/seed-platforms'),

  // Campaign Templates
  getCampaignTemplates: (params?: { page?: number; limit?: number; search?: string; scenario?: string; status?: string }) =>
    api.get('/templates/campaigns', { params }),
  getCampaignScenarios: () => api.get('/templates/campaigns/scenarios'),
  getCampaignTemplate: (id: string) => api.get(`/templates/campaigns/${id}`),
  createCampaignTemplate: (data: any) => api.post('/templates/campaigns', data),
  updateCampaignTemplate: (id: string, data: any) => api.put(`/templates/campaigns/${id}`, data),
  deleteCampaignTemplate: (id: string) => api.delete(`/templates/campaigns/${id}`),

  // Bio Link Templates
  getBioLinkTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string; industry?: string; status?: string }) =>
    api.get('/templates/bio-links', { params }),
  getBioLinkIndustries: () => api.get('/templates/bio-links/industries'),
  getBioLinkTemplate: (id: string) => api.get(`/templates/bio-links/${id}`),
  getBioLinkTemplatePreview: (id: string) => api.get(`/templates/bio-links/${id}/preview`),
  createBioLinkTemplate: (data: any) => api.post('/templates/bio-links', data),
  updateBioLinkTemplate: (id: string, data: any) => api.put(`/templates/bio-links/${id}`, data),
  deleteBioLinkTemplate: (id: string) => api.delete(`/templates/bio-links/${id}`),
  toggleBioLinkTemplate: (id: string) => api.patch(`/templates/bio-links/${id}/toggle`),

  // QR Styles
  getQrStyles: (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) =>
    api.get('/templates/qr-styles', { params }),
  getQrStyle: (id: string) => api.get(`/templates/qr-styles/${id}`),
  getQrStylePreview: (id: string) => api.get(`/templates/qr-styles/${id}/preview`),
  createQrStyle: (data: any) => api.post('/templates/qr-styles', data),
  updateQrStyle: (id: string, data: any) => api.put(`/templates/qr-styles/${id}`, data),
  deleteQrStyle: (id: string) => api.delete(`/templates/qr-styles/${id}`),
  toggleQrStyle: (id: string) => api.patch(`/templates/qr-styles/${id}/toggle`),
  seedQrStyles: () => api.post('/templates/qr-styles/seed'),
};
