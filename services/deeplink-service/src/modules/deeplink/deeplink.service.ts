import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import UAParser from 'ua-parser-js';
import { DeepLink } from './entities/deeplink.entity';

export interface RedirectResult {
  url: string;
  platform: 'ios' | 'android' | 'desktop' | 'fallback';
  shouldOpenApp: boolean;
  appScheme?: string;
  storeUrl?: string;
}

@Injectable()
export class DeepLinkService {
  constructor(
    @InjectRepository(DeepLink)
    private readonly deepLinkRepository: Repository<DeepLink>,
  ) {}

  async create(data: Partial<DeepLink>): Promise<DeepLink> {
    const deepLink = this.deepLinkRepository.create(data);
    return this.deepLinkRepository.save(deepLink);
  }

  async findByLinkId(linkId: string): Promise<DeepLink | null> {
    return this.deepLinkRepository.findOne({ where: { linkId, enabled: true } });
  }

  async findOne(id: string): Promise<DeepLink> {
    const deepLink = await this.deepLinkRepository.findOne({ where: { id } });
    if (!deepLink) throw new NotFoundException(`DeepLink ${id} not found`);
    return deepLink;
  }

  async findAllByTeam(teamId: string): Promise<DeepLink[]> {
    return this.deepLinkRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    teamId?: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      search?: string;
    }
  ): Promise<{ items: DeepLink[]; total: number; page: number; limit: number }> {
    const page = Number(options?.page) || 1;
    const limit = Math.min(Number(options?.limit) || 20, 100);
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';

    const queryBuilder = this.deepLinkRepository.createQueryBuilder('deeplink');

    // Team filter
    if (teamId) {
      queryBuilder.where('deeplink.teamId = :teamId', { teamId });
    }

    // Status filter
    if (options?.status === 'enabled') {
      queryBuilder.andWhere('deeplink.enabled = :enabled', { enabled: true });
    } else if (options?.status === 'disabled') {
      queryBuilder.andWhere('deeplink.enabled = :enabled', { enabled: false });
    }

    // Search
    if (options?.search) {
      queryBuilder.andWhere(
        '(deeplink.name ILIKE :search OR deeplink.fallbackUrl ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    // Sorting (whitelist allowed fields)
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'enabled', 'clicks', 'installs'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`deeplink.${safeSortBy}`, safeSortOrder);

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, limit };
  }

  async update(id: string, data: Partial<DeepLink>): Promise<DeepLink> {
    const deepLink = await this.findOne(id);
    Object.assign(deepLink, data);
    return this.deepLinkRepository.save(deepLink);
  }

  async remove(id: string): Promise<void> {
    const deepLink = await this.findOne(id);
    await this.deepLinkRepository.remove(deepLink);
  }

  async incrementClicks(id: string): Promise<void> {
    await this.deepLinkRepository.increment({ id }, 'clicks', 1);
  }

  async incrementInstalls(id: string): Promise<void> {
    await this.deepLinkRepository.increment({ id }, 'installs', 1);
  }

  resolveRedirect(deepLink: DeepLink, userAgent: string): RedirectResult {
    const parser = new UAParser(userAgent);
    const os = parser.getOS();
    const device = parser.getDevice();

    // iOS handling
    if (os.name === 'iOS' || os.name === 'Mac OS') {
      if (deepLink.iosConfig) {
        return {
          url: deepLink.iosConfig.appStoreUrl,
          platform: 'ios',
          shouldOpenApp: true,
          appScheme: deepLink.iosConfig.customScheme,
          storeUrl: deepLink.iosConfig.appStoreUrl,
        };
      }
    }

    // Android handling
    if (os.name === 'Android') {
      if (deepLink.androidConfig) {
        return {
          url: deepLink.androidConfig.playStoreUrl,
          platform: 'android',
          shouldOpenApp: true,
          appScheme: deepLink.androidConfig.customScheme,
          storeUrl: deepLink.androidConfig.playStoreUrl,
        };
      }
    }

    // Desktop
    if (device.type === undefined || device.type === 'desktop') {
      return {
        url: deepLink.desktopUrl || deepLink.fallbackUrl,
        platform: 'desktop',
        shouldOpenApp: false,
      };
    }

    // Fallback
    return {
      url: deepLink.fallbackUrl,
      platform: 'fallback',
      shouldOpenApp: false,
    };
  }

  generateRedirectHtml(deepLink: DeepLink, result: RedirectResult): string {
    const socialMeta = deepLink.socialMetadata || {};

    const script = result.shouldOpenApp
      ? `
      <script>
        (function() {
          var appScheme = '${result.appScheme || ''}';
          var storeUrl = '${result.storeUrl || result.url}';
          var fallbackUrl = '${deepLink.fallbackUrl}';
          var timeout = 2500;
          var start = Date.now();

          if (appScheme) {
            window.location.href = appScheme;

            setTimeout(function() {
              if (Date.now() - start < timeout + 500) {
                window.location.href = storeUrl;
              }
            }, timeout);
          } else {
            window.location.href = storeUrl;
          }
        })();
      </script>
      `
      : `
      <script>
        window.location.href = '${result.url}';
      </script>
      `;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${socialMeta.title || 'Redirecting...'}</title>
  <meta property="og:title" content="${socialMeta.title || ''}">
  <meta property="og:description" content="${socialMeta.description || ''}">
  ${socialMeta.imageUrl ? `<meta property="og:image" content="${socialMeta.imageUrl}">` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .loader {
      text-align: center;
      color: white;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting you to the app...</p>
  </div>
  ${script}
</body>
</html>`;
  }

  generateAppleAppSiteAssociation(teamId: string, deepLinks: DeepLink[]): object {
    const details = deepLinks
      .filter((dl) => dl.iosConfig?.bundleId)
      .map((dl) => ({
        appID: `${dl.iosConfig?.teamId || 'TEAM_ID'}.${dl.iosConfig?.bundleId}`,
        paths: [dl.iosConfig?.universalLinkPath || '*'],
      }));

    return {
      applinks: {
        apps: [],
        details,
      },
    };
  }

  generateAssetLinks(teamId: string, deepLinks: DeepLink[]): object[] {
    return deepLinks
      .filter((dl) => dl.androidConfig?.packageName)
      .map((dl) => ({
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: dl.androidConfig?.packageName || '',
          sha256_cert_fingerprints: dl.androidConfig?.sha256CertFingerprints || [],
        },
      }));
  }

  /**
   * Get platform-wide deeplink statistics (for admin console)
   */
  async getGlobalStats(): Promise<{
    totalDeepLinks: number;
    enabledDeepLinks: number;
    disabledDeepLinks: number;
    withIOSConfig: number;
    withAndroidConfig: number;
    totalClicks: number;
    totalInstalls: number;
  }> {
    const [
      totalDeepLinks,
      enabledDeepLinks,
      disabledDeepLinks,
    ] = await Promise.all([
      this.deepLinkRepository.count(),
      this.deepLinkRepository.count({ where: { enabled: true } }),
      this.deepLinkRepository.count({ where: { enabled: false } }),
    ]);

    // Count deeplinks with iOS and Android configs
    const withIOSConfig = await this.deepLinkRepository
      .createQueryBuilder('dl')
      .where('dl.iosConfig IS NOT NULL')
      .getCount();

    const withAndroidConfig = await this.deepLinkRepository
      .createQueryBuilder('dl')
      .where('dl.androidConfig IS NOT NULL')
      .getCount();

    // Get aggregated click and install stats
    const aggregateResult = await this.deepLinkRepository
      .createQueryBuilder('dl')
      .select('SUM(dl.clicks)', 'totalClicks')
      .addSelect('SUM(dl.installs)', 'totalInstalls')
      .getRawOne();

    return {
      totalDeepLinks,
      enabledDeepLinks,
      disabledDeepLinks,
      withIOSConfig,
      withAndroidConfig,
      totalClicks: parseInt(aggregateResult?.totalClicks || '0', 10),
      totalInstalls: parseInt(aggregateResult?.totalInstalls || '0', 10),
    };
  }
}
