import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// All API calls go through api-gateway
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:60000';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _isRetry?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Token refresh state
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(`${API_GATEWAY_URL}/api/v1/auth/refresh`, { refreshToken });
    const newAccessToken = response.data.accessToken;
    const newRefreshToken = response.data.refreshToken;

    localStorage.setItem('token', newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }

    return newAccessToken;
  } catch {
    // Refresh failed, clear tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return null;
  }
};

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

      // Handle 401 - unauthorized (try token refresh)
      if (error.response?.status === 401 && !config._isRetry) {
        // Skip refresh for auth endpoints
        if (config.url?.includes('/api/v1/auth/')) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Wait for the token refresh to complete
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken: string) => {
              config.headers.Authorization = `Bearer ${newToken}`;
              config._isRetry = true;
              resolve(client(config));
            });
            // Timeout after 10 seconds
            setTimeout(() => reject(error), 10000);
          });
        }

        isRefreshing = true;

        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;

          if (newToken) {
            onTokenRefreshed(newToken);
            config.headers.Authorization = `Bearer ${newToken}`;
            config._isRetry = true;
            return client(config);
          } else {
            // Refresh failed
            window.location.href = '/login';
            return Promise.reject(error);
          }
        } catch (refreshError) {
          isRefreshing = false;
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }
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
  login: (email: string, password: string) => api.post('/api/v1/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string }) => api.post('/api/v1/auth/register', data),
  refreshToken: (refreshToken: string) => api.post('/api/v1/auth/refresh', { refreshToken }),
  me: () => api.get('/api/v1/users/me'),
  updateProfile: (data: any) => api.put('/api/v1/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/v1/users/me/password', data),

  // 2FA
  get2FAStatus: () => api.get('/api/v1/auth/2fa/status'),
  enable2FA: () => api.post('/api/v1/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/api/v1/auth/2fa/verify', { code }),
  disable2FA: (code: string) => api.delete('/api/v1/auth/2fa/disable', { data: { code } }),
  regenerateBackupCodes: (code: string) =>
    api.post('/api/v1/auth/2fa/regenerate-backup-codes', { code }),
};

// Link API
export const linkService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; folderId?: string }) =>
    linkApi.get('/api/v1/links', { params }),
  getOne: (id: string) => linkApi.get(`/api/v1/links/${id}`),
  create: (data: { originalUrl: string; customCode?: string; title?: string; tags?: string[] }) =>
    linkApi.post('/api/v1/links', data),
  update: (id: string, data: any) => linkApi.put(`/api/v1/links/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/v1/links/${id}`),
  getStats: (id: string) => linkApi.get(`/api/v1/links/${id}/stats`),
  bulkCreate: (links: Array<{ originalUrl: string; title?: string }>) =>
    linkApi.post('/api/v1/links/bulk', { links }),
  bulkOperation: (ids: string[], operation: string, data?: any) =>
    linkApi.post('/api/v1/links/bulk/operation', { ids, operation, ...data }),
};

// Analytics API (通过 api-gateway 代理到 analytics-service)
export const analyticsService = {
  getSummary: () => analyticsApi.get('/api/v1/analytics/team'),
  getLinkAnalytics: (linkId: string, params?: { startDate?: string; endDate?: string }) =>
    analyticsApi.get(`/api/v1/analytics/link/${linkId}`, { params }),
  getTeamAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    analyticsApi.get('/api/v1/analytics/team', { params }),
  getRealtime: (linkId: string) => analyticsApi.get(`/api/v1/analytics/realtime/${linkId}`),
  getTeamRealtime: (teamId: string) => analyticsApi.get(`/api/v1/analytics/realtime/team/${teamId}`),
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
  }) => qrApi.post('/api/v1/qr/generate', { url: data.content, options: data }, { responseType: 'blob' }),

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
  }) => qrApi.post('/api/v1/qr/generate/typed', data, { responseType: 'blob' }),

  getStyles: () => qrApi.get('/api/v1/qr/styles'),
  getContentTypes: () => qrApi.get('/api/v1/qr/content-types'),
};

// Deep Link API (deeplink-service: 60008)
export const deepLinkService = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/api/v1/deeplinks', { params }),
  get: (id: string) => api.get(`/api/v1/deeplinks/${id}`),
  create: (data: {
    linkId?: string;
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
  }) => api.post('/api/v1/deeplinks', data),
  update: (id: string, data: any) => api.put(`/api/v1/deeplinks/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/deeplinks/${id}`),
  resolve: (id: string, userAgent?: string) =>
    api.post(`/api/v1/deeplinks/${id}/resolve`, { userAgent }),
};

