import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// All API calls go through api-gateway
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:60000';

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

// Single API client for all services via api-gateway
export const api = createApiClient(API_GATEWAY_URL);
export const linkApi = api;
export const analyticsApi = api;
export const qrApi = api;

// Auth API
export const authService = {
  login: (email: string, password: string) => api.post('/v1/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string }) => api.post('/v1/auth/register', data),
  me: () => api.get('/v1/api/users/me'),
  updateProfile: (data: any) => api.put('/v1/api/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/v1/api/users/me/password', data),

  // 2FA
  get2FAStatus: () => api.get('/v1/api/auth/2fa/status'),
  enable2FA: () => api.post('/v1/api/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/v1/api/auth/2fa/verify', { code }),
  disable2FA: (code: string) => api.delete('/v1/api/auth/2fa/disable', { data: { code } }),
  regenerateBackupCodes: (code: string) =>
    api.post('/v1/api/auth/2fa/regenerate-backup-codes', { code }),
};

// Link API
export const linkService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; folderId?: string }) =>
    linkApi.get('/v1/api/links', { params }),
  getOne: (id: string) => linkApi.get(`/api/links/${id}`),
  create: (data: { originalUrl: string; customCode?: string; title?: string; tags?: string[] }) =>
    linkApi.post('/v1/api/links', data),
  update: (id: string, data: any) => linkApi.put(`/api/links/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/links/${id}`),
  getStats: (id: string) => linkApi.get(`/api/links/${id}/stats`),
  bulkCreate: (links: Array<{ originalUrl: string; title?: string }>) =>
    linkApi.post('/v1/api/links/bulk', { links }),
  bulkOperation: (ids: string[], operation: string, data?: any) =>
    linkApi.post('/v1/api/links/bulk/operation', { ids, operation, ...data }),
};

// Analytics API
export const analyticsService = {
  getSummary: () => analyticsApi.get('/v1/api/analytics/summary'),
  getLinkAnalytics: (linkId: string, params?: { startDate?: string; endDate?: string }) =>
    analyticsApi.get(`/api/analytics/links/${linkId}`, { params }),
  getTeamAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    analyticsApi.get('/v1/api/analytics/team', { params }),
  getRealtime: (linkId: string) => analyticsApi.get(`/api/analytics/links/${linkId}/realtime`),
};

// QR Code API
export const qrService = {
  generate: (data: {
    content: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: File;
    logoSize?: number;
    margin?: number;
    dotStyle?: string;
    cornerStyle?: string;
    errorCorrectionLevel?: string;
  }) => qrApi.post('/v1/api/qr/generate', { url: data.content, options: data }, { responseType: 'blob' }),

  // 多类型二维码生成
  generateTyped: (data: {
    contentType: string;
    content: any;
    options?: {
      size?: number;
      foregroundColor?: string;
      backgroundColor?: string;
      format?: 'png' | 'svg' | 'pdf' | 'eps';
      margin?: number;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    };
  }) => qrApi.post('/v1/api/qr/generate/typed', data, { responseType: 'blob' }),

  getStyles: () => qrApi.get('/v1/api/qr/styles'),
  getContentTypes: () => qrApi.get('/v1/api/qr/content-types'),
};

// Deep Link API
export const deepLinkService = {
  get: (linkId: string) => linkApi.get(`/api/links/${linkId}/deep-link`),
  create: (linkId: string, data: {
    iosConfig?: {
      appStoreId?: string;
      bundleId?: string;
      universalLink?: string;
      customScheme?: string;
    };
    androidConfig?: {
      packageName?: string;
      sha256Fingerprint?: string;
      appLink?: string;
      customScheme?: string;
    };
    fallbackUrl?: string;
    fallbackBehavior?: 'redirect' | 'app_store' | 'custom';
  }) => linkApi.post(`/api/links/${linkId}/deep-link`, data),
  update: (linkId: string, data: any) => linkApi.put(`/api/links/${linkId}/deep-link`, data),
  delete: (linkId: string) => linkApi.delete(`/api/links/${linkId}/deep-link`),
  resolve: (linkId: string, userAgent?: string) =>
    linkApi.post(`/api/links/${linkId}/deep-link/resolve`, { userAgent }),
};

