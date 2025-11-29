import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';

type ServiceName = 'user' | 'link' | 'analytics' | 'qr' | 'page' | 'deeplink' | 'notification' | 'campaign' | 'domain' | 'webhook' | 'integration';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly httpClient: AxiosInstance;
  private readonly serviceUrls: Record<ServiceName, string>;

  constructor(private readonly configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'x-internal-key': this.configService.get('INTERNAL_API_KEY'),
      },
    });

    this.serviceUrls = {
      user: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002/api/v1'),
      link: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003/api/v1'),
      analytics: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050/api'),
      qr: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005/api/v1'),
      page: this.configService.get('PAGE_SERVICE_URL', 'http://localhost:60007/api/v1'),
      deeplink: this.configService.get('DEEPLINK_SERVICE_URL', 'http://localhost:60008/api/v1'),
      notification: this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:60020/api/v1'),
      campaign: this.configService.get('CAMPAIGN_SERVICE_URL', 'http://localhost:60004/api/v1'),
      domain: this.configService.get('DOMAIN_SERVICE_URL', 'http://localhost:60014/api/v1'),
      webhook: this.configService.get('WEBHOOK_SERVICE_URL', 'http://localhost:60017/api/v1'),
      integration: this.configService.get('INTEGRATION_SERVICE_URL', 'http://localhost:60016/api/v1'),
    };
  }

  async forward(
    service: ServiceName,
    path: string,
    options: {
      method?: Method;
      data?: any;
      params?: any;
      headers?: Record<string, string>;
    } = {},
  ): Promise<any> {
    const { method = 'GET', data, params, headers = {} } = options;
    const baseUrl = this.serviceUrls[service];

    if (!baseUrl) {
      throw new HttpException(`Unknown service: ${service}`, HttpStatus.BAD_REQUEST);
    }

    const url = `${baseUrl}${path}`;
    const config: AxiosRequestConfig = {
      method,
      url,
      params,
      headers: { ...headers },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = data;
    }

    try {
      const response = await this.httpClient.request(config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Proxy error to ${service}: ${error.message}`, error.stack);

      // Return empty data for 404 errors (endpoint not implemented yet)
      if (error.response?.status === 404) {
        this.logger.warn(`Endpoint not implemented: ${service}${path}`);
        // Return appropriate empty response based on path patterns
        if (path.includes('/stats') || path.includes('/usage') || path.includes('/revenue')) {
          return { total: 0, data: [], stats: {} };
        }
        return { data: [], items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      throw new HttpException(
        { message: `Service ${service} unavailable`, error: error.message },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // User Service Proxies
  async getUsers(params?: { page?: number; limit?: number; search?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/users', { params, headers: auth ? { Authorization: auth } : {} });
  }

  async getUser(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async updateUser(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}`, { method: 'PUT', data, headers: auth ? { Authorization: auth } : {} });
  }

  async deleteUser(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}`, { method: 'DELETE', headers: auth ? { Authorization: auth } : {} });
  }

  async getTeams(params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('user', '/teams', { params, headers: auth ? { Authorization: auth } : {} });
  }

  async getTeam(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  // Link Service Proxies
  async getLinks(teamId: string, params?: { page?: number; limit?: number; status?: string }, auth?: string): Promise<any> {
    return this.forward('link', '/links', { params: { ...params, teamId }, headers: auth ? { Authorization: auth } : {} });
  }

  async getLink(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/links/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async deleteLink(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/links/${id}`, { method: 'DELETE', headers: auth ? { Authorization: auth } : {} });
  }

  async getLinkStats(auth?: string): Promise<any> {
    return this.forward('link', '/internal/stats', { headers: auth ? { Authorization: auth } : {} });
  }

  // Analytics Service Proxies
  async getAnalyticsSummary(auth?: string): Promise<any> {
    // analytics-service 使用 /api/analytics/team 获取整体统计
    return this.forward('analytics', '/analytics/team', { headers: auth ? { Authorization: auth } : {} });
  }

  async getLinkAnalytics(linkId: string, params?: { startDate?: string; endDate?: string }, auth?: string): Promise<any> {
    // analytics-service 使用 /analytics/link/{link_id} (单数)
    return this.forward('analytics', `/analytics/link/${linkId}`, { params, headers: auth ? { Authorization: auth } : {} });
  }

  async getTeamAnalytics(teamId: string, params?: { startDate?: string; endDate?: string }, auth?: string): Promise<any> {
    // analytics-service 使用 /analytics/team/{team_id}/summary
    return this.forward('analytics', `/analytics/team/${teamId}/summary`, { params, headers: auth ? { Authorization: auth } : {} });
  }

  // Campaign Service Proxies
  async getCampaigns(teamId: string, params?: { status?: string }, auth?: string): Promise<any> {
    return this.forward('campaign', '/campaigns', {
      params,
      headers: { 'x-team-id': teamId, ...(auth ? { Authorization: auth } : {}) },
    });
  }

  async getCampaign(id: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async deleteCampaign(id: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}`, { method: 'DELETE', headers: auth ? { Authorization: auth } : {} });
  }

  // Page Service Proxies
  async getPages(teamId: string, params?: { status?: string }, auth?: string): Promise<any> {
    return this.forward('page', '/pages', {
      params,
      headers: { 'x-team-id': teamId, ...(auth ? { Authorization: auth } : {}) },
    });
  }

  async getPage(id: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async deletePage(id: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}`, { method: 'DELETE', headers: auth ? { Authorization: auth } : {} });
  }

  // Notification Service Proxies
  async sendBroadcast(data: { subject: string; body: string; recipients: string[] }, auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/broadcast', { method: 'POST', data, headers: auth ? { Authorization: auth } : {} });
  }

  // Extended User Management
  async suspendUser(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/suspend`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unsuspendUser(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/unsuspend`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async banUser(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/ban`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async resetUserPassword(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/reset-password`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Extended Team Management
  async updateTeam(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteTeam(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async suspendTeam(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}/suspend`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unsuspendTeam(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}/unsuspend`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getTeamMembers(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}/members`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Subscription Management
  async getSubscriptionStats(auth?: string): Promise<any> {
    return this.forward('user', '/subscriptions/stats', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSubscriptions(params?: { page?: number; limit?: number; status?: string; plan?: string; search?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/subscriptions', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSubscription(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async changeSubscriptionPlan(id: string, data: { plan: string; billingCycle?: string }, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${id}/plan`, {
      method: 'PATCH',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async cancelSubscription(id: string, data?: { immediately?: boolean; reason?: string }, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${id}/cancel`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async reactivateSubscription(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${id}/reactivate`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async extendSubscriptionTrial(id: string, data: { days: number }, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${id}/extend-trial`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSubscriptionInvoices(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${id}/invoices`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async refundSubscriptionInvoice(subscriptionId: string, invoiceId: string, data?: { amount?: number; reason?: string }, auth?: string): Promise<any> {
    return this.forward('user', `/subscriptions/${subscriptionId}/invoices/${invoiceId}/refund`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Content Moderation
  async getModerationStats(auth?: string): Promise<any> {
    return this.forward('link', '/moderation/stats', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getFlaggedLinks(params?: { page?: number; limit?: number; status?: string; reason?: string; severity?: string; search?: string }, auth?: string): Promise<any> {
    return this.forward('link', '/moderation/flagged-links', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getFlaggedLink(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/moderation/flagged-links/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getLinkReports(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/moderation/flagged-links/${id}/reports`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async approveFlaggedLink(id: string, data?: { note?: string }, userId?: string, userName?: string, auth?: string): Promise<any> {
    return this.forward('link', `/moderation/flagged-links/${id}/approve`, {
      method: 'POST',
      data,
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
        ...(userName ? { 'x-user-name': userName } : {}),
      },
    });
  }

  async blockFlaggedLink(id: string, data?: { note?: string; blockUser?: boolean }, userId?: string, userName?: string, auth?: string): Promise<any> {
    return this.forward('link', `/moderation/flagged-links/${id}/block`, {
      method: 'POST',
      data,
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
        ...(userName ? { 'x-user-name': userName } : {}),
      },
    });
  }

  async bulkApproveFlaggedLinks(data: { ids: string[]; note?: string }, userId?: string, userName?: string, auth?: string): Promise<any> {
    return this.forward('link', '/moderation/flagged-links/bulk-approve', {
      method: 'POST',
      data,
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
        ...(userName ? { 'x-user-name': userName } : {}),
      },
    });
  }

  async bulkBlockFlaggedLinks(data: { ids: string[]; note?: string; blockUsers?: boolean }, userId?: string, userName?: string, auth?: string): Promise<any> {
    return this.forward('link', '/moderation/flagged-links/bulk-block', {
      method: 'POST',
      data,
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
        ...(userName ? { 'x-user-name': userName } : {}),
      },
    });
  }

  async getBlockedUsers(params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('link', '/moderation/blocked-users', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async blockModerationUser(userId: string, data?: { reason?: string }, auth?: string): Promise<any> {
    return this.forward('link', `/moderation/users/${userId}/block`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unblockModerationUser(userId: string, auth?: string): Promise<any> {
    return this.forward('link', `/moderation/users/${userId}/unblock`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getModerationSettings(auth?: string): Promise<any> {
    return this.forward('link', '/moderation/settings', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateModerationSettings(data: any, auth?: string): Promise<any> {
    return this.forward('link', '/moderation/settings', {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async flagLink(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('link', `/links/${id}/flag`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unflagLink(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/links/${id}/unflag`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // QR Code Service Proxies (uses /qr-records endpoint from tracking controller)
  async getQRCodes(teamId: string, params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('qr', '/qr-records', {
      params,
      headers: { 'x-team-id': teamId, ...(auth ? { Authorization: auth } : {}) },
    });
  }

  async getQRCode(id: string, auth?: string): Promise<any> {
    return this.forward('qr', `/qr-records/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteQRCode(id: string, auth?: string): Promise<any> {
    return this.forward('qr', `/qr-records/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Deep Link Service Proxies
  async getDeepLinks(teamId: string, params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('deeplink', '/deeplinks', {
      params,
      headers: { 'x-team-id': teamId, ...(auth ? { Authorization: auth } : {}) },
    });
  }

  async getDeepLink(id: string, auth?: string): Promise<any> {
    return this.forward('deeplink', `/deeplinks/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteDeepLink(id: string, auth?: string): Promise<any> {
    return this.forward('deeplink', `/deeplinks/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Domain Service Proxies
  async getDomains(params?: { page?: number; limit?: number; status?: string }, auth?: string): Promise<any> {
    return this.forward('domain', '/domains', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getDomain(id: string, auth?: string): Promise<any> {
    return this.forward('domain', `/domains/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateDomain(id: string, data: { status?: string }, auth?: string): Promise<any> {
    return this.forward('domain', `/domains/${id}`, {
      method: 'PATCH',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteDomain(id: string, auth?: string): Promise<any> {
    return this.forward('domain', `/domains/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async verifyDomain(id: string, auth?: string): Promise<any> {
    return this.forward('domain', `/domains/${id}/verify`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Billing / Invoices ====================
  async getInvoices(params?: { page?: number; limit?: number; teamId?: string; status?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/billing/invoices', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getInvoice(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/billing/invoices/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async refundInvoice(id: string, data: { amount?: number; reason?: string }, auth?: string): Promise<any> {
    return this.forward('user', `/billing/invoices/${id}/refund`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async resendInvoice(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/billing/invoices/${id}/resend`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getRevenue(params?: { startDate?: string; endDate?: string; groupBy?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/billing/revenue', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getPlans(auth?: string): Promise<any> {
    return this.forward('user', '/billing/plans', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updatePlan(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('user', `/billing/plans/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== API Keys ====================
  async getApiKeys(params?: { page?: number; limit?: number; teamId?: string; userId?: string; status?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/apikeys', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getApiKey(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/apikeys/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async revokeApiKey(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('user', `/apikeys/${id}/revoke`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async regenerateApiKey(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/apikeys/${id}/regenerate`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getApiKeyUsage(params?: { startDate?: string; endDate?: string; keyId?: string; teamId?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/apikeys/usage', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Webhooks ====================
  async getWebhooks(params?: { page?: number; limit?: number; teamId?: string; status?: string }, auth?: string): Promise<any> {
    return this.forward('webhook', '/webhooks', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getWebhook(id: string, auth?: string): Promise<any> {
    return this.forward('webhook', `/webhooks/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateWebhook(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('webhook', `/webhooks/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteWebhook(id: string, auth?: string): Promise<any> {
    return this.forward('webhook', `/webhooks/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async testWebhook(id: string, auth?: string): Promise<any> {
    return this.forward('webhook', `/webhooks/${id}/test`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getWebhookLogs(id: string, params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('webhook', `/webhooks/${id}/logs`, {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async retryWebhook(id: string, logId: string, auth?: string): Promise<any> {
    return this.forward('webhook', `/webhooks/${id}/retry`, {
      method: 'POST',
      data: { logId },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Data Export ====================
  async exportUsers(data: { format?: string; filters?: any; fields?: string[] }, auth?: string): Promise<any> {
    return this.forward('user', '/export/users', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async exportTeams(data: { format?: string; filters?: any; fields?: string[] }, auth?: string): Promise<any> {
    return this.forward('user', '/export/teams', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async exportLinks(data: { format?: string; teamId?: string; filters?: any; fields?: string[] }, auth?: string): Promise<any> {
    return this.forward('link', '/export/links', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async exportAnalytics(data: { format?: string; startDate?: string; endDate?: string; teamId?: string; linkId?: string }, auth?: string): Promise<any> {
    return this.forward('analytics', '/export/analytics', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async exportInvoices(data: { format?: string; startDate?: string; endDate?: string; status?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/export/invoices', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getExportJobs(params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('user', '/export/jobs', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getExportJob(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/export/jobs/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async downloadExport(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/export/jobs/${id}/download`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }
}
