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
    // 不在这里设置默认的 x-internal-api-key，而是在 forward() 方法中按需添加
    // 这样当传入 Authorization header 时，可以避免发送内部 API key
    this.httpClient = axios.create({
      timeout: 30000,
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

    // 如果有 Authorization header，不使用内部 API key，让目标服务验证用户 token
    // 这样管理员的实际身份会被正确识别（而不是变成 "system"）
    const finalHeaders: Record<string, string> = { ...headers };
    if (!finalHeaders['Authorization'] && !finalHeaders['authorization']) {
      finalHeaders['x-internal-api-key'] = this.configService.get('INTERNAL_API_KEY') || '';
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      params,
      headers: finalHeaders,
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

  // Helper to normalize list responses to { items, total } format
  private normalizeListResponse(result: any, params?: { page?: number; limit?: number }): any {
    if (Array.isArray(result)) {
      return {
        items: result,
        total: result.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
    }
    if (result?.items) {
      return result;
    }
    // Handle various response formats: { data: [...] }, { roles: [...] }, { users: [...] }, { teams: [...] }, etc.
    const dataArray = result?.data || result?.roles || result?.users || result?.teams || result?.members || result?.links || [];
    return {
      items: dataArray,
      total: result?.total || dataArray.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  // Helper to get team names map
  private async getTeamNamesMap(teamIds: string[], auth?: string): Promise<Record<string, string>> {
    if (!teamIds.length) return {};
    try {
      const result = await this.forward('user', '/teams', {
        params: { limit: 100 },
        headers: auth ? { Authorization: auth } : {},
      });
      // Handle both array and object response formats
      const teams = Array.isArray(result) ? result : (result?.items || result?.teams || result?.data || []);
      const map: Record<string, string> = {};
      for (const team of teams) {
        if (teamIds.includes(team.id)) {
          map[team.id] = team.name;
        }
      }
      return map;
    } catch (error) {
      this.logger.warn('Failed to fetch team names', error);
      return {};
    }
  }

  // Helper to enrich items with team names
  private async enrichWithTeamNames<T extends { teamId?: string }>(
    items: T[],
    auth?: string,
  ): Promise<(T & { teamName?: string })[]> {
    const teamIds = [...new Set(items.map((item) => item.teamId).filter(Boolean))] as string[];
    const teamNames = await this.getTeamNamesMap(teamIds, auth);
    return items.map((item) => ({
      ...item,
      teamName: item.teamId ? teamNames[item.teamId] || item.teamId : undefined,
    }));
  }

  // User Service Proxies
  async getUsers(params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }, auth?: string): Promise<any> {
    const result = await this.forward('user', '/users', { params, headers: auth ? { Authorization: auth } : {} });
    return this.normalizeListResponse(result, params);
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

  async getTeams(params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }, auth?: string): Promise<any> {
    const result = await this.forward('user', '/teams', { params, headers: auth ? { Authorization: auth } : {} });
    return this.normalizeListResponse(result, params);
  }

  async getTeam(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async updateTeamStatus(id: string, status: 'active' | 'suspended', auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}/status`, {
      method: 'PATCH',
      data: { status },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Link Service Proxies
  async getLinks(teamId: string, params?: { page?: number; limit?: number; status?: string; search?: string }, auth?: string): Promise<any> {
    // 管理后台使用内部 API 端点获取所有链接
    const queryParams: any = { ...params };
    if (teamId) {
      queryParams.teamId = teamId;
    }
    const result = await this.forward('link', '/links/internal/admin/all', {
      params: queryParams,
      headers: auth ? { Authorization: auth } : {}
    });
    return this.normalizeListResponse(result, params);
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
  async getCampaigns(teamId?: string, params?: { status?: string; page?: number; limit?: number }, auth?: string): Promise<any> {
    const headers: Record<string, string> = auth ? { Authorization: auth } : {};
    if (teamId) {
      headers['x-team-id'] = teamId;
    }
    // 如果没有传 teamId，则查询所有活动（管理员模式）
    const result = await this.forward('campaign', '/campaigns', {
      params: { ...params, all: !teamId },
      headers,
    });
    // Enrich with team names
    const items = result?.items || result?.campaigns || result?.data || [];
    const enrichedItems = await this.enrichWithTeamNames(items, auth);
    return {
      items: enrichedItems,
      total: result?.total || items.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  async getCampaign(id: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async deleteCampaign(id: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}`, { method: 'DELETE', headers: auth ? { Authorization: auth } : {} });
  }

  async getCampaignStats(auth?: string): Promise<any> {
    try {
      return await this.forward('campaign', '/internal/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      // Return default stats if campaign service doesn't have stats endpoint
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        suspendedCampaigns: 0,
        flaggedCampaigns: 0,
        totalLinks: 0,
        totalClicks: 0,
      };
    }
  }

  // Page Service Proxies
  async getPages(teamId?: string, params?: { status?: string; page?: number; limit?: number }, auth?: string): Promise<any> {
    const headers: Record<string, string> = auth ? { Authorization: auth } : {};
    if (teamId) {
      headers['x-team-id'] = teamId;
    }
    // 如果没有传 teamId，则查询所有页面（管理员模式）
    const result = await this.forward('page', '/pages', {
      params: { ...params, all: !teamId },
      headers,
    });
    // Enrich with team names
    const items = result?.items || result?.pages || result?.data || [];
    const enrichedItems = await this.enrichWithTeamNames(items, auth);
    return {
      items: enrichedItems,
      total: result?.total || items.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  async getPage(id: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async deletePage(id: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}`, { method: 'DELETE', headers: auth ? { Authorization: auth } : {} });
  }

  async getPageStats(auth?: string): Promise<any> {
    try {
      return await this.forward('page', '/internal/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      // Return default stats if page service doesn't have stats endpoint
      return {
        totalPages: 0,
        publishedPages: 0,
        blockedPages: 0,
        flaggedPages: 0,
        totalViews: 0,
        totalClicks: 0,
      };
    }
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
    const result = await this.forward('user', `/teams/${id}/members`, {
      headers: auth ? { Authorization: auth } : {},
    });
    return this.normalizeListResponse(result);
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
  async getQRCodes(teamId?: string, params?: { page?: number; limit?: number; style?: string }, auth?: string): Promise<any> {
    const headers: Record<string, string> = auth ? { Authorization: auth } : {};
    if (teamId) {
      headers['x-team-id'] = teamId;
    }
    // 如果没有传 teamId，则查询所有二维码（管理员模式）
    const result = await this.forward('qr', '/qr-records', {
      params: { ...params, all: !teamId },
      headers,
    });
    // Enrich with team names
    const items = result?.items || result?.qrcodes || result?.data || [];
    const enrichedItems = await this.enrichWithTeamNames(items, auth);
    return {
      items: enrichedItems,
      total: result?.total || items.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
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

  async getQRCodeStats(auth?: string): Promise<any> {
    try {
      return await this.forward('qr', '/internal/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      // Return default stats if qr service doesn't have stats endpoint
      return {
        totalQRCodes: 0,
        activeQRCodes: 0,
        blockedQRCodes: 0,
        flaggedQRCodes: 0,
        totalScans: 0,
      };
    }
  }

  // Deep Link Service Proxies
  async getDeepLinks(teamId?: string, params?: { page?: number; limit?: number; status?: string }, auth?: string): Promise<any> {
    const headers: Record<string, string> = auth ? { Authorization: auth } : {};
    if (teamId) {
      headers['x-team-id'] = teamId;
    }
    // 如果没有传 teamId，则查询所有深度链接（管理员模式）
    const result = await this.forward('deeplink', '/deeplinks', {
      params: { ...params, all: !teamId },
      headers,
    });
    // Enrich with team names
    const items = result?.items || result?.deeplinks || result?.data || [];
    const enrichedItems = await this.enrichWithTeamNames(items, auth);
    return {
      items: enrichedItems,
      total: result?.total || items.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
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

  async getDeepLinkStats(auth?: string): Promise<any> {
    try {
      return await this.forward('deeplink', '/internal/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      // Return default stats if deeplink service doesn't have stats endpoint
      return {
        totalDeepLinks: 0,
        activeDeepLinks: 0,
        blockedDeepLinks: 0,
        flaggedDeepLinks: 0,
        totalClicks: 0,
        iosClicks: 0,
        androidClicks: 0,
      };
    }
  }

  // Domain Service Proxies
  async getDomainStats(auth?: string): Promise<any> {
    try {
      return await this.forward('domain', '/internal/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      // Return default stats if domain service doesn't have stats endpoint
      return {
        totalDomains: 0,
        verifiedDomains: 0,
        pendingDomains: 0,
        failedDomains: 0,
      };
    }
  }

  async getDomains(params?: { page?: number; limit?: number; status?: string }, auth?: string): Promise<any> {
    const result = await this.forward('domain', '/domains', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
    // Normalize and enrich with team names
    const items = result?.items || result?.domains || result?.data || [];
    const enrichedItems = await this.enrichWithTeamNames(items, auth);
    return {
      items: enrichedItems,
      total: result?.total || items.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
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

  async getBillingPlans(auth?: string): Promise<any> {
    return this.forward('user', '/billing/plans', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateBillingPlan(id: string, data: any, auth?: string): Promise<any> {
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
  async getWebhookStats(auth?: string): Promise<any> {
    try {
      return await this.forward('webhook', '/internal/webhooks/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      // Return default stats if webhook service doesn't have stats endpoint
      return {
        totalWebhooks: 0,
        activeWebhooks: 0,
        failedWebhooks: 0,
        totalDeliveries: 0,
        successRate: 0,
      };
    }
  }

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

  // ==================== Role Management ====================
  async getTeamRoles(teamId: string, auth?: string): Promise<any> {
    const result = await this.forward('user', `/teams/${teamId}/roles`, {
      headers: auth ? { Authorization: auth } : {},
    });
    return this.normalizeListResponse(result);
  }

  async getAvailablePermissions(teamId: string, auth?: string): Promise<any> {
    const result = await this.forward('user', `/teams/${teamId}/roles/permissions`, {
      headers: auth ? { Authorization: auth } : {},
    });

    // Normalize response
    if (Array.isArray(result)) {
      return { items: result, permissions: result };
    }
    return result;
  }

  async getTeamRole(teamId: string, roleId: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/roles/${roleId}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async createTeamRole(teamId: string, data: { name: string; description?: string; color?: string; permissions: string[]; isDefault?: boolean }, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/roles`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateTeamRole(teamId: string, roleId: string, data: { name?: string; description?: string; color?: string; permissions?: string[]; isDefault?: boolean }, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/roles/${roleId}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteTeamRole(teamId: string, roleId: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async duplicateTeamRole(teamId: string, roleId: string, newName: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/roles/${roleId}/duplicate`, {
      method: 'POST',
      data: { name: newName },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async initializeDefaultRoles(teamId: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/roles/initialize`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateTeamMemberRole(teamId: string, memberId: string, data: { role?: string; customRoleId?: string }, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/members/${memberId}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Integration Management ====================
  async getIntegrationStats(auth?: string): Promise<any> {
    return this.forward('integration', '/integrations/stats', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getIntegrations(params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }, auth?: string): Promise<any> {
    return this.forward('integration', '/integrations', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getIntegration(id: string, auth?: string): Promise<any> {
    return this.forward('integration', `/integrations/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateIntegrationConfig(id: string, config: Record<string, any>, auth?: string): Promise<any> {
    return this.forward('integration', `/integrations/${id}/config`, {
      method: 'PUT',
      data: config,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async triggerIntegrationSync(id: string, auth?: string): Promise<any> {
    return this.forward('integration', `/integrations/${id}/sync`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async toggleIntegrationSync(id: string, enabled: boolean, auth?: string): Promise<any> {
    return this.forward('integration', `/integrations/${id}/sync`, {
      method: 'PATCH',
      data: { enabled },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async disconnectIntegration(id: string, auth?: string): Promise<any> {
    return this.forward('integration', `/integrations/${id}/disconnect`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getIntegrationSyncLogs(id: string, params?: { page?: number; limit?: number }, auth?: string): Promise<any> {
    return this.forward('integration', `/integrations/${id}/logs`, {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Notification Management ====================
  async getNotificationStats(auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/stats', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getNotificationLogs(params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }, auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/logs', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getNotificationLog(id: string, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/logs/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async resendNotification(id: string, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/logs/${id}/resend`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async sendNotificationBroadcast(data: { subject: string; content: string; type: string }, auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/broadcast', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Notification Templates
  async getNotificationTemplates(params?: { type?: string }, auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/templates', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getNotificationTemplate(id: string, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/templates/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateNotificationTemplate(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/templates/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async resetNotificationTemplate(id: string, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/templates/${id}/reset`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // Notification Channels
  async getNotificationChannels(auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/channels', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async createNotificationChannel(data: any, auth?: string): Promise<any> {
    return this.forward('notification', '/notifications/channels', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getNotificationChannel(id: string, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/channels/${id}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateNotificationChannel(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/channels/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async toggleNotificationChannel(id: string, enabled: boolean, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/channels/${id}`, {
      method: 'PATCH',
      data: { enabled },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async testNotificationChannel(id: string, recipient?: string, auth?: string): Promise<any> {
    return this.forward('notification', `/notifications/channels/${id}/test`, {
      method: 'POST',
      data: recipient ? { recipient } : {},
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== User Bulk Operations ====================
  async bulkDeleteUsers(ids: string[], auth?: string): Promise<any> {
    return this.forward('user', '/users/bulk-delete', {
      method: 'POST',
      data: { ids },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async bulkToggleStatus(ids: string[], status: 'active' | 'disabled', auth?: string): Promise<any> {
    return this.forward('user', '/users/bulk-status', {
      method: 'POST',
      data: { ids, status },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async forceLogout(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/force-logout`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getUserLoginHistory(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/login-history`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getUserActivity(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/users/${id}/activity`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Team Extended Operations ====================
  async removeTeamMember(teamId: string, memberId: string, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateTeamQuota(id: string, quota: any, auth?: string): Promise<any> {
    return this.forward('user', `/teams/${id}/quota`, {
      method: 'PATCH',
      data: quota,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== QR Code Extended Operations ====================
  async blockQRCode(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('qr', `/qr-records/${id}/block`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unblockQRCode(id: string, auth?: string): Promise<any> {
    return this.forward('qr', `/qr-records/${id}/unblock`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async flagQRCode(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('qr', `/qr-records/${id}/flag`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Deep Link Extended Operations ====================
  async blockDeepLink(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('deeplink', `/deeplinks/${id}/block`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unblockDeepLink(id: string, auth?: string): Promise<any> {
    return this.forward('deeplink', `/deeplinks/${id}/unblock`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async flagDeepLink(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('deeplink', `/deeplinks/${id}/flag`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Page Extended Operations ====================
  async blockPage(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}/block`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unblockPage(id: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}/unblock`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async flagPage(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('page', `/pages/${id}/flag`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Campaign Extended Operations ====================
  async suspendCampaign(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}/suspend`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async resumeCampaign(id: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}/resume`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async flagCampaign(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/campaigns/${id}/flag`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Link Extended Operations ====================
  async blockLink(id: string, reason?: string, auth?: string): Promise<any> {
    return this.forward('link', `/links/${id}/block`, {
      method: 'POST',
      data: { reason },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async unblockLink(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/links/${id}/unblock`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== SSO Configuration ====================
  async getSsoConfigs(params?: { page?: number; limit?: number; provider?: string; status?: string; type?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('user', '/sso/configs', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async getSsoConfig(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/sso/configs/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async createSsoConfig(data: any, auth?: string): Promise<any> {
    return this.forward('user', '/sso/configs', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateSsoConfig(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('user', `/sso/configs/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteSsoConfig(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/sso/configs/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async testSsoConfig(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/sso/configs/${id}/test`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async toggleSsoConfig(id: string, enabled: boolean, auth?: string): Promise<any> {
    return this.forward('user', `/sso/configs/${id}/toggle`, {
      method: 'PATCH',
      data: { enabled },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSsoStats(auth?: string): Promise<any> {
    try {
      return await this.forward('user', '/sso/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalConfigs: 0,
        activeConfigs: 0,
        totalLogins: 0,
        loginsByProvider: {},
      };
    }
  }

  // ==================== Security Scan ====================
  async getSecurityStats(auth?: string): Promise<any> {
    try {
      return await this.forward('link', '/security/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalScans: 0,
        threatsDetected: 0,
        threatsBlocked: 0,
        blacklistSize: 0,
        recentEvents: [],
      };
    }
  }

  async getSecurityScans(params?: { page?: number; limit?: number; status?: string; type?: string; threatLevel?: string; search?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('link', '/security/scans', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async getSecurityScan(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/security/scans/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async triggerSecurityScan(linkId: string, auth?: string): Promise<any> {
    return this.forward('link', '/security/scans', {
      method: 'POST',
      data: { linkId },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSecurityBlacklist(params?: { page?: number; limit?: number; type?: string; search?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('link', '/security/blacklist', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async addToBlacklist(data: { pattern: string; type: string; reason?: string }, auth?: string): Promise<any> {
    return this.forward('link', '/security/blacklist', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async removeFromBlacklist(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/security/blacklist/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSecurityEvents(params?: { page?: number; limit?: number; severity?: string; type?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('link', '/security/events', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  // ==================== A/B Tests ====================
  async getAbTests(params?: { page?: number; limit?: number; status?: string; teamId?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('link', '/abtests', { params, headers: auth ? { Authorization: auth } : {} });
      const items = result?.items || result?.abtests || result?.data || [];
      const enrichedItems = await this.enrichWithTeamNames(items, auth);
      return {
        items: enrichedItems,
        total: result?.total || items.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async getAbTest(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/abtests/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async getAbTestStats(auth?: string): Promise<any> {
    try {
      return await this.forward('link', '/abtests/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalTests: 0,
        activeTests: 0,
        completedTests: 0,
        averageImprovement: 0,
      };
    }
  }

  async stopAbTest(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/abtests/${id}/stop`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getAbTestResults(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/abtests/${id}/results`, { headers: auth ? { Authorization: auth } : {} });
  }

  async declareAbTestWinner(id: string, variantId: string, auth?: string): Promise<any> {
    return this.forward('link', `/abtests/${id}/winner`, {
      method: 'POST',
      data: { variantId },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Goals & Conversions ====================
  async getGoals(params?: { page?: number; limit?: number; status?: string; teamId?: string; type?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('campaign', '/goals', { params, headers: auth ? { Authorization: auth } : {} });
      const items = result?.items || result?.goals || result?.data || [];
      const enrichedItems = await this.enrichWithTeamNames(items, auth);
      return {
        items: enrichedItems,
        total: result?.total || items.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async getGoal(id: string, auth?: string): Promise<any> {
    return this.forward('campaign', `/goals/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async getGoalStats(auth?: string): Promise<any> {
    try {
      return await this.forward('campaign', '/goals/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        averageCompletionRate: 0,
        totalConversions: 0,
      };
    }
  }

  async getGoalFunnel(id: string, params?: { startDate?: string; endDate?: string }, auth?: string): Promise<any> {
    return this.forward('campaign', `/goals/${id}/funnel`, { params, headers: auth ? { Authorization: auth } : {} });
  }

  async getGoalRankings(params?: { limit?: number; sortBy?: string; period?: string }, auth?: string): Promise<any> {
    try {
      return await this.forward('campaign', '/goals/rankings', { params, headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { items: [] };
    }
  }

  async getGoalConversions(id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('campaign', `/goals/${id}/conversions`, { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  // ==================== Redirect Rules ====================
  async getRedirectRules(params?: { page?: number; limit?: number; status?: string; type?: string; teamId?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('link', '/redirect-rules', { params, headers: auth ? { Authorization: auth } : {} });
      const items = result?.items || result?.rules || result?.data || [];
      const enrichedItems = await this.enrichWithTeamNames(items, auth);
      return {
        items: enrichedItems,
        total: result?.total || items.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async getRedirectRule(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/redirect-rules/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async getRedirectRuleStats(auth?: string): Promise<any> {
    try {
      return await this.forward('link', '/redirect-rules/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalRules: 0,
        activeRules: 0,
        disabledRules: 0,
        rulesByType: {},
        totalMatches: 0,
      };
    }
  }

  async getRedirectRuleConflicts(auth?: string): Promise<any> {
    try {
      return await this.forward('link', '/redirect-rules/conflicts', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { items: [], total: 0 };
    }
  }

  async toggleRedirectRule(id: string, enabled: boolean, auth?: string): Promise<any> {
    return this.forward('link', `/redirect-rules/${id}/toggle`, {
      method: 'PATCH',
      data: { enabled },
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async testRedirectRule(id: string, testData: { url?: string; userAgent?: string; country?: string }, auth?: string): Promise<any> {
    return this.forward('link', `/redirect-rules/${id}/test`, {
      method: 'POST',
      data: testData,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Tags (Platform Level) ====================
  async getPlatformTags(params?: { page?: number; limit?: number; category?: string; search?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('link', '/tags/platform', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async createPlatformTag(data: { name: string; description?: string; color?: string; icon?: string; category?: string }, auth?: string): Promise<any> {
    return this.forward('link', '/tags/platform', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updatePlatformTag(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('link', `/tags/platform/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deletePlatformTag(id: string, auth?: string): Promise<any> {
    return this.forward('link', `/tags/platform/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getTagStats(auth?: string): Promise<any> {
    try {
      return await this.forward('link', '/tags/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalTags: 0,
        systemTags: 0,
        customTags: 0,
        mostUsedTags: [],
      };
    }
  }

  async getPopularTags(params?: { limit?: number }, auth?: string): Promise<any> {
    try {
      return await this.forward('link', '/tags/popular', { params, headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { items: [] };
    }
  }

  // ==================== Folders Stats ====================
  async getFolderStats(auth?: string): Promise<any> {
    try {
      // Use admin endpoint to get stats across all teams
      return await this.forward('link', '/folders/admin/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalFolders: 0,
        foldersWithLinks: 0,
        averageLinksPerFolder: 0,
        topFolders: [],
      };
    }
  }

  async getFolders(params?: { page?: number; limit?: number; teamId?: string; search?: string; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }, auth?: string): Promise<any> {
    try {
      // Use admin endpoint to get all folders across all teams
      const result = await this.forward('link', '/folders/admin/all', { params, headers: auth ? { Authorization: auth } : {} });
      const items = result?.items || result?.folders || result?.data || [];
      const enrichedItems = await this.enrichWithTeamNames(items, auth);
      return {
        items: enrichedItems,
        total: result?.total || items.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  // ==================== Realtime Analytics ====================
  async getRealtimePlatformStats(auth?: string): Promise<any> {
    try {
      return await this.forward('analytics', '/realtime/platform/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        activeUsers: 0,
        clicksLastMinute: 0,
        clicksLast5Minutes: 0,
        clicksLastHour: 0,
        topCountries: [],
        topDevices: [],
      };
    }
  }

  async getRealtimeHotLinks(params?: { limit?: number; period?: string }, auth?: string): Promise<any> {
    try {
      return await this.forward('analytics', '/realtime/platform/hot-links', { params, headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { items: [] };
    }
  }

  async getRealtimeMap(auth?: string): Promise<any> {
    try {
      return await this.forward('analytics', '/realtime/platform/map', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { points: [], countries: {} };
    }
  }

  async getRealtimeTimeline(params?: { minutes?: number; interval?: string }, auth?: string): Promise<any> {
    try {
      return await this.forward('analytics', '/realtime/platform/timeline', { params, headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { points: [] };
    }
  }

  // ==================== Comments Management ====================
  async getCommentsStats(auth?: string): Promise<any> {
    try {
      return await this.forward('page', '/comments/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalComments: 0,
        pendingComments: 0,
        approvedComments: 0,
        rejectedComments: 0,
        spamComments: 0,
        reportedComments: 0,
      };
    }
  }

  async getComments(params?: { page?: number; limit?: number; status?: string; search?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('page', '/comments', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async moderateComment(id: string, data: { action: string; reason?: string }, auth?: string): Promise<any> {
    return this.forward('page', `/comments/${id}/moderate`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async batchModerateComments(data: { ids: string[]; action: string }, auth?: string): Promise<any> {
    return this.forward('page', '/comments/batch-moderate', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deleteComment(id: string, auth?: string): Promise<any> {
    return this.forward('page', `/comments/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== SEO Management ====================
  async getSeoSettings(auth?: string): Promise<any> {
    try {
      return await this.forward('page', '/seo/settings', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        defaultMetaTitle: '',
        defaultMetaDescription: '',
        defaultOgImage: '',
        robotsTxt: '',
        sitemapEnabled: true,
        autoGenerateMetaTags: true,
      };
    }
  }

  async updateSeoSettings(data: any, auth?: string): Promise<any> {
    return this.forward('page', '/seo/settings', {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSeoPages(params?: { search?: string; type?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('page', '/seo/pages', { params, headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result);
    } catch {
      return { items: [], total: 0 };
    }
  }

  async updatePageSeo(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('page', `/seo/pages/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getSeoIssues(auth?: string): Promise<any> {
    try {
      return await this.forward('page', '/seo/issues', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return { items: [] };
    }
  }

  async getSeoStats(auth?: string): Promise<any> {
    try {
      return await this.forward('page', '/seo/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        totalPages: 0,
        pagesWithSeo: 0,
        pagesWithoutSeo: 0,
        issuesCount: 0,
        avgSeoScore: 0,
      };
    }
  }

  async batchOptimizeSeo(auth?: string): Promise<any> {
    return this.forward('page', '/seo/optimize', {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Security Management (Extended) ====================
  async getSecuritySettings(auth?: string): Promise<any> {
    try {
      return await this.forward('user', '/security/settings', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        mfaRequired: false,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        ipWhitelist: [],
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecial: false,
        },
      };
    }
  }

  async updateSecuritySettings(data: any, auth?: string): Promise<any> {
    return this.forward('user', '/security/settings', {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getBlockedIps(auth?: string): Promise<any> {
    try {
      const result = await this.forward('user', '/security/blocked-ips', { headers: auth ? { Authorization: auth } : {} });
      return this.normalizeListResponse(result);
    } catch {
      return { items: [], total: 0 };
    }
  }

  async addBlockedIp(data: { ip: string; reason: string; permanent: boolean }, auth?: string): Promise<any> {
    return this.forward('user', '/security/blocked-ips', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async removeBlockedIp(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/security/blocked-ips/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getActiveSessions(params?: { page?: number; limit?: number; userId?: string; search?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('user', '/security/admin/sessions', {
        params,
        headers: auth ? { Authorization: auth } : {},
      });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  async terminateSession(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/security/admin/sessions/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getPlatformSecurityStats(auth?: string): Promise<any> {
    try {
      return await this.forward('user', '/security/admin/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        securityScore: 0,
        loginStats: { successfulLogins24h: 0, failedLogins24h: 0, totalActiveSessions: 0 },
        mfaStats: { mfaEnabled: 0, mfaDisabled: 0, mfaRate: 0 },
        blockedIps: 0,
        recentThreats: [],
      };
    }
  }

  async getPlatformSecurityEvents(params?: { page?: number; limit?: number; userId?: string; type?: string; severity?: string }, auth?: string): Promise<any> {
    try {
      const result = await this.forward('user', '/security/admin/events', {
        params,
        headers: auth ? { Authorization: auth } : {},
      });
      return this.normalizeListResponse(result, params);
    } catch {
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  // ==================== Plan Management ====================
  async getPlanStats(auth?: string): Promise<any> {
    try {
      return await this.forward('user', '/plans/stats', { headers: auth ? { Authorization: auth } : {} });
    } catch {
      return {
        total: 0,
        active: 0,
        public: 0,
        byCode: {},
      };
    }
  }

  async getPlans(includeInactive = false, auth?: string): Promise<any> {
    try {
      const result = await this.forward('user', '/plans', {
        params: { includeInactive: includeInactive ? 'true' : 'false' },
        headers: auth ? { Authorization: auth } : {},
      });
      return this.normalizeListResponse(result);
    } catch {
      return { items: [], total: 0 };
    }
  }

  async getPlan(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/plans/${id}`, { headers: auth ? { Authorization: auth } : {} });
  }

  async createPlan(data: any, auth?: string): Promise<any> {
    return this.forward('user', '/plans', {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updatePlan(id: string, data: any, auth?: string): Promise<any> {
    return this.forward('user', `/plans/${id}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async deletePlan(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/plans/${id}`, {
      method: 'DELETE',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async togglePlanActive(id: string, auth?: string): Promise<any> {
    return this.forward('user', `/plans/${id}/toggle`, {
      method: 'PATCH',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async duplicatePlan(id: string, data: { code: string; name: string }, auth?: string): Promise<any> {
    return this.forward('user', `/plans/${id}/duplicate`, {
      method: 'POST',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updatePlanSortOrder(orders: { id: string; sortOrder: number }[], auth?: string): Promise<any> {
    return this.forward('user', '/plans/sort-order', {
      method: 'PUT',
      data: orders,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async refreshPlanCache(auth?: string): Promise<any> {
    return this.forward('user', '/plans/refresh-cache', {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }

  // ==================== Quota Management ====================
  async getQuotaStats(auth?: string): Promise<any> {
    return this.forward('user', '/quota/stats', {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getQuotas(params?: { page?: number; limit?: number; search?: string; plan?: string }, auth?: string): Promise<any> {
    return this.forward('user', '/quota/teams', {
      params,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async getTeamQuota(teamId: string, auth?: string): Promise<any> {
    return this.forward('user', `/quota/teams/${teamId}`, {
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async updateTeamQuotaAdmin(teamId: string, data: any, auth?: string): Promise<any> {
    return this.forward('user', `/quota/teams/${teamId}`, {
      method: 'PUT',
      data,
      headers: auth ? { Authorization: auth } : {},
    });
  }

  async resetTeamQuota(teamId: string, auth?: string): Promise<any> {
    return this.forward('user', `/quota/teams/${teamId}/reset`, {
      method: 'POST',
      headers: auth ? { Authorization: auth } : {},
    });
  }
}