// A/B Test API
export const abTestService = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    linkApi.get('/api/v1/ab-tests', { params }),
  getOne: (id: string) => linkApi.get(`/api/v1/ab-tests/${id}`),
  create: (data: {
    name: string;
    linkId: string;
    variants: Array<{ name: string; url: string; weight: number }>;
    targetMetric?: string;
  }) => linkApi.post('/api/v1/ab-tests', data),
  update: (id: string, data: any) => linkApi.put(`/api/v1/ab-tests/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/v1/ab-tests/${id}`),
  getStats: (id: string) => linkApi.get(`/api/v1/ab-tests/${id}/stats`),
  getComparison: (id: string) => linkApi.get(`/api/v1/ab-tests/${id}/comparison`),
  start: (id: string) => linkApi.post(`/api/v1/ab-tests/${id}/start`),
  pause: (id: string) => linkApi.post(`/api/v1/ab-tests/${id}/pause`),
  complete: (id: string, winnerId?: string) =>
    linkApi.post(`/api/v1/ab-tests/${id}/complete`, { winnerId }),
};

// Folder API
export const folderService = {
  getAll: () => linkApi.get('/api/v1/folders'),
  getTree: () => linkApi.get('/api/v1/folders/tree'),
  getOne: (id: string) => linkApi.get(`/api/v1/folders/${id}`),
  create: (data: { name: string; color?: string; icon?: string; parentId?: string }) =>
    linkApi.post('/api/v1/folders', data),
  update: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    linkApi.put(`/api/v1/folders/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/v1/folders/${id}`),
  reorder: (orderedIds: string[]) => linkApi.post('/api/v1/folders/reorder', { orderedIds }),
};

// Link Template API
export const linkTemplateService = {
  getAll: (params?: { page?: number; limit?: number; search?: string; favoritesOnly?: boolean }) =>
    linkApi.get('/api/v1/link-templates', { params }),
  getOne: (id: string) => linkApi.get(`/api/v1/link-templates/${id}`),
  create: (data: any) => linkApi.post('/api/v1/link-templates', data),
  update: (id: string, data: any) => linkApi.put(`/api/v1/link-templates/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/v1/link-templates/${id}`),
  toggleFavorite: (id: string) => linkApi.post(`/api/v1/link-templates/${id}/favorite`),
  createLinkFromTemplate: (data: { templateId: string; originalUrl: string; customSlug?: string; title?: string }) =>
    linkApi.post('/api/v1/link-templates/create-link', data),
  getPresets: () => linkApi.get('/api/v1/link-templates/presets'),
  getPresetsByCategory: (category: string) => linkApi.get(`/api/v1/link-templates/presets/category/${category}`),
  createFromPreset: (presetId: string, name: string) =>
    linkApi.post('/api/v1/link-templates/from-preset', { presetId, name }),
  getMostUsed: (limit?: number) => linkApi.get('/api/v1/link-templates/most-used', { params: { limit } }),
  getRecentlyUsed: (limit?: number) => linkApi.get('/api/v1/link-templates/recently-used', { params: { limit } }),
};

// Redirect Rules API
export const redirectRulesService = {
  getAll: (linkId: string) => linkApi.get(`/api/v1/redirect-rules/link/${linkId}`),
  getOne: (id: string) => linkApi.get(`/api/v1/redirect-rules/${id}`),
  create: (linkId: string, data: any) => linkApi.post(`/api/v1/redirect-rules/link/${linkId}`, data),
  update: (id: string, data: any) => linkApi.put(`/api/v1/redirect-rules/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/v1/redirect-rules/${id}`),
  toggle: (id: string) => linkApi.post(`/api/v1/redirect-rules/${id}/toggle`),
  reorder: (linkId: string, ruleIds: string[]) =>
    linkApi.post(`/api/v1/redirect-rules/link/${linkId}/reorder`, { ruleIds }),
  getStats: (linkId: string) => linkApi.get(`/api/v1/redirect-rules/link/${linkId}/stats`),
};

