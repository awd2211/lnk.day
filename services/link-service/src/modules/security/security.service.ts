import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { UrlScanResult } from './entities/url-scan-result.entity';
import { Link, LinkStatus } from '../link/entities/link.entity';
import { NotificationClientService } from '@lnk/nestjs-common';

// 定时间隔常量
const EVERY_HOUR = 60 * 60 * 1000;
const EVERY_DAY = 24 * 60 * 60 * 1000;

export interface SafeBrowsingResult {
  safe: boolean;
  threats: Array<{
    type: string;
    platform: string;
    url: string;
  }>;
  cached: boolean;
}

export interface ReputationScore {
  score: number; // 0-100, higher is safer
  category: 'trusted' | 'safe' | 'suspicious' | 'malicious' | 'unknown';
  factors: ReputationFactor[];
  lastChecked: Date;
}

export interface ReputationFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface UrlAnalysis {
  url: string;
  safe: boolean;
  reputation: ReputationScore;
  safeBrowsing: SafeBrowsingResult;
  domainAge?: number; // days
  sslValid?: boolean;
  redirectCount?: number;
  flaggedBy: string[];
}

@Injectable()
export class SecurityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecurityService.name);

  // API keys
  private readonly googleSafeBrowsingApiKey: string;
  private readonly virusTotalApiKey: string;
  private readonly urlScanApiKey: string;

  // Cache for recent scans
  private scanCache: Map<string, { result: UrlAnalysis; expiry: Date }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // 定时任务句柄
  private rescanInterval: NodeJS.Timeout | null = null;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UrlScanResult)
    private readonly scanResultRepository: Repository<UrlScanResult>,
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    private readonly notificationClient: NotificationClientService,
  ) {
    this.googleSafeBrowsingApiKey = this.configService.get<string>('GOOGLE_SAFE_BROWSING_API_KEY') || '';
    this.virusTotalApiKey = this.configService.get<string>('VIRUSTOTAL_API_KEY') || '';
    this.urlScanApiKey = this.configService.get<string>('URLSCAN_API_KEY') || '';
  }

  onModuleInit() {
    // 每天重新扫描过期的安全检查
    this.rescanInterval = setInterval(() => {
      this.rescanOldUrls().catch((err) => {
        this.logger.error(`重新扫描URL失败: ${err.message}`);
      });
    }, EVERY_DAY);

    // 每小时清理过期缓存
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, EVERY_HOUR);

    this.logger.log('安全服务定时任务已启动 (URL重扫/缓存清理)');
  }

  onModuleDestroy() {
    if (this.rescanInterval) {
      clearInterval(this.rescanInterval);
      this.rescanInterval = null;
    }
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    this.logger.log('安全服务定时任务已停止');
  }

  async analyzeUrl(url: string, options?: { force?: boolean }): Promise<UrlAnalysis> {
    // Check cache first
    const cached = this.scanCache.get(url);
    if (!options?.force && cached && cached.expiry > new Date()) {
      return cached.result;
    }

    const flaggedBy: string[] = [];

    // Run security checks in parallel
    const [safeBrowsingResult, reputation, domainInfo] = await Promise.all([
      this.checkGoogleSafeBrowsing(url),
      this.calculateReputationScore(url),
      this.getDomainInfo(url),
    ]);

    if (!safeBrowsingResult.safe) {
      flaggedBy.push('Google Safe Browsing');
    }

    const analysis: UrlAnalysis = {
      url,
      safe: safeBrowsingResult.safe && reputation.category !== 'malicious',
      reputation,
      safeBrowsing: safeBrowsingResult,
      domainAge: domainInfo.age,
      sslValid: domainInfo.sslValid,
      redirectCount: domainInfo.redirectCount,
      flaggedBy,
    };

    // Save to database
    await this.saveScanResult(analysis);

    // Update cache
    this.scanCache.set(url, {
      result: analysis,
      expiry: new Date(Date.now() + this.CACHE_TTL_MS),
    });

    return analysis;
  }

  async checkGoogleSafeBrowsing(url: string): Promise<SafeBrowsingResult> {
    if (!this.googleSafeBrowsingApiKey) {
      this.logger.warn('Google Safe Browsing API key not configured');
      return { safe: true, threats: [], cached: false };
    }

    try {
      const response = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${this.googleSafeBrowsingApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: {
              clientId: 'lnk.day',
              clientVersion: '1.0.0',
            },
            threatInfo: {
              threatTypes: [
                'MALWARE',
                'SOCIAL_ENGINEERING',
                'UNWANTED_SOFTWARE',
                'POTENTIALLY_HARMFUL_APPLICATION',
              ],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url }],
            },
          }),
        },
      );

      const result = await response.json() as any;

      if (result.matches && result.matches.length > 0) {
        return {
          safe: false,
          threats: result.matches.map((m: any) => ({
            type: m.threatType,
            platform: m.platformType,
            url: m.threat?.url,
          })),
          cached: false,
        };
      }

      return { safe: true, threats: [], cached: false };
    } catch (error: any) {
      this.logger.error(`Google Safe Browsing check failed: ${error.message}`);
      return { safe: true, threats: [], cached: false };
    }
  }

  async calculateReputationScore(url: string): Promise<ReputationScore> {
    const factors: ReputationFactor[] = [];
    let totalScore = 50; // Start neutral

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Factor 1: HTTPS
      if (urlObj.protocol === 'https:') {
        totalScore += 10;
        factors.push({
          name: 'HTTPS',
          impact: 'positive',
          weight: 10,
          description: 'URL uses secure HTTPS protocol',
        });
      } else {
        totalScore -= 15;
        factors.push({
          name: 'No HTTPS',
          impact: 'negative',
          weight: 15,
          description: 'URL does not use HTTPS',
        });
      }

      // Factor 2: Known safe domains
      const safeDomains = [
        'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'linkedin.com',
        'github.com', 'amazon.com', 'microsoft.com', 'apple.com', 'wikipedia.org',
      ];
      if (safeDomains.some(d => domain.endsWith(d))) {
        totalScore += 25;
        factors.push({
          name: 'Trusted Domain',
          impact: 'positive',
          weight: 25,
          description: 'Domain is a well-known trusted site',
        });
      }

      // Factor 3: Suspicious patterns
      const suspiciousPatterns = [
        /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address
        /[a-z0-9]{20,}\./, // Very long subdomain
        /-{2,}/, // Multiple hyphens
        /\.tk$|\.ml$|\.ga$|\.cf$/, // Free domains often used for phishing
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(domain)) {
          totalScore -= 20;
          factors.push({
            name: 'Suspicious Pattern',
            impact: 'negative',
            weight: 20,
            description: 'URL contains suspicious patterns',
          });
          break;
        }
      }

      // Factor 4: URL length
      if (url.length > 200) {
        totalScore -= 10;
        factors.push({
          name: 'Long URL',
          impact: 'negative',
          weight: 10,
          description: 'URL is unusually long',
        });
      }

      // Factor 5: Special characters
      const specialCharCount = (url.match(/[@!$%^&*()+=\[\]{}|\\;'"<>?]/g) || []).length;
      if (specialCharCount > 3) {
        totalScore -= 10;
        factors.push({
          name: 'Special Characters',
          impact: 'negative',
          weight: 10,
          description: 'URL contains many special characters',
        });
      }

      // Factor 6: Check domain age via VirusTotal (if configured)
      if (this.virusTotalApiKey) {
        const vtScore = await this.checkVirusTotal(url);
        totalScore += vtScore.scoreAdjustment;
        factors.push(...vtScore.factors);
      }

    } catch (error: any) {
      this.logger.error(`Reputation calculation error: ${error.message}`);
    }

    // Clamp score between 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determine category
    let category: ReputationScore['category'];
    if (totalScore >= 80) category = 'trusted';
    else if (totalScore >= 60) category = 'safe';
    else if (totalScore >= 40) category = 'suspicious';
    else if (totalScore >= 20) category = 'malicious';
    else category = 'malicious';

    return {
      score: totalScore,
      category,
      factors,
      lastChecked: new Date(),
    };
  }

  private async checkVirusTotal(url: string): Promise<{
    scoreAdjustment: number;
    factors: ReputationFactor[];
  }> {
    if (!this.virusTotalApiKey) {
      return { scoreAdjustment: 0, factors: [] };
    }

    try {
      // URL needs to be base64 encoded without padding
      const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');

      const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
        headers: { 'x-apikey': this.virusTotalApiKey },
      });

      if (response.status === 404) {
        // URL not in VirusTotal database
        return { scoreAdjustment: 0, factors: [] };
      }

      const result = await response.json() as any;
      const stats = result.data?.attributes?.last_analysis_stats;

      if (!stats) {
        return { scoreAdjustment: 0, factors: [] };
      }

      const factors: ReputationFactor[] = [];
      let adjustment = 0;

      if (stats.malicious > 0) {
        adjustment -= Math.min(stats.malicious * 10, 40);
        factors.push({
          name: 'VirusTotal Malicious',
          impact: 'negative',
          weight: Math.min(stats.malicious * 10, 40),
          description: `${stats.malicious} engines flagged as malicious`,
        });
      }

      if (stats.suspicious > 0) {
        adjustment -= Math.min(stats.suspicious * 5, 20);
        factors.push({
          name: 'VirusTotal Suspicious',
          impact: 'negative',
          weight: Math.min(stats.suspicious * 5, 20),
          description: `${stats.suspicious} engines flagged as suspicious`,
        });
      }

      if (stats.harmless > 50) {
        adjustment += 15;
        factors.push({
          name: 'VirusTotal Clean',
          impact: 'positive',
          weight: 15,
          description: 'Majority of engines consider URL safe',
        });
      }

      return { scoreAdjustment: adjustment, factors };
    } catch (error: any) {
      this.logger.error(`VirusTotal check failed: ${error.message}`);
      return { scoreAdjustment: 0, factors: [] };
    }
  }

  private async getDomainInfo(url: string): Promise<{
    age?: number;
    sslValid?: boolean;
    redirectCount?: number;
  }> {
    try {
      const urlObj = new URL(url);

      // Check SSL
      let sslValid = urlObj.protocol === 'https:';

      // Check redirects (limited check)
      let redirectCount = 0;
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual',
        });

        if (response.status >= 300 && response.status < 400) {
          redirectCount = 1;
          // Could follow redirects to count more, but keeping it simple
        }
      } catch (e) {
        // Ignore fetch errors for domain info
      }

      return {
        sslValid,
        redirectCount,
      };
    } catch (error: any) {
      return {};
    }
  }

  private async saveScanResult(analysis: UrlAnalysis): Promise<void> {
    try {
      const result = this.scanResultRepository.create({
        url: analysis.url,
        safe: analysis.safe,
        reputationScore: analysis.reputation.score,
        reputationCategory: analysis.reputation.category,
        threats: analysis.safeBrowsing.threats,
        factors: analysis.reputation.factors,
        domainAge: analysis.domainAge,
        sslValid: analysis.sslValid,
        flaggedBy: analysis.flaggedBy,
      });

      await this.scanResultRepository.save(result);
    } catch (error: any) {
      this.logger.error(`Failed to save scan result: ${error.message}`);
    }
  }

  async getScanHistory(url: string, limit: number = 10): Promise<UrlScanResult[]> {
    return this.scanResultRepository.find({
      where: { url },
      order: { scannedAt: 'DESC' },
      take: limit,
    });
  }

  async getRecentScans(teamId: string, limit: number = 50): Promise<UrlScanResult[]> {
    return this.scanResultRepository.find({
      where: { teamId },
      order: { scannedAt: 'DESC' },
      take: limit,
    });
  }

  // Quick check for link creation
  async quickSafetyCheck(url: string): Promise<{
    allowed: boolean;
    reason?: string;
    reputation?: ReputationScore;
  }> {
    // Blocked TLDs
    const blockedTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    const domain = new URL(url).hostname;

    for (const tld of blockedTLDs) {
      if (domain.endsWith(tld)) {
        return {
          allowed: false,
          reason: `Domain TLD ${tld} is blocked due to high abuse rate`,
        };
      }
    }

    // Quick reputation check
    const reputation = await this.calculateReputationScore(url);

    if (reputation.category === 'malicious') {
      return {
        allowed: false,
        reason: 'URL appears to be malicious',
        reputation,
      };
    }

    if (reputation.category === 'suspicious') {
      return {
        allowed: true,
        reason: 'URL flagged as suspicious but allowed',
        reputation,
      };
    }

    return { allowed: true, reputation };
  }

  // Batch scan multiple URLs
  async batchScan(urls: string[]): Promise<Map<string, UrlAnalysis>> {
    const results = new Map<string, UrlAnalysis>();

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const analyses = await Promise.all(batch.map(url => this.analyzeUrl(url)));

      batch.forEach((url, index) => {
        const analysis = analyses[index];
        if (analysis) {
          results.set(url, analysis);
        }
      });
    }

    return results;
  }

  // ========== 定时任务：重新扫描 ==========
  // 定时任务通过 setInterval 在 onModuleInit 中启动

  // 每天重新扫描过期的安全检查
  async rescanOldUrls(): Promise<void> {
    this.logger.log('Starting scheduled URL rescan...');

    try {
      // 查找 7 天前的扫描记录
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const oldScans = await this.scanResultRepository.find({
        where: {
          scannedAt: LessThan(sevenDaysAgo),
          safe: true, // 只重扫之前安全的 URL
        },
        take: 100, // 每次最多扫描 100 个
        order: { scannedAt: 'ASC' },
      });

      if (oldScans.length === 0) {
        this.logger.log('No old URLs to rescan');
        return;
      }

      const urls = [...new Set(oldScans.map(s => s.url))];
      this.logger.log(`Rescanning ${urls.length} URLs...`);

      let newlyMalicious = 0;

      for (const url of urls) {
        try {
          const analysis = await this.analyzeUrl(url, { force: true });

          if (!analysis.safe) {
            newlyMalicious++;
            this.logger.warn(`URL became malicious: ${url}`);

            // 查找并禁用包含此恶意 URL 的链接
            const affectedLinks = await this.disableMaliciousLinks(url, analysis);

            // 发送通知给相关团队
            if (affectedLinks.length > 0) {
              await this.notifyMaliciousUrlDetected(url, analysis, affectedLinks);
            }
          }
        } catch (error: any) {
          this.logger.error(`Failed to rescan ${url}: ${error.message}`);
        }

        // 添加延迟避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.logger.log(`Rescan complete. ${newlyMalicious} URLs became malicious.`);
    } catch (error: any) {
      this.logger.error(`Scheduled rescan failed: ${error.message}`);
    }
  }

  // 清理过期的扫描缓存 (每小时通过 setInterval 调用)
  cleanupCache(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [url, cached] of this.scanCache.entries()) {
      if (cached.expiry < now) {
        this.scanCache.delete(url);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  // 获取安全统计
  async getSecurityStats(teamId?: string): Promise<{
    totalScans: number;
    safeUrls: number;
    maliciousUrls: number;
    suspiciousUrls: number;
    recentThreats: UrlScanResult[];
  }> {
    const where = teamId ? { teamId } : {};

    const [totalScans, safeUrls, maliciousUrls] = await Promise.all([
      this.scanResultRepository.count({ where }),
      this.scanResultRepository.count({ where: { ...where, safe: true } }),
      this.scanResultRepository.count({
        where: { ...where, reputationCategory: 'malicious' as any },
      }),
    ]);

    const suspiciousUrls = await this.scanResultRepository.count({
      where: { ...where, reputationCategory: 'suspicious' as any },
    });

    const recentThreats = await this.scanResultRepository.find({
      where: { ...where, safe: false },
      order: { scannedAt: 'DESC' },
      take: 10,
    });

    return {
      totalScans,
      safeUrls,
      maliciousUrls,
      suspiciousUrls,
      recentThreats,
    };
  }

  // ========== 恶意链接处理 ==========

  /**
   * 禁用包含恶意 URL 的链接
   */
  private async disableMaliciousLinks(
    maliciousUrl: string,
    analysis: UrlAnalysis,
  ): Promise<Link[]> {
    try {
      // 查找所有使用此 URL 的链接
      const affectedLinks = await this.linkRepository.find({
        where: {
          originalUrl: maliciousUrl,
          status: In([LinkStatus.ACTIVE, LinkStatus.INACTIVE]),
        },
      });

      if (affectedLinks.length === 0) {
        return [];
      }

      this.logger.warn(
        `Found ${affectedLinks.length} links with malicious URL: ${maliciousUrl}`,
      );

      // 批量更新状态为 SUSPENDED
      const linkIds = affectedLinks.map((link) => link.id);
      await this.linkRepository.update(
        { id: In(linkIds) },
        {
          status: LinkStatus.SUSPENDED,
          updatedAt: new Date(),
        },
      );

      this.logger.log(`Suspended ${affectedLinks.length} links due to malicious URL`);

      // 记录安全事件
      for (const link of affectedLinks) {
        await this.logSecurityEvent({
          type: 'link_suspended',
          linkId: link.id,
          teamId: link.teamId,
          userId: link.userId,
          url: maliciousUrl,
          reason: `URL flagged as ${analysis.reputation.category}`,
          threats: analysis.safeBrowsing.threats,
          flaggedBy: analysis.flaggedBy,
        });
      }

      return affectedLinks;
    } catch (error: any) {
      this.logger.error(`Failed to disable malicious links: ${error.message}`);
      return [];
    }
  }

  /**
   * 发送恶意 URL 检测通知
   */
  private async notifyMaliciousUrlDetected(
    url: string,
    analysis: UrlAnalysis,
    affectedLinks: Link[],
  ): Promise<void> {
    // 按团队分组
    const linksByTeam = new Map<string, Link[]>();
    for (const link of affectedLinks) {
      const teamId = link.teamId || '';
      const existing = linksByTeam.get(teamId) || [];
      existing.push(link);
      linksByTeam.set(teamId, existing);
    }

    // 为每个受影响的团队发送通知
    for (const [teamId, links] of linksByTeam) {
      try {
        // 获取团队管理员邮箱（这里简化为使用第一个链接的用户 ID）
        // 实际应该调用 user-service 获取团队管理员列表
        const firstLink = links[0]!;

        const alertData = {
          type: '恶意链接检测',
          severity: analysis.reputation.category === 'malicious' ? 'critical' as const : 'high' as const,
          message: `检测到恶意 URL，已自动禁用 ${links.length} 个关联链接`,
          details: this.formatMaliciousUrlDetails(url, analysis, links),
        };

        // 发送邮件通知
        await this.notificationClient.sendEmail({
          to: [], // 需要从 user-service 获取团队管理员邮箱
          subject: `[安全警报] 检测到恶意链接 - ${links.length} 个链接已被禁用`,
          template: 'security-alert',
          data: {
            alertType: alertData.type,
            severity: alertData.severity,
            message: alertData.message,
            details: alertData.details,
            url,
            affectedLinks: links.map((l) => ({
              shortCode: l.shortCode,
              title: l.title,
              domain: l.domain,
            })),
            threats: analysis.safeBrowsing.threats,
            reputationScore: analysis.reputation.score,
            reputationCategory: analysis.reputation.category,
          },
        });

        this.logger.log(`Security notification sent to team ${teamId}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to send security notification to team ${teamId}: ${error.message}`,
        );
      }
    }
  }

  private formatMaliciousUrlDetails(
    url: string,
    analysis: UrlAnalysis,
    links: Link[],
  ): string {
    const parts = [
      `URL: ${url}`,
      `信誉评分: ${analysis.reputation.score}/100 (${analysis.reputation.category})`,
      `检测来源: ${analysis.flaggedBy.join(', ') || '内部分析'}`,
    ];

    if (analysis.safeBrowsing.threats.length > 0) {
      parts.push(
        `威胁类型: ${analysis.safeBrowsing.threats.map((t) => t.type).join(', ')}`,
      );
    }

    parts.push(`受影响链接数: ${links.length}`);

    return parts.join('\n');
  }

  /**
   * 记录安全事件
   */
  private async logSecurityEvent(event: {
    type: string;
    linkId?: string;
    teamId?: string;
    userId?: string;
    url: string;
    reason: string;
    threats?: any[];
    flaggedBy?: string[];
  }): Promise<void> {
    // 这里可以记录到专门的安全事件表或发送到日志系统
    this.logger.warn(`Security Event: ${JSON.stringify(event)}`);
  }

  // ========== 手动安全操作 ==========

  /**
   * 手动触发 URL 安全检查并处理
   */
  async checkAndHandleUrl(url: string): Promise<{
    analysis: UrlAnalysis;
    actionsToken?: string[];
  }> {
    const analysis = await this.analyzeUrl(url, { force: true });
    const actions: string[] = [];

    if (!analysis.safe) {
      const affectedLinks = await this.disableMaliciousLinks(url, analysis);
      if (affectedLinks.length > 0) {
        actions.push(`Suspended ${affectedLinks.length} links`);
        await this.notifyMaliciousUrlDetected(url, analysis, affectedLinks);
        actions.push('Sent security notifications');
      }
    }

    return { analysis, actionsToken: actions };
  }

  /**
   * 恢复被误判的链接
   */
  async reinstateLink(
    linkId: string,
    reason: string,
    userId: string,
  ): Promise<Link | null> {
    try {
      const link = await this.linkRepository.findOne({
        where: { id: linkId, status: LinkStatus.SUSPENDED },
      });

      if (!link) {
        return null;
      }

      // 恢复链接状态
      link.status = LinkStatus.ACTIVE;
      await this.linkRepository.save(link);

      // 记录恢复事件
      await this.logSecurityEvent({
        type: 'link_reinstated',
        linkId: link.id,
        teamId: link.teamId,
        userId,
        url: link.originalUrl,
        reason,
      });

      this.logger.log(`Link ${linkId} reinstated by user ${userId}: ${reason}`);

      return link;
    } catch (error: any) {
      this.logger.error(`Failed to reinstate link ${linkId}: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取被暂停的链接列表
   */
  async getSuspendedLinks(
    teamId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ links: Link[]; total: number }> {
    const [links, total] = await this.linkRepository.findAndCount({
      where: {
        teamId,
        status: LinkStatus.SUSPENDED,
      },
      order: { updatedAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return { links, total };
  }

  /**
   * 白名单域名检查
   */
  async isWhitelistedDomain(domain: string, teamId: string): Promise<boolean> {
    // 这里可以实现团队级别的域名白名单功能
    // 目前返回 false，表示没有白名单
    const globalWhitelist = [
      'google.com',
      'youtube.com',
      'facebook.com',
      'twitter.com',
      'linkedin.com',
      'github.com',
      'amazon.com',
      'microsoft.com',
      'apple.com',
      'wikipedia.org',
    ];

    return globalWhitelist.some((d) => domain.endsWith(d));
  }
}
