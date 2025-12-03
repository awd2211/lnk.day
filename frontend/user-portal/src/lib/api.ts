import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// All API calls go through api-gateway
// 默认为空字符串，这样请求会发送到当前域名的相对路径
// 开发时可以设置 VITE_API_GATEWAY_URL=http://localhost:60000
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || '';

// Page service URL for bio link preview
export const PAGE_SERVICE_URL = import.meta.env.VITE_PAGE_SERVICE_URL || 'http://localhost:60007';

// Bio link public URL
export const getBioLinkPublicUrl = (username: string, preview = false): string => {
  const previewParam = preview ? '?preview=true' : '';
  // 生产环境使用 app.lnk.day 域名
  return `https://app.lnk.day/u/${username}${previewParam}`;
};

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

  // Request interceptor - add auth token and team id
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add team id header for scoped APIs
    const teamId = localStorage.getItem('teamId');
    if (teamId) {
      config.headers['x-team-id'] = teamId;
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

/** @deprecated 使用 api 代替，所有 API 都通过 api-gateway 统一访问 */
export const linkApi = api;
/** @deprecated 使用 api 代替，所有 API 都通过 api-gateway 统一访问 */
export const analyticsApi = api;
/** @deprecated 使用 api 代替，所有 API 都通过 api-gateway 统一访问 */
export const qrApi = api;

// Auth API
export const authService = {
  login: (email: string, password: string) => api.post('/api/v1/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string }) => api.post('/api/v1/auth/register', data),
  refreshToken: (refreshToken: string) => api.post('/api/v1/auth/refresh', { refreshToken }),
  me: () => api.get('/api/v1/users/me'),
  updateProfile: (data: any) => api.put('/api/v1/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/v1/users/change-password', data),

  // Email verification
  resendVerification: () => api.post('/api/v1/auth/resend-verification'),
  verifyEmail: (token: string) => api.get('/api/v1/auth/verify-email', { params: { token } }),

  // 2FA
  get2FAStatus: () => api.get('/api/v1/auth/2fa/status'),
  enable2FA: () => api.post('/api/v1/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/api/v1/auth/2fa/verify', { code }),
  disable2FA: (code: string) => api.delete('/api/v1/auth/2fa/disable', { data: { code } }),
  regenerateBackupCodes: (code: string) =>
    api.post('/api/v1/auth/2fa/regenerate-backup-codes', { code }),

  // Password reset
  forgotPassword: (email: string) => api.post('/api/v1/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/api/v1/auth/reset-password', { token, newPassword }),

  // Login code (验证码登录)
  sendLoginCode: (email: string) => api.post('/api/v1/auth/send-login-code', { email }),
  verifyLoginCode: (email: string, code: string) =>
    api.post('/api/v1/auth/verify-login-code', { email, code }),
};

// Link API
export const linkService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; folderId?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }) =>
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
    foregroundColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
    logoSize?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }) => {
    const { content, ...options } = data;
    return qrApi.post('/api/v1/qr/generate', { url: content, options }, { responseType: 'blob' });
  },

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
  get: (linkId: string) => api.get(`/api/v1/deeplinks/link/${linkId}`),
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
  resolve: (linkId: string, _userAgent?: string) =>
    api.get(`/api/v1/deeplinks/resolve/${linkId}`),
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
  delete: (id: string, options?: { transferToFolderId?: string | null }) =>
    linkApi.delete(`/api/v1/folders/${id}`, { data: options }),
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
    linkApi.post('/api/v1/link-templates/use', data),
  getPresets: () => linkApi.get('/api/v1/link-templates/presets'),
  getPresetsByCategory: (category: string) => linkApi.get(`/api/v1/link-templates/presets/category/${category}`),
  createFromPreset: (presetId: string, name: string) =>
    linkApi.post('/api/v1/link-templates/from-preset', { presetId, name }),
  getMostUsed: (limit?: number) => linkApi.get('/api/v1/link-templates/most-used', { params: { limit } }),
  getRecentlyUsed: (limit?: number) => linkApi.get('/api/v1/link-templates/recently-used', { params: { limit } }),
};