// Security API
export const securityService = {
  analyze: (url: string) => linkApi.post('/api/v1/security/analyze', { url }),
  quickCheck: (url: string) => linkApi.post('/api/v1/security/quick-check', { url }),
  batchScan: (urls: string[]) => linkApi.post('/api/v1/security/batch-scan', { urls }),
  getScanHistory: (url: string, limit?: number) =>
    linkApi.get('/api/v1/security/history', { params: { url, limit } }),
  getStats: () => linkApi.get('/api/v1/security/stats'),
  // Suspended links management
  getSuspendedLinks: (params?: { limit?: number; offset?: number }) =>
    linkApi.get('/api/v1/security/suspended-links', { params }),
  reinstateLink: (linkId: string, reason: string) =>
    linkApi.post(`/api/v1/security/suspended-links/${linkId}/reinstate`, { reason }),
  checkAndHandle: (url: string) =>
    linkApi.post('/api/v1/security/check-and-handle', { url }),
};

// API Keys API
export const apiKeyService = {
  getAll: () => api.get('/api/v1/api-keys'),
  getOne: (id: string) => api.get(`/api/v1/api-keys/${id}`),
  create: (data: {
    name: string;
    scopes: string[];
    expiresAt?: string;
    ipWhitelist?: string[];
  }) => api.post('/api/v1/api-keys', data),
  update: (id: string, data: { name?: string; scopes?: string[]; ipWhitelist?: string[] }) =>
    api.put(`/api/v1/api-keys/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/api-keys/${id}`),
  revoke: (id: string) => api.post(`/api/v1/api-keys/${id}/revoke`),
  regenerate: (id: string) => api.post(`/api/v1/api-keys/${id}/regenerate`),
  getScopes: () => api.get('/api/v1/api-keys/scopes/list'),
};

// Billing API
export const billingService = {
  // Subscription
  getSubscription: () => api.get('/api/v1/billing/subscription'),
  createSubscription: (data: { priceId: string }) => api.post('/api/v1/billing/subscription', data),
  updateSubscription: (data: { priceId: string }) => api.put('/api/v1/billing/subscription', data),
  cancelSubscription: () => api.delete('/api/v1/billing/subscription'),

  // Pricing
  getPricing: () => api.get('/api/v1/billing/pricing'),

  // Invoices
  getInvoices: (params?: { limit?: number; starting_after?: string }) =>
    api.get('/api/v1/billing/invoices', { params }),
  downloadInvoice: (invoiceId: string) =>
    api.get(`/api/v1/billing/invoices/${invoiceId}/download`, { responseType: 'blob' }),

  // Stripe
  createCheckoutSession: (data: { priceId: string; successUrl: string; cancelUrl: string }) =>
    api.post('/api/v1/stripe/checkout', data),
  createPortalSession: (data: { returnUrl: string }) => api.post('/api/v1/stripe/portal', data),
  getPaymentMethods: () => api.get('/api/v1/stripe/payment-methods'),
  setDefaultPaymentMethod: (paymentMethodId: string) =>
    api.post('/api/v1/stripe/payment-methods/default', { paymentMethodId }),
  deletePaymentMethod: (paymentMethodId: string) =>
    api.delete(`/api/v1/stripe/payment-methods/${paymentMethodId}`),
};

// Privacy API
export const privacyService = {
  getOverview: () => api.get('/api/v1/privacy/overview'),
  getConsents: () => api.get('/api/v1/privacy/consents'),
  updateConsents: (data: Record<string, boolean>) => api.post('/api/v1/privacy/consents', data),
  requestExport: () => api.post('/api/v1/privacy/export'),
  requestDeleteAccount: () => api.post('/api/v1/privacy/delete-account'),
  cancelDeleteRequest: () => api.delete('/api/v1/privacy/delete-account'),
  getRights: () => api.get('/api/v1/privacy/rights'),
};

// Quota API
export const quotaService = {
  getUsage: () => api.get('/api/v1/quota'),
  getLimits: () => api.get('/api/v1/quota/limits'),
  getLogs: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/v1/quota/logs', { params }),
};

// User/Team API
export const userService = {
  // Team management
  getCurrentTeam: () => api.get('/api/v1/teams/current'),
  createTeam: (data: { name: string }) => api.post('/api/v1/teams', data),
  getTeamMembers: (teamId: string) => api.get(`/api/v1/teams/${teamId}/members`),
  getTeamInvitations: (teamId: string) => api.get(`/api/v1/teams/${teamId}/invitations`),
  inviteTeamMember: (teamId: string, data: { email: string; role: string }) =>
    api.post(`/api/v1/teams/${teamId}/members/invite`, data),
  updateTeamMemberRole: (teamId: string, memberId: string, data: { role: string }) =>
    api.patch(`/api/v1/teams/${teamId}/members/${memberId}`, data),
  removeTeamMember: (teamId: string, memberId: string) =>
    api.delete(`/api/v1/teams/${teamId}/members/${memberId}`),
  cancelTeamInvitation: (teamId: string, invitationId: string) =>
    api.delete(`/api/v1/teams/${teamId}/invitations/${invitationId}`),
  resendTeamInvitation: (teamId: string, invitationId: string) =>
    api.post(`/api/v1/teams/${teamId}/invitations/${invitationId}/resend`),
  updateTeam: (teamId: string, data: any) => api.patch(`/api/v1/teams/${teamId}`, data),
};