// A/B Test API
export const abTestService = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    linkApi.get('/v1/api/ab-tests', { params }),
  getOne: (id: string) => linkApi.get(`/api/ab-tests/${id}`),
  create: (data: {
    name: string;
    linkId: string;
    variants: Array<{ name: string; url: string; weight: number }>;
    targetMetric?: string;
  }) => linkApi.post('/v1/api/ab-tests', data),
  update: (id: string, data: any) => linkApi.put(`/api/ab-tests/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/ab-tests/${id}`),
  getStats: (id: string) => linkApi.get(`/api/ab-tests/${id}/stats`),
  getComparison: (id: string) => linkApi.get(`/api/ab-tests/${id}/comparison`),
  start: (id: string) => linkApi.post(`/api/ab-tests/${id}/start`),
  pause: (id: string) => linkApi.post(`/api/ab-tests/${id}/pause`),
  complete: (id: string, winnerId?: string) =>
    linkApi.post(`/api/ab-tests/${id}/complete`, { winnerId }),
};

// Folder API
export const folderService = {
  getAll: () => linkApi.get('/v1/api/folders'),
  getTree: () => linkApi.get('/v1/api/folders/tree'),
  getOne: (id: string) => linkApi.get(`/api/folders/${id}`),
  create: (data: { name: string; color?: string; icon?: string; parentId?: string }) =>
    linkApi.post('/v1/api/folders', data),
  update: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    linkApi.put(`/api/folders/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/folders/${id}`),
  reorder: (orderedIds: string[]) => linkApi.post('/v1/api/folders/reorder', { orderedIds }),
};

// Link Template API
export const linkTemplateService = {
  getAll: (params?: { page?: number; limit?: number; search?: string; favoritesOnly?: boolean }) =>
    linkApi.get('/v1/api/link-templates', { params }),
  getOne: (id: string) => linkApi.get(`/api/link-templates/${id}`),
  create: (data: any) => linkApi.post('/v1/api/link-templates', data),
  update: (id: string, data: any) => linkApi.put(`/api/link-templates/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/link-templates/${id}`),
  toggleFavorite: (id: string) => linkApi.post(`/api/link-templates/${id}/favorite`),
  createLinkFromTemplate: (data: { templateId: string; originalUrl: string; customSlug?: string; title?: string }) =>
    linkApi.post('/v1/api/link-templates/create-link', data),
  getPresets: () => linkApi.get('/v1/api/link-templates/presets'),
  getPresetsByCategory: (category: string) => linkApi.get(`/api/link-templates/presets/category/${category}`),
  createFromPreset: (presetId: string, name: string) =>
    linkApi.post('/v1/api/link-templates/from-preset', { presetId, name }),
  getMostUsed: (limit?: number) => linkApi.get('/v1/api/link-templates/most-used', { params: { limit } }),
  getRecentlyUsed: (limit?: number) => linkApi.get('/v1/api/link-templates/recently-used', { params: { limit } }),
};

// Redirect Rules API
export const redirectRulesService = {
  getAll: (linkId: string) => linkApi.get(`/api/redirect-rules/link/${linkId}`),
  getOne: (id: string) => linkApi.get(`/api/redirect-rules/${id}`),
  create: (linkId: string, data: any) => linkApi.post(`/api/redirect-rules/link/${linkId}`, data),
  update: (id: string, data: any) => linkApi.put(`/api/redirect-rules/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/redirect-rules/${id}`),
  toggle: (id: string) => linkApi.post(`/api/redirect-rules/${id}/toggle`),
  reorder: (linkId: string, ruleIds: string[]) =>
    linkApi.post(`/api/redirect-rules/link/${linkId}/reorder`, { ruleIds }),
  getStats: (linkId: string) => linkApi.get(`/api/redirect-rules/link/${linkId}/stats`),
};

// Security API
export const securityService = {
  analyze: (url: string) => linkApi.post('/v1/api/security/analyze', { url }),
  quickCheck: (url: string) => linkApi.post('/v1/api/security/quick-check', { url }),
  batchScan: (urls: string[]) => linkApi.post('/v1/api/security/batch-scan', { urls }),
  getScanHistory: (url: string, limit?: number) =>
    linkApi.get('/v1/api/security/history', { params: { url, limit } }),
  getStats: () => linkApi.get('/v1/api/security/stats'),
  // Suspended links management
  getSuspendedLinks: (params?: { limit?: number; offset?: number }) =>
    linkApi.get('/v1/api/security/suspended-links', { params }),
  reinstateLink: (linkId: string, reason: string) =>
    linkApi.post(`/api/security/suspended-links/${linkId}/reinstate`, { reason }),
  checkAndHandle: (url: string) =>
    linkApi.post('/v1/api/security/check-and-handle', { url }),
};