// Redirect Rules API - routes are /links/:linkId/redirect-rules
export const redirectRulesService = {
  getAll: (linkId: string) => linkApi.get(`/api/v1/links/${linkId}/redirect-rules`),
  getOne: (linkId: string, id: string) => linkApi.get(`/api/v1/links/${linkId}/redirect-rules/${id}`),
  create: (linkId: string, data: any) => linkApi.post(`/api/v1/links/${linkId}/redirect-rules`, data),
  update: (linkId: string, id: string, data: any) => linkApi.put(`/api/v1/links/${linkId}/redirect-rules/${id}`, data),
  delete: (linkId: string, id: string) => linkApi.delete(`/api/v1/links/${linkId}/redirect-rules/${id}`),
  toggle: (linkId: string, id: string) => linkApi.post(`/api/v1/links/${linkId}/redirect-rules/${id}/toggle`),
  reorder: (linkId: string, ruleIds: string[]) =>
    linkApi.post(`/api/v1/links/${linkId}/redirect-rules/reorder`, { ruleIds }),
  getStats: (linkId: string) => linkApi.get(`/api/v1/links/${linkId}/redirect-rules/stats`),
};

// Link Security API (link-service - URL scanning)
// 使用 /api/v1/link-security 前缀避免与 user-service 的 /api/v1/security 冲突
export const linkSecurityService = {
  // URL scanning
  scan: (url: string, force?: boolean) =>
    linkApi.post('/api/v1/link-security/scan', { url, force }),
  analyze: (url: string) => linkApi.post('/api/v1/link-security/analyze', { url }),
  quickCheck: (url: string) => linkApi.post('/api/v1/link-security/quick-check', { url }),
  batchScan: (urls: string[]) => linkApi.post('/api/v1/link-security/batch-scan', { urls }),
  // History and stats
  getRecentScans: (limit?: number) =>
    linkApi.get('/api/v1/link-security/recent', { params: { limit } }),
  getScanHistory: (url: string, limit?: number) =>
    linkApi.get('/api/v1/link-security/history', { params: { url, limit } }),
  getStats: () => linkApi.get('/api/v1/link-security/stats'),
  getCategories: () => linkApi.get('/api/v1/link-security/categories'),
  getReputation: (url: string) =>
    linkApi.get('/api/v1/link-security/reputation', { params: { url } }),
  checkSafeBrowsing: (url: string) =>
    linkApi.get('/api/v1/link-security/safe-browsing', { params: { url } }),
  // Suspended links management
  getSuspendedLinks: (params?: { limit?: number; offset?: number }) =>
    linkApi.get('/api/v1/link-security/suspended-links', { params }),
  reinstateLink: (linkId: string, reason: string) =>
    linkApi.post(`/api/v1/link-security/suspended-links/${linkId}/reinstate`, { reason }),
  checkAndHandle: (url: string) =>
    linkApi.post('/api/v1/link-security/check-and-handle', { url }),
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
  createCheckoutSession: (data: { plan: string; billingCycle: 'monthly' | 'yearly' }) =>
    api.post('/api/v1/stripe/checkout', data),
  createPortalSession: (data: { returnUrl: string }) => api.post('/api/v1/stripe/portal', data),
  createSetupIntent: () => api.post('/api/v1/stripe/setup-intent'),
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
  checkQuota: (type: 'links' | 'clicks' | 'qrCodes' | 'apiRequests', amount?: number) =>
    api.get('/api/v1/quota/check', { params: { type, amount } }),
  checkFeature: (feature: string) =>
    api.get('/api/v1/quota/feature', { params: { feature } }),
  getLogs: (params?: { type?: string; startDate?: string; endDate?: string; limit?: number }) =>
    api.get('/api/v1/quota/logs', { params }),
  getPlans: () => api.get('/api/v1/quota/plans'),
};