// Campaign API uses the same api-gateway
const campaignApi = api;

// Goals API
export const goalsService = {
  getAll: (params?: { campaignId?: string }) =>
    campaignApi.get('/api/v1/goals', { params }),
  getOne: (id: string) => campaignApi.get(`/api/v1/goals/${id}`),
  create: (data: any) => campaignApi.post('/api/v1/goals', data),
  update: (id: string, data: any) => campaignApi.patch(`/api/v1/goals/${id}`, data),
  delete: (id: string) => campaignApi.delete(`/api/v1/goals/${id}`),
  getStats: () => campaignApi.get('/api/v1/goals/stats'),
  pause: (id: string) => campaignApi.post(`/api/v1/goals/${id}/pause`),
  resume: (id: string) => campaignApi.post(`/api/v1/goals/${id}/resume`),
  getHistory: (id: string) => campaignApi.get(`/api/v1/goals/${id}/history`),
  getProjection: (id: string) => campaignApi.get(`/api/v1/goals/${id}/projection`),
  getTrends: (id: string, period?: string) =>
    campaignApi.get(`/api/v1/goals/${id}/trends`, { params: { period } }),
  compareGoals: (goalId1: string, goalId2: string) =>
    campaignApi.get('/api/v1/goals/compare', { params: { goal1: goalId1, goal2: goalId2 } }),
  getTeamStats: (teamId?: string) =>
    campaignApi.get('/api/v1/goals/team-stats', { params: { teamId } }),
  updateProgress: (id: string, value: number, source?: string) =>
    campaignApi.post(`/api/v1/goals/${id}/progress`, { value, source }),
  recalculateProjection: (id: string) =>
    campaignApi.post(`/api/v1/goals/${id}/projection/recalculate`),
};

// Page API uses the same api-gateway
const pageApi = api;

// Bio Links API (page-service: 60007)
export const bioLinksService = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    pageApi.get('/api/v1/bio-links', { params }),
  getOne: (id: string) => pageApi.get(`/api/v1/bio-links/${id}`),
  getByUsername: (username: string) => pageApi.get(`/api/v1/bio-links/username/${username}`),
  create: (data: any) => pageApi.post('/api/v1/bio-links', data),
  update: (id: string, data: any) => pageApi.patch(`/api/v1/bio-links/${id}`, data),
  delete: (id: string) => pageApi.delete(`/api/v1/bio-links/${id}`),
  publish: (id: string) => pageApi.post(`/api/v1/bio-links/${id}/publish`),
  unpublish: (id: string) => pageApi.post(`/api/v1/bio-links/${id}/unpublish`),
  checkUsernameAvailability: (username: string) =>
    pageApi.get('/api/v1/bio-links/check-username', { params: { username } }),
  getAnalytics: (id: string, params?: { startDate?: string; endDate?: string }) =>
    pageApi.get(`/api/v1/bio-links/${id}/analytics`, { params }),
  // Block management
  getBlocks: (bioLinkId: string) => pageApi.get(`/api/v1/bio-links/${bioLinkId}/blocks`),
  createBlock: (bioLinkId: string, data: any) =>
    pageApi.post(`/api/v1/bio-links/${bioLinkId}/blocks`, data),
  updateBlock: (bioLinkId: string, blockId: string, data: any) =>
    pageApi.patch(`/api/v1/bio-links/${bioLinkId}/blocks/${blockId}`, data),
  deleteBlock: (bioLinkId: string, blockId: string) =>
    pageApi.delete(`/api/v1/bio-links/${bioLinkId}/blocks/${blockId}`),
  reorderBlocks: (bioLinkId: string, blockIds: string[]) =>
    pageApi.post(`/api/v1/bio-links/${bioLinkId}/blocks/reorder`, { blockIds }),
};