// API Keys API
export const apiKeyService = {
  getAll: () => api.get('/v1/api/api-keys'),
  getOne: (id: string) => api.get(`/api/api-keys/${id}`),
  create: (data: {
    name: string;
    scopes: string[];
    expiresAt?: string;
    ipWhitelist?: string[];
  }) => api.post('/v1/api/api-keys', data),
  update: (id: string, data: { name?: string; scopes?: string[]; ipWhitelist?: string[] }) =>
    api.put(`/api/api-keys/${id}`, data),
  delete: (id: string) => api.delete(`/api/api-keys/${id}`),
  revoke: (id: string) => api.post(`/api/api-keys/${id}/revoke`),
  regenerate: (id: string) => api.post(`/api/api-keys/${id}/regenerate`),
  getScopes: () => api.get('/v1/api/api-keys/scopes/list'),
};

// Billing API
export const billingService = {
  // Subscription
  getSubscription: () => api.get('/v1/api/billing/subscription'),
  createSubscription: (data: { priceId: string }) => api.post('/v1/api/billing/subscription', data),
  updateSubscription: (data: { priceId: string }) => api.put('/v1/api/billing/subscription', data),
  cancelSubscription: () => api.delete('/v1/api/billing/subscription'),

  // Pricing
  getPricing: () => api.get('/v1/api/billing/pricing'),

  // Invoices
  getInvoices: (params?: { limit?: number; starting_after?: string }) =>
    api.get('/v1/api/billing/invoices', { params }),
  downloadInvoice: (invoiceId: string) =>
    api.get(`/api/billing/invoices/${invoiceId}/download`, { responseType: 'blob' }),

  // Stripe
  createCheckoutSession: (data: { priceId: string; successUrl: string; cancelUrl: string }) =>
    api.post('/v1/api/stripe/checkout', data),
  createPortalSession: (data: { returnUrl: string }) => api.post('/v1/api/stripe/portal', data),
  getPaymentMethods: () => api.get('/v1/api/stripe/payment-methods'),
  setDefaultPaymentMethod: (paymentMethodId: string) =>
    api.post('/v1/api/stripe/payment-methods/default', { paymentMethodId }),
  deletePaymentMethod: (paymentMethodId: string) =>
    api.delete(`/api/stripe/payment-methods/${paymentMethodId}`),
};

// Privacy API
export const privacyService = {
  getOverview: () => api.get('/v1/api/privacy/overview'),
  getConsents: () => api.get('/v1/api/privacy/consents'),
  updateConsents: (data: Record<string, boolean>) => api.post('/v1/api/privacy/consents', data),
  requestExport: () => api.post('/v1/api/privacy/export'),
  requestDeleteAccount: () => api.post('/v1/api/privacy/delete-account'),
  cancelDeleteRequest: () => api.delete('/v1/api/privacy/delete-account'),
  getRights: () => api.get('/v1/api/privacy/rights'),
};

// Quota API
export const quotaService = {
  getUsage: () => api.get('/v1/api/quota'),
  getLimits: () => api.get('/v1/api/quota/limits'),
  getLogs: (params?: { limit?: number; offset?: number }) =>
    api.get('/v1/api/quota/logs', { params }),
};

// User/Team API
export const userService = {
  // Team management
  getCurrentTeam: () => api.get('/v1/api/teams/current'),
  getTeamMembers: (teamId: string) => api.get(`/api/teams/${teamId}/members`),
  getTeamInvitations: (teamId: string) => api.get(`/api/teams/${teamId}/invitations`),
  inviteTeamMember: (teamId: string, data: { email: string; role: string }) =>
    api.post(`/api/teams/${teamId}/members/invite`, data),
  updateTeamMemberRole: (teamId: string, memberId: string, data: { role: string }) =>
    api.patch(`/api/teams/${teamId}/members/${memberId}`, data),
  removeTeamMember: (teamId: string, memberId: string) =>
    api.delete(`/api/teams/${teamId}/members/${memberId}`),
  cancelTeamInvitation: (teamId: string, invitationId: string) =>
    api.delete(`/api/teams/${teamId}/invitations/${invitationId}`),
  resendTeamInvitation: (teamId: string, invitationId: string) =>
    api.post(`/api/teams/${teamId}/invitations/${invitationId}/resend`),
  updateTeam: (teamId: string, data: any) => api.patch(`/api/teams/${teamId}`, data),
};

