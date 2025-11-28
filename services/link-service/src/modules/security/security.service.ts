import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UrlScanResult } from './entities/url-scan-result.entity';

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
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  // API keys
  private readonly googleSafeBrowsingApiKey: string;
  private readonly virusTotalApiKey: string;
  private readonly urlScanApiKey: string;

  // Cache for recent scans
  private scanCache: Map<string, { result: UrlAnalysis; expiry: Date }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UrlScanResult)
    private readonly scanResultRepository: Repository<UrlScanResult>,
  ) {
    this.googleSafeBrowsingApiKey = this.configService.get<string>('GOOGLE_SAFE_BROWSING_API_KEY');
    this.virusTotalApiKey = this.configService.get<string>('VIRUSTOTAL_API_KEY');
    this.urlScanApiKey = this.configService.get<string>('URLSCAN_API_KEY');
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

      const result = await response.json();

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
    } catch (error) {
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

    } catch (error) {
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

      const result = await response.json();
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
        results.set(url, analyses[index]);
      });
    }

    return results;
  }

  // ========== 定时任务：重新扫描 ==========

  // 每天凌晨 3 点重新扫描过期的安全检查
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
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
            // TODO: 发送通知给相关团队
            // TODO: 自动禁用包含此 URL 的链接
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

  // 清理过期的扫描缓存
  @Cron(CronExpression.EVERY_HOUR)
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
}