// Saved Search API
export const savedSearchService = {
  getAll: () => linkApi.get('/api/v1/saved-searches'),
  getOne: (id: string) => linkApi.get(`/api/v1/saved-searches/${id}`),
  create: (data: any) => linkApi.post('/api/v1/saved-searches', data),
  update: (id: string, data: any) => linkApi.patch(`/api/v1/saved-searches/${id}`, data),
  delete: (id: string) => linkApi.delete(`/api/v1/saved-searches/${id}`),
  execute: (id: string) => linkApi.post(`/api/v1/saved-searches/${id}/execute`),
  testNotification: (id: string) => linkApi.post(`/api/v1/saved-searches/${id}/test-notification`),
  getMatchCount: (id: string) => linkApi.get(`/api/v1/saved-searches/${id}/match-count`),
};

// Domain API (domain-service: 60014)
export const domainService = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/api/v1/domains', { params }),
  getOne: (id: string) => api.get(`/api/v1/domains/${id}`),
  create: (data: { domain: string; isDefault?: boolean }) =>
    api.post('/api/v1/domains', data),
  update: (id: string, data: any) => api.put(`/api/v1/domains/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/domains/${id}`),
  verify: (id: string) => api.post(`/api/v1/domains/${id}/verify`),
  setDefault: (id: string) => api.post(`/api/v1/domains/${id}/set-default`),
  getDnsRecords: (id: string) => api.get(`/api/v1/domains/${id}/dns-records`),
};

// Notification API (notification-service: 60020)
export const notificationService = {
  getAll: (params?: { page?: number; limit?: number; read?: boolean }) =>
    api.get('/api/v1/notifications', { params }),
  getOne: (id: string) => api.get(`/api/v1/notifications/${id}`),
  markAsRead: (id: string) => api.post(`/api/v1/notifications/${id}/read`),
  markAllAsRead: () => api.post('/api/v1/notifications/read-all'),
  delete: (id: string) => api.delete(`/api/v1/notifications/${id}`),
  getUnreadCount: () => api.get('/api/v1/notifications/unread-count'),
  getPreferences: () => api.get('/api/v1/notifications/preferences'),
  updatePreferences: (data: any) => api.put('/api/v1/notifications/preferences', data),
};

// Webhook API (webhook-service: 60017)
export const webhookService = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/api/v1/webhooks', { params }),
  getOne: (id: string) => api.get(`/api/v1/webhooks/${id}`),
  create: (data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    active?: boolean;
  }) => api.post('/api/v1/webhooks', data),
  update: (id: string, data: any) => api.put(`/api/v1/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/webhooks/${id}`),
  test: (id: string) => api.post(`/api/v1/webhooks/${id}/test`),
  getLogs: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/api/v1/webhooks/${id}/logs`, { params }),
  getEvents: () => api.get('/api/v1/webhooks/events'),
};

// Campaign API (campaign-service: 60004)
export const campaignService = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/api/v1/campaigns', { params }),
  getOne: (id: string) => api.get(`/api/v1/campaigns/${id}`),
  create: (data: any) => api.post('/api/v1/campaigns', data),
  update: (id: string, data: any) => api.put(`/api/v1/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/campaigns/${id}`),
  getStats: (id: string) => api.get(`/api/v1/campaigns/${id}/stats`),
  start: (id: string) => api.post(`/api/v1/campaigns/${id}/start`),
  pause: (id: string) => api.post(`/api/v1/campaigns/${id}/pause`),
  complete: (id: string) => api.post(`/api/v1/campaigns/${id}/complete`),
};

// Integration API (integration-service: 60016)
export const integrationService = {
  // General integrations
  getAll: () => api.get('/api/v1/integrations'),
  getOne: (id: string) => api.get(`/api/v1/integrations/${id}`),
  connect: (platform: string, data: any) =>
    api.post(`/api/v1/integrations/${platform}/connect`, data),
  disconnect: (id: string) => api.delete(`/api/v1/integrations/${id}`),
  sync: (id: string) => api.post(`/api/v1/integrations/${id}/sync`),

  // Zapier
  getZapierWebhooks: () => api.get('/api/v1/zapier/webhooks'),
  createZapierWebhook: (data: any) => api.post('/api/v1/zapier/webhooks', data),

  // HubSpot
  getHubSpotContacts: (params?: any) => api.get('/api/v1/hubspot/contacts', { params }),
  syncHubSpotContacts: () => api.post('/api/v1/hubspot/sync'),

  // Salesforce
  getSalesforceLeads: (params?: any) => api.get('/api/v1/salesforce/leads', { params }),
  syncSalesforceLeads: () => api.post('/api/v1/salesforce/sync'),

  // Shopify
  getShopifyProducts: (params?: any) => api.get('/api/v1/shopify/products', { params }),
  createShopifyLink: (productId: string) => api.post(`/api/v1/shopify/products/${productId}/link`),
};