// Security API
export const securityService = {
  // Sessions
  getSessions: () => api.get('/api/v1/security/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/api/v1/security/sessions/${sessionId}`),
  revokeOtherSessions: () => api.post('/api/v1/security/sessions/revoke-others'),
  // Security Events
  getEvents: (params?: { limit?: number; offset?: number; type?: string }) =>
    api.get('/api/v1/security/events', { params }),
  // Overview
  getOverview: () => api.get('/api/v1/security/overview'),
  // 2FA
  get2FAStatus: () => api.get('/api/v1/auth/2fa/status'),
  enable2FA: () => api.post('/api/v1/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/api/v1/auth/2fa/verify', { code }),
  disable2FA: (code: string) => api.delete('/api/v1/auth/2fa/disable', { data: { code } }),
  regenerateBackupCodes: (code: string) =>
    api.post('/api/v1/auth/2fa/regenerate-backup-codes', { code }),
  // User Security Settings
  getUserSettings: () => api.get('/api/v1/security/user-settings'),
  updateUserSettings: (data: {
    loginNotifications?: boolean;
    suspiciousActivityAlerts?: boolean;
    sessionTimeoutDays?: number;
    ipWhitelistEnabled?: boolean;
    ipWhitelist?: string[];
  }) => api.put('/api/v1/security/user-settings', data),
  addIpToWhitelist: (ip: string) => api.post('/api/v1/security/user-settings/ip-whitelist', { ip }),
  removeIpFromWhitelist: (ip: string) =>
    api.delete(`/api/v1/security/user-settings/ip-whitelist/${encodeURIComponent(ip)}`),
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
  deleteTeam: (teamId: string) => api.delete(`/api/v1/teams/${teamId}`),
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
  // Block/Item management (后端使用 items 路由)
  getBlocks: (bioLinkId: string) => pageApi.get(`/api/v1/bio-links/${bioLinkId}/items`),
  createBlock: (bioLinkId: string, data: any) =>
    pageApi.post(`/api/v1/bio-links/${bioLinkId}/items`, data),
  updateBlock: (bioLinkId: string, blockId: string, data: any) =>
    pageApi.put(`/api/v1/bio-links/${bioLinkId}/items/${blockId}`, data),
  deleteBlock: (bioLinkId: string, blockId: string) =>
    pageApi.delete(`/api/v1/bio-links/${bioLinkId}/items/${blockId}`),
  reorderBlocks: (bioLinkId: string, blockIds: string[]) =>
    pageApi.post(`/api/v1/bio-links/${bioLinkId}/items/reorder`, { blockIds }),
};

// Comment Management API (page-service)
export const commentService = {
  getAll: (params?: {
    status?: string;
    pageId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => api.get('/api/v1/comments', { params }),
  getStats: () => api.get('/api/v1/comments/stats'),
  getOne: (id: string) => api.get(`/api/v1/comments/${id}`),
  update: (id: string, data: { status?: string; isPinned?: boolean; content?: string }) =>
    api.put(`/api/v1/comments/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/comments/${id}`),
  approve: (id: string) => api.post(`/api/v1/comments/${id}/approve`),
  reject: (id: string) => api.post(`/api/v1/comments/${id}/reject`),
  markAsSpam: (id: string) => api.post(`/api/v1/comments/${id}/spam`),
  togglePin: (id: string) => api.post(`/api/v1/comments/${id}/pin`),
  reply: (id: string, data: { content: string; ownerName: string }) =>
    api.post(`/api/v1/comments/${id}/reply`, data),
  bulkAction: (ids: string[], action: 'approve' | 'reject' | 'spam' | 'delete') =>
    api.post('/api/v1/comments/bulk', { ids, action }),
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
  getDnsRecords: (id: string) => api.get(`/api/v1/domains/${id}/verification`),
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

// Tenant API (user-service)
export const tenantService = {
  // Tenant CRUD
  getAll: () => api.get('/api/v1/tenants'),
  getOne: (id: string) => api.get(`/api/v1/tenants/${id}`),
  create: (data: { name: string; slug: string; description?: string; type?: string }) =>
    api.post('/api/v1/tenants', data),
  update: (id: string, data: { name?: string; description?: string; status?: string }) =>
    api.put(`/api/v1/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/tenants/${id}`),

  // Branding
  getBranding: (id: string) => api.get(`/api/v1/tenants/${id}/branding`),
  updateBranding: (id: string, branding: {
    logo?: string;
    logoDark?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    customCss?: string;
  }) => api.put(`/api/v1/tenants/${id}/branding`, branding),

  // Settings
  getSettings: (id: string) => api.get(`/api/v1/tenants/${id}/settings`),
  updateSettings: (id: string, settings: {
    timezone?: string;
    locale?: string;
    dateFormat?: string;
    currency?: string;
    defaultLinkExpiry?: number;
    allowPublicSignup?: boolean;
    requireEmailVerification?: boolean;
    require2FA?: boolean;
    ipWhitelist?: string[];
    allowedEmailDomains?: string[];
  }) => api.put(`/api/v1/tenants/${id}/settings`, settings),

  // Features & Limits
  updateFeatures: (id: string, features: Record<string, boolean>) =>
    api.put(`/api/v1/tenants/${id}/features`, features),
  updateLimits: (id: string, limits: {
    maxUsers?: number;
    maxTeams?: number;
    maxLinks?: number;
    maxClicks?: number;
    maxDomains?: number;
    maxApiKeys?: number;
    maxWebhooks?: number;
    storageQuota?: number;
  }) => api.put(`/api/v1/tenants/${id}/limits`, limits),

  // Usage
  getUsage: (id: string) => api.get(`/api/v1/tenants/${id}/usage`),
  getStats: (id: string) => api.get(`/api/v1/tenants/${id}/stats`),

  // Domains
  updateDomains: (id: string, domains: {
    customDomain?: string;
    appDomain?: string;
    shortDomain?: string;
  }) => api.put(`/api/v1/tenants/${id}/domains`, domains),

  // Members
  getMembers: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/api/v1/tenants/${id}/members`, { params }),
  addMember: (id: string, data: { userId: string; role?: string; permissions?: string[] }) =>
    api.post(`/api/v1/tenants/${id}/members`, data),
  updateMember: (id: string, memberId: string, data: { role?: string; permissions?: string[] }) =>
    api.put(`/api/v1/tenants/${id}/members/${memberId}`, data),
  removeMember: (id: string, memberId: string) =>
    api.delete(`/api/v1/tenants/${id}/members/${memberId}`),

  // Invitations
  getInvitations: (id: string) => api.get(`/api/v1/tenants/${id}/invitations`),
  createInvitation: (id: string, data: {
    email: string;
    role?: string;
    permissions?: string[];
    expiresInDays?: number;
  }) => api.post(`/api/v1/tenants/${id}/invitations`, data),
  cancelInvitation: (id: string, invitationId: string) =>
    api.delete(`/api/v1/tenants/${id}/invitations/${invitationId}`),
  acceptInvitation: (token: string) =>
    api.post(`/api/v1/tenants/invitations/${token}/accept`),

  // API Keys
  getApiKeys: (id: string) => api.get(`/api/v1/tenants/${id}/api-keys`),
  createApiKey: (id: string, data: {
    name: string;
    permissions?: string[];
    scopes?: string[];
    rateLimit?: number;
    ipWhitelist?: string[];
    expiresInDays?: number;
  }) => api.post(`/api/v1/tenants/${id}/api-keys`, data),
  revokeApiKey: (id: string, keyId: string) =>
    api.delete(`/api/v1/tenants/${id}/api-keys/${keyId}`),

  // Audit Logs
  getAuditLogs: (id: string, params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get(`/api/v1/tenants/${id}/audit-logs`, { params }),

  // Sub-tenants
  getSubTenants: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/api/v1/tenants/${id}/sub-tenants`, { params }),
  createSubTenant: (id: string, data: {
    name: string;
    slug: string;
    ownerEmail: string;
    type?: string;
  }) => api.post(`/api/v1/tenants/${id}/sub-tenants`, data),

  // Billing
  getBilling: (id: string) => api.get(`/api/v1/tenants/${id}/billing`),
  updateBilling: (id: string, billing: {
    billingEmail?: string;
    taxId?: string;
    paymentMethod?: string;
  }) => api.put(`/api/v1/tenants/${id}/billing`, billing),

  // Public endpoints
  getBySlug: (slug: string) => api.get(`/api/v1/tenants/by-slug/${slug}`),
  getByDomain: (domain: string) => api.get(`/api/v1/tenants/by-domain/${domain}`),
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

// Page API (page-service: 60007)
export const pageService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    api.get('/api/v1/pages', { params }),
  getOne: (id: string) => api.get(`/api/v1/pages/${id}`),
  getBySlug: (slug: string) => api.get(`/api/v1/pages/slug/${slug}`),
  create: (data: any) => api.post('/api/v1/pages', data),
  update: (id: string, data: any) => api.patch(`/api/v1/pages/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/pages/${id}`),
  publish: (id: string) => api.post(`/api/v1/pages/${id}/publish`),
  unpublish: (id: string) => api.post(`/api/v1/pages/${id}/unpublish`),
  duplicate: (id: string) => api.post(`/api/v1/pages/${id}/duplicate`),
  getAnalytics: (id: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/api/v1/pages/${id}/analytics`, { params }),
};

// SEO Service (page-service: 60007)
export const seoService = {
  // Generate SEO data
  generateSeo: (input: {
    title: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url: string;
    type?: 'website' | 'article' | 'profile' | 'product';
  }) => api.post('/api/v1/seo/generate', input),

  // Generate HTML meta tags
  generateHtmlMeta: (input: {
    title: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url: string;
  }) => api.post('/api/v1/seo/generate-html', input),

  // Get Bio Link SEO
  getBioLinkSeo: (username: string) => api.get(`/api/v1/u/${username}/seo`),

  // Get Page SEO
  getPageSeo: (slug: string) => api.get(`/api/v1/p/${slug}/seo`),

  // Update Bio Link SEO
  updateBioLinkSeo: (id: string, seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    favicon?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  }) => api.patch(`/api/v1/bio-links/${id}`, { seo }),

  // Update Page SEO
  updatePageSeo: (id: string, seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    favicon?: string;
    noIndex?: boolean;
  }) => api.patch(`/api/v1/pages/${id}`, { seo }),
};

// Slack Integration API (notification-service: 60020)
export const slackService = {
  // Installation
  getInstallation: () => api.get('/api/v1/slack/installation'),
  getInstallUrl: (redirectUrl?: string) =>
    api.get('/api/v1/slack/oauth/install', { params: { redirectUrl } }),
  uninstall: () => api.delete('/api/v1/slack/uninstall'),
  // Channels
  getChannels: () => api.get('/api/v1/slack/channels'),
  // Settings
  updateSettings: (settings: {
    defaultChannelId?: string;
    notifyOnLinkCreate?: boolean;
    notifyOnMilestone?: boolean;
    notifyOnAlert?: boolean;
    notifyOnWeeklyReport?: boolean;
    milestoneThresholds?: number[];
  }) => api.put('/api/v1/slack/settings', settings),
  // Test
  sendTestMessage: () => api.post('/api/v1/slack/test'),
};

// Microsoft Teams Integration API (notification-service: 60020)
export const teamsService = {
  // Installations
  getInstallations: () => api.get('/api/v1/teams-notifications/installations'),
  getInstallation: (id: string) => api.get(`/api/v1/teams-notifications/installations/${id}`),
  createInstallation: (data: {
    teamId: string;
    name: string;
    webhookUrl: string;
    settings: {
      notifyOnLinkCreate: boolean;
      notifyOnMilestone: boolean;
      notifyOnAlert: boolean;
      notifyOnWeeklyReport: boolean;
      milestoneThresholds: number[];
    };
  }) => api.post('/api/v1/teams-notifications/installations', data),
  updateInstallation: (id: string, data: {
    name?: string;
    webhookUrl?: string;
    isActive?: boolean;
    settings?: {
      notifyOnLinkCreate?: boolean;
      notifyOnMilestone?: boolean;
      notifyOnAlert?: boolean;
      notifyOnWeeklyReport?: boolean;
      milestoneThresholds?: number[];
    };
  }) => api.put(`/api/v1/teams-notifications/installations/${id}`, data),
  deleteInstallation: (id: string) => api.delete(`/api/v1/teams-notifications/installations/${id}`),
  testInstallation: (id: string) => api.post(`/api/v1/teams-notifications/installations/${id}/test`),
  validateWebhook: (webhookUrl: string) =>
    api.post('/api/v1/teams-notifications/validate-webhook', { webhookUrl }),
};

// Open API Documentation and Usage Service (api-gateway: 60000)
export const openApiService = {
  // Documentation
  getDocs: () => api.get('/api/v1/open/docs'),
  getSdkConfig: () => api.get('/api/v1/open/sdk/config'),
  getChangelog: () => api.get('/api/v1/open/changelog'),
  getErrorCodes: () => api.get('/api/v1/open/errors'),
  getApiStatus: () => api.get('/api/v1/open/status'),

  // Usage Statistics (requires API key auth)
  getUsage: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/api/v1/open/usage', { params }),
  getRateLimitStatus: () => api.get('/api/v1/open/rate-limit/status'),

  // Webhook
  generateWebhookSecret: () => api.post('/api/v1/open/webhooks/secret'),
  verifyWebhookSignature: (payload: string, signature: string, secret: string) =>
    api.post('/api/v1/open/webhooks/verify', { payload, signature, secret }),

  // SDK Downloads
  getSdkDownloadUrl: (language: string) => api.get(`/api/v1/open/sdk/download/${language}`),

  // Code Examples
  getCodeExample: (language: string, operation: string) =>
    api.get(`/api/v1/open/examples/${language}/${operation}`),

  // API Key validation
  validateApiKey: (apiKey: string) =>
    api.post('/api/v1/open/validate-key', {}, { headers: { 'X-API-Key': apiKey } }),
};

// Preset Templates API (console-service 提供的平台预设模板，只读)
export const presetTemplateService = {
  // Link Templates
  getLinkTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/api/v1/preset-templates/links', { params }),
  getLinkTemplate: (id: string) => api.get(`/api/v1/preset-templates/links/${id}`),

  // UTM Templates
  getUTMTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string; platform?: string }) =>
    api.get('/api/v1/preset-templates/utm', { params }),
  getUTMTemplate: (id: string) => api.get(`/api/v1/preset-templates/utm/${id}`),
  getUTMPlatforms: () => api.get('/api/v1/preset-templates/utm/platforms'),

  // Campaign Templates
  getCampaignTemplates: (params?: { page?: number; limit?: number; search?: string; scenario?: string }) =>
    api.get('/api/v1/preset-templates/campaigns', { params }),
  getCampaignTemplate: (id: string) => api.get(`/api/v1/preset-templates/campaigns/${id}`),
  getCampaignScenarios: () => api.get('/api/v1/preset-templates/campaigns/scenarios'),

  // Bio Link Templates
  getBioLinkTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string; industry?: string }) =>
    api.get('/api/v1/preset-templates/bio-links', { params }),
  getBioLinkTemplate: (id: string) => api.get(`/api/v1/preset-templates/bio-links/${id}`),
  getBioLinkIndustries: () => api.get('/api/v1/preset-templates/bio-links/industries'),
  getBioLinkTemplatePreview: (id: string) => api.get(`/api/v1/preset-templates/bio-links/${id}/preview`),

  // QR Styles
  getQRStyles: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/api/v1/preset-templates/qr-styles', { params }),
  getQRStyle: (id: string) => api.get(`/api/v1/preset-templates/qr-styles/${id}`),
  getQRStylePreview: (id: string) => api.get(`/api/v1/preset-templates/qr-styles/${id}/preview`),

  // DeepLink Templates
  getDeepLinkTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/api/v1/preset-templates/deeplinks', { params }),
  getDeepLinkTemplate: (id: string) => api.get(`/api/v1/preset-templates/deeplinks/${id}`),
  getDeepLinkCategories: () => api.get('/api/v1/preset-templates/deeplinks/categories'),

  // Webhook Templates
  getWebhookTemplates: (params?: { page?: number; limit?: number; search?: string; platform?: string }) =>
    api.get('/api/v1/preset-templates/webhooks', { params }),
  getWebhookTemplate: (id: string) => api.get(`/api/v1/preset-templates/webhooks/${id}`),
  getWebhookPlatforms: () => api.get('/api/v1/preset-templates/webhooks/platforms'),

  // Redirect Rule Templates
  getRedirectRuleTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/api/v1/preset-templates/redirect-rules', { params }),
  getRedirectRuleTemplate: (id: string) => api.get(`/api/v1/preset-templates/redirect-rules/${id}`),
  getRedirectRuleCategories: () => api.get('/api/v1/preset-templates/redirect-rules/categories'),

  // SEO Templates
  getSeoTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/api/v1/preset-templates/seo', { params }),
  getSeoTemplate: (id: string) => api.get(`/api/v1/preset-templates/seo/${id}`),
  getSeoCategories: () => api.get('/api/v1/preset-templates/seo/categories'),

  // Report Templates
  getReportTemplates: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    api.get('/api/v1/preset-templates/reports', { params }),
  getReportTemplate: (id: string) => api.get(`/api/v1/preset-templates/reports/${id}`),
  getReportCategories: () => api.get('/api/v1/preset-templates/reports/categories'),
  getAvailableMetrics: () => api.get('/api/v1/preset-templates/reports/metrics'),
  getAvailableDimensions: () => api.get('/api/v1/preset-templates/reports/dimensions'),
};

// =============================================================================
// 用户模板 CRUD API (区别于 presetTemplateService 的只读预设模板)
// =============================================================================

// Report Template API (user-service: 60002)
export const reportTemplateService = {
  getAll: (params?: { category?: string; isFavorite?: boolean; search?: string }) =>
    api.get('/api/v1/report-templates', { params }),
  getOne: (id: string) => api.get(`/api/v1/report-templates/${id}`),
  create: (data: any) => api.post('/api/v1/report-templates', data),
  update: (id: string, data: any) => api.put(`/api/v1/report-templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/report-templates/${id}`),
  toggleFavorite: (id: string) => api.patch(`/api/v1/report-templates/${id}/favorite`),
  duplicate: (id: string) => api.post(`/api/v1/report-templates/${id}/duplicate`),
  generate: (id: string) => api.post(`/api/v1/report-templates/${id}/generate`),
};

// DeepLink Template API (deeplink-service: 60008)
export const deepLinkTemplateService = {
  getAll: (params?: { category?: string; isFavorite?: boolean; search?: string }) =>
    api.get('/api/v1/deeplink-templates', { params }),
  getOne: (id: string) => api.get(`/api/v1/deeplink-templates/${id}`),
  create: (data: any) => api.post('/api/v1/deeplink-templates', data),
  update: (id: string, data: any) => api.put(`/api/v1/deeplink-templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/deeplink-templates/${id}`),
  toggleFavorite: (id: string) => api.patch(`/api/v1/deeplink-templates/${id}/favorite`),
  duplicate: (id: string) => api.post(`/api/v1/deeplink-templates/${id}/duplicate`),
};

// Webhook Template API (webhook-service: 60017)
export const webhookTemplateService = {
  getAll: (params?: { platform?: string; isFavorite?: boolean; search?: string }) =>
    api.get('/api/v1/webhook-templates', { params }),
  getOne: (id: string) => api.get(`/api/v1/webhook-templates/${id}`),
  create: (data: any) => api.post('/api/v1/webhook-templates', data),
  update: (id: string, data: any) => api.put(`/api/v1/webhook-templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/webhook-templates/${id}`),
  toggleFavorite: (id: string) => api.patch(`/api/v1/webhook-templates/${id}/favorite`),
  duplicate: (id: string) => api.post(`/api/v1/webhook-templates/${id}/duplicate`),
};

// Redirect Rule Template API (link-service: 60003)
export const redirectRuleTemplateService = {
  getAll: (params?: { category?: string; isFavorite?: boolean; search?: string }) =>
    api.get('/api/v1/redirect-rule-templates', { params }),
  getOne: (id: string) => api.get(`/api/v1/redirect-rule-templates/${id}`),
  create: (data: any) => api.post('/api/v1/redirect-rule-templates', data),
  update: (id: string, data: any) => api.put(`/api/v1/redirect-rule-templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/redirect-rule-templates/${id}`),
  toggleFavorite: (id: string) => api.patch(`/api/v1/redirect-rule-templates/${id}/favorite`),
  duplicate: (id: string) => api.post(`/api/v1/redirect-rule-templates/${id}/duplicate`),
};

// SEO Template API (page-service: 60007)
export const seoTemplateService = {
  getAll: (params?: { category?: string; isFavorite?: boolean; search?: string }) =>
    api.get('/api/v1/seo-templates', { params }),
  getOne: (id: string) => api.get(`/api/v1/seo-templates/${id}`),
  create: (data: any) => api.post('/api/v1/seo-templates', data),
  update: (id: string, data: any) => api.put(`/api/v1/seo-templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/seo-templates/${id}`),
  toggleFavorite: (id: string) => api.patch(`/api/v1/seo-templates/${id}/favorite`),
  duplicate: (id: string) => api.post(`/api/v1/seo-templates/${id}/duplicate`),
};