// Campaign API uses the same api-gateway
const campaignApi = api;

// Goals API
export const goalsService = {
  getAll: (params?: { campaignId?: string }) =>
    campaignApi.get('/v1/api/goals', { params }),
  getOne: (id: string) => campaignApi.get(`/api/goals/${id}`),
  create: (data: any) => campaignApi.post('/v1/api/goals', data),
  update: (id: string, data: any) => campaignApi.patch(`/api/goals/${id}`, data),
  delete: (id: string) => campaignApi.delete(`/api/goals/${id}`),
  getStats: () => campaignApi.get('/v1/api/goals/stats'),
  pause: (id: string) => campaignApi.post(`/api/goals/${id}/pause`),
  resume: (id: string) => campaignApi.post(`/api/goals/${id}/resume`),
  getHistory: (id: string) => campaignApi.get(`/api/goals/${id}/history`),
  getProjection: (id: string) => campaignApi.get(`/api/goals/${id}/projection`),
  getTrends: (id: string, period?: string) =>
    campaignApi.get(`/api/goals/${id}/trends`, { params: { period } }),
  compareGoals: (goalId1: string, goalId2: string) =>
    campaignApi.get('/v1/api/goals/compare', { params: { goal1: goalId1, goal2: goalId2 } }),
  getTeamStats: (teamId?: string) =>
    campaignApi.get('/v1/api/goals/team-stats', { params: { teamId } }),
  updateProgress: (id: string, value: number, source?: string) =>
    campaignApi.post(`/api/goals/${id}/progress`, { value, source }),
  recalculateProjection: (id: string) =>
    campaignApi.post(`/api/goals/${id}/projection/recalculate`),
};

// Page API uses the same api-gateway
const pageApi = api;

// Bio Links API
export const bioLinksService = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    pageApi.get('/v1/api/bio-links', { params }),
  getOne: (id: string) => pageApi.get(`/api/bio-links/${id}`),
  getByUsername: (username: string) => pageApi.get(`/api/bio-links/username/${username}`),
  create: (data: any) => pageApi.post('/v1/api/bio-links', data),
  update: (id: string, data: any) => pageApi.patch(`/api/bio-links/${id}`, data),
  delete: (id: string) => pageApi.delete(`/api/bio-links/${id}`),
  publish: (id: string) => pageApi.post(`/api/bio-links/${id}/publish`),
  unpublish: (id: string) => pageApi.post(`/api/bio-links/${id}/unpublish`),
  checkUsernameAvailability: (username: string) =>
    pageApi.get('/v1/api/bio-links/check-username', { params: { username } }),
  getAnalytics: (id: string, params?: { startDate?: string; endDate?: string }) =>
    pageApi.get(`/api/bio-links/${id}/analytics`, { params }),
  // Block management
  getBlocks: (bioLinkId: string) => pageApi.get(`/api/bio-links/${bioLinkId}/blocks`),
  createBlock: (bioLinkId: string, data: any) =>
    pageApi.post(`/api/bio-links/${bioLinkId}/blocks`, data),
  updateBlock: (bioLinkId: string, blockId: string, data: any) =>
    pageApi.patch(`/api/bio-links/${bioLinkId}/blocks/${blockId}`, data),
  deleteBlock: (bioLinkId: string, blockId: string) =>
    pageApi.delete(`/api/bio-links/${bioLinkId}/blocks/${blockId}`),
  reorderBlocks: (bioLinkId: string, blockIds: string[]) =>
    pageApi.post(`/api/bio-links/${bioLinkId}/blocks/reorder`, { blockIds }),
};

// Saved Search API
export const savedSearchService = {
  getAll: () => linkApi.get('/v1/api/saved-searches'),
  getOne: (id: string) => linkApi.get(`/api/saved-searches/${id}`),
  create: (data: any) => linkApi.post('/v1/api/saved-searches', data),
  update: (id: string, data: any) => linkApi.patch(`/api/saved-searches/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/saved-searches/${id}`),
  execute: (id: string) => linkApi.post(`/api/saved-searches/${id}/execute`),
  testNotification: (id: string) => linkApi.post(`/api/saved-searches/${id}/test-notification`),
  getMatchCount: (id: string) => linkApi.get(`/api/saved-searches/${id}/match-count`),
};
