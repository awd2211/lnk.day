import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MobileDevice {
  platform: 'ios' | 'android';
  version: string;
  deviceId: string;
  pushToken?: string;
  appVersion: string;
}

export interface LinkCreateDto {
  originalUrl: string;
  alias?: string;
  title?: string;
  tags?: string[];
  folderId?: string;
  expiresAt?: string;
  password?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface QrCodeGenerateDto {
  linkId: string;
  style?: {
    size?: number;
    color?: string;
    backgroundColor?: string;
    logoUrl?: string;
  };
}

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);
  private readonly serviceUrls: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.serviceUrls = {
      user: this.configService.get('USER_SERVICE_URL', 'http://localhost:60002'),
      link: this.configService.get('LINK_SERVICE_URL', 'http://localhost:60003'),
      analytics: this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:60050'),
      qr: this.configService.get('QR_SERVICE_URL', 'http://localhost:60005'),
    };
  }

  // ================== 设备管理 ==================

  /**
   * 注册移动设备
   */
  async registerDevice(userId: string, device: MobileDevice): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.serviceUrls.user}/api/v1/mobile/devices`, {
          userId,
          ...device,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to register device: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to register device',
        error.response?.status || 500,
      );
    }
  }

  /**
   * 更新推送令牌
   */
  async updatePushToken(
    userId: string,
    deviceId: string,
    pushToken: string,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.serviceUrls.user}/api/v1/mobile/devices/${deviceId}/push-token`, {
          userId,
          pushToken,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to update push token: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to update push token',
        error.response?.status || 500,
      );
    }
  }

  // ================== 链接管理 ==================

  /**
   * 快速创建短链接 (移动端优化)
   */
  async quickCreateLink(
    userId: string,
    teamId: string,
    data: LinkCreateDto,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.serviceUrls.link}/api/v1/links`,
          {
            ...data,
            userId,
            teamId,
            source: 'mobile',
          },
          { headers },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create link: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to create link',
        error.response?.status || 500,
      );
    }
  }

  /**
   * 获取最近链接 (移动端优化，带缓存)
   */
  async getRecentLinks(
    teamId: string,
    limit: number = 20,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.serviceUrls.link}/api/v1/links`, {
          params: { limit, sortBy: 'createdAt', sortOrder: 'DESC' },
          headers: { ...headers, 'x-team-id': teamId },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get recent links: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to get recent links',
        error.response?.status || 500,
      );
    }
  }

  /**
   * 获取链接详情 (含二维码和统计)
   */
  async getLinkDetails(
    linkId: string,
    teamId: string,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const [linkResponse, statsResponse] = await Promise.all([
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.link}/api/v1/links/${linkId}`, {
            headers: { ...headers, 'x-team-id': teamId },
          }),
        ),
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.analytics}/api/v1/analytics/link/${linkId}/summary`, {
            headers,
          }),
        ).catch(() => ({ data: null })),
      ]);

      return {
        link: linkResponse.data,
        stats: statsResponse.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get link details: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to get link details',
        error.response?.status || 500,
      );
    }
  }

  /**
   * 搜索链接
   */
  async searchLinks(
    teamId: string,
    query: string,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.serviceUrls.link}/api/v1/links`, {
          params: { search: query, limit: 50 },
          headers: { ...headers, 'x-team-id': teamId },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to search links: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to search links',
        error.response?.status || 500,
      );
    }
  }

  // ================== QR 码 ==================

  /**
   * 生成 QR 码图片
   */
  async generateQrCode(
    data: QrCodeGenerateDto,
    headers: Record<string, string>,
  ): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.serviceUrls.qr}/api/v1/qr/generate`,
          data,
          {
            headers,
            responseType: 'arraybuffer',
          },
        ),
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to generate QR code',
        error.response?.status || 500,
      );
    }
  }

  // ================== 统计和分析 ==================

  /**
   * 获取移动端仪表板数据 (聚合)
   */
  async getDashboardData(
    teamId: string,
    period: string = '7d',
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const [summaryResponse, topLinksResponse, recentActivityResponse] = await Promise.all([
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.analytics}/api/v1/analytics/team/summary`, {
            params: { teamId, period },
            headers,
          }),
        ).catch(() => ({ data: null })),
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.analytics}/api/v1/analytics/team/top-links`, {
            params: { teamId, limit: 5, period },
            headers,
          }),
        ).catch(() => ({ data: null })),
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.link}/api/v1/links`, {
            params: { limit: 10, sortBy: 'updatedAt', sortOrder: 'DESC' },
            headers: { ...headers, 'x-team-id': teamId },
          }),
        ).catch(() => ({ data: null })),
      ]);

      return {
        summary: summaryResponse.data,
        topLinks: topLinksResponse.data,
        recentActivity: recentActivityResponse.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get dashboard data: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to get dashboard data',
        error.response?.status || 500,
      );
    }
  }

  /**
   * 获取单链接实时统计
   */
  async getLinkRealtimeStats(
    linkId: string,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.serviceUrls.analytics}/api/v1/analytics/link/${linkId}/realtime`, {
          headers,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get realtime stats: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to get realtime stats',
        error.response?.status || 500,
      );
    }
  }

  // ================== 用户和设置 ==================

  /**
   * 获取用户资料 (简化版)
   */
  async getUserProfile(userId: string, headers: Record<string, string>): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.serviceUrls.user}/api/v1/users/me`, { headers }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get user profile: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to get user profile',
        error.response?.status || 500,
      );
    }
  }

  /**
   * 获取应用配置
   */
  async getAppConfig(): Promise<any> {
    return {
      features: {
        qrCodeEnabled: true,
        customDomainsEnabled: true,
        analyticsEnabled: true,
        campaignsEnabled: true,
        teamCollaborationEnabled: true,
      },
      limits: {
        maxLinksPerCreate: 10,
        maxQrCodeSize: 2048,
        maxTagsPerLink: 10,
      },
      minAppVersion: {
        ios: '1.0.0',
        android: '1.0.0',
      },
      maintenance: {
        active: false,
        message: null,
      },
    };
  }

  // ================== 分享扩展支持 ==================

  /**
   * 处理分享扩展请求 (快速创建链接)
   */
  async handleShareExtension(
    userId: string,
    teamId: string,
    url: string,
    title: string | undefined,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      // 创建短链接
      const linkResponse = await firstValueFrom(
        this.httpService.post(
          `${this.serviceUrls.link}/api/v1/links`,
          {
            originalUrl: url,
            title: title || url,
            userId,
            teamId,
            source: 'share_extension',
          },
          { headers },
        ),
      );

      const link = linkResponse.data;

      // 生成 QR 码 (可选，在后台处理)
      // 返回简化的响应以快速显示
      return {
        shortUrl: link.shortUrl,
        id: link.id,
        title: link.title,
        originalUrl: link.originalUrl,
      };
    } catch (error: any) {
      this.logger.error(`Failed to handle share extension: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to create short link',
        error.response?.status || 500,
      );
    }
  }

  // ================== 离线同步 ==================

  /**
   * 获取离线同步数据包
   */
  async getOfflineSyncData(
    teamId: string,
    lastSyncAt: string | undefined,
    headers: Record<string, string>,
  ): Promise<any> {
    try {
      const since = lastSyncAt ? new Date(lastSyncAt).toISOString() : undefined;

      const [linksResponse, foldersResponse, tagsResponse] = await Promise.all([
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.link}/api/v1/links`, {
            params: { limit: 100, updatedSince: since },
            headers: { ...headers, 'x-team-id': teamId },
          }),
        ),
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.link}/api/v1/folders`, {
            headers: { ...headers, 'x-team-id': teamId },
          }),
        ).catch(() => ({ data: [] })),
        firstValueFrom(
          this.httpService.get(`${this.serviceUrls.link}/api/v1/tags`, {
            headers: { ...headers, 'x-team-id': teamId },
          }),
        ).catch(() => ({ data: [] })),
      ]);

      return {
        links: linksResponse.data,
        folders: foldersResponse.data,
        tags: tagsResponse.data,
        syncedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get offline sync data: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Failed to sync data',
        error.response?.status || 500,
      );
    }
  }
}
