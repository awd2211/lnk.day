import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { createHash } from 'crypto';
import {
  DeepLinkConfig,
  DeferredDeepLink,
  FallbackBehavior,
  IOSConfig,
  AndroidConfig,
  AttributionConfig,
} from './deeplink.entity';

@Injectable()
export class DeepLinkService {
  constructor(
    @InjectRepository(DeepLinkConfig)
    private readonly configRepository: Repository<DeepLinkConfig>,
    @InjectRepository(DeferredDeepLink)
    private readonly deferredRepository: Repository<DeferredDeepLink>,
  ) {}

  async createConfig(
    linkId: string,
    data: {
      ios?: IOSConfig;
      android?: AndroidConfig;
      fallbackBehavior?: FallbackBehavior;
      webFallbackUrl?: string;
      attribution?: Partial<AttributionConfig>;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
    },
  ): Promise<DeepLinkConfig> {
    const existing = await this.configRepository.findOne({ where: { linkId } });
    if (existing) {
      return this.updateConfig(linkId, data);
    }

    const config = this.configRepository.create({
      linkId,
      ios: data.ios || {},
      android: data.android || {},
      fallbackBehavior: data.fallbackBehavior || FallbackBehavior.SMART,
      webFallbackUrl: data.webFallbackUrl,
      attribution: {
        enabled: data.attribution?.enabled || false,
        deferredDeepLink: data.attribution?.deferredDeepLink || false,
        attributionWindowDays: data.attribution?.attributionWindowDays || 30,
      },
      ogTitle: data.ogTitle,
      ogDescription: data.ogDescription,
      ogImage: data.ogImage,
    });

    return this.configRepository.save(config);
  }

  async getConfig(linkId: string): Promise<DeepLinkConfig | null> {
    return this.configRepository.findOne({ where: { linkId } });
  }

  async updateConfig(
    linkId: string,
    data: Partial<{
      enabled: boolean;
      ios: IOSConfig;
      android: AndroidConfig;
      fallbackBehavior: FallbackBehavior;
      webFallbackUrl: string;
      attribution: Partial<AttributionConfig>;
      ogTitle: string;
      ogDescription: string;
      ogImage: string;
    }>,
  ): Promise<DeepLinkConfig> {
    const config = await this.configRepository.findOne({ where: { linkId } });
    if (!config) {
      throw new NotFoundException(`Deep link config for ${linkId} not found`);
    }

    if (data.ios) config.ios = { ...config.ios, ...data.ios };
    if (data.android) config.android = { ...config.android, ...data.android };
    if (data.fallbackBehavior) config.fallbackBehavior = data.fallbackBehavior;
    if (data.webFallbackUrl !== undefined) config.webFallbackUrl = data.webFallbackUrl;
    if (data.attribution) config.attribution = { ...config.attribution, ...data.attribution };
    if (data.ogTitle !== undefined) config.ogTitle = data.ogTitle;
    if (data.ogDescription !== undefined) config.ogDescription = data.ogDescription;
    if (data.ogImage !== undefined) config.ogImage = data.ogImage;
    if (data.enabled !== undefined) config.enabled = data.enabled;

    return this.configRepository.save(config);
  }

  async deleteConfig(linkId: string): Promise<void> {
    const config = await this.configRepository.findOne({ where: { linkId } });
    if (config) {
      await this.configRepository.remove(config);
    }
  }

  // Resolve deep link URL based on device
  resolveDeepLink(
    config: DeepLinkConfig,
    device: { os: string; version?: string },
    defaultUrl: string,
  ): {
    targetUrl: string;
    method: 'universal_link' | 'app_link' | 'custom_scheme' | 'fallback';
    platform: string;
  } {
    if (!config.enabled) {
      return { targetUrl: defaultUrl, method: 'fallback', platform: 'web' };
    }

    const osLower = device.os.toLowerCase();

    if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad')) {
      return this.resolveIOSLink(config, defaultUrl);
    }

    if (osLower.includes('android')) {
      return this.resolveAndroidLink(config, defaultUrl);
    }

    // Desktop or unknown
    return {
      targetUrl: config.webFallbackUrl || defaultUrl,
      method: 'fallback',
      platform: 'desktop',
    };
  }

  private resolveIOSLink(
    config: DeepLinkConfig,
    defaultUrl: string,
  ): { targetUrl: string; method: 'universal_link' | 'custom_scheme' | 'fallback'; platform: string } {
    const ios = config.ios;

    if (ios.universalLink) {
      return { targetUrl: ios.universalLink, method: 'universal_link', platform: 'ios' };
    }

    if (ios.customScheme) {
      return { targetUrl: ios.customScheme, method: 'custom_scheme', platform: 'ios' };
    }

    // Fallback
    switch (config.fallbackBehavior) {
      case FallbackBehavior.APP_STORE:
        return {
          targetUrl: ios.appStoreUrl || `https://apps.apple.com/app/id${ios.appStoreId}`,
          method: 'fallback',
          platform: 'ios',
        };
      case FallbackBehavior.WEB_FALLBACK:
        return {
          targetUrl: ios.fallbackUrl || config.webFallbackUrl || defaultUrl,
          method: 'fallback',
          platform: 'ios',
        };
      default: // SMART
        return {
          targetUrl: ios.fallbackUrl || config.webFallbackUrl || defaultUrl,
          method: 'fallback',
          platform: 'ios',
        };
    }
  }

  private resolveAndroidLink(
    config: DeepLinkConfig,
    defaultUrl: string,
  ): { targetUrl: string; method: 'app_link' | 'custom_scheme' | 'fallback'; platform: string } {
    const android = config.android;

    if (android.appLink) {
      return { targetUrl: android.appLink, method: 'app_link', platform: 'android' };
    }

    if (android.customScheme) {
      return { targetUrl: android.customScheme, method: 'custom_scheme', platform: 'android' };
    }

    // Fallback
    switch (config.fallbackBehavior) {
      case FallbackBehavior.APP_STORE:
        return {
          targetUrl: android.playStoreUrl || `https://play.google.com/store/apps/details?id=${android.packageName}`,
          method: 'fallback',
          platform: 'android',
        };
      case FallbackBehavior.WEB_FALLBACK:
        return {
          targetUrl: android.fallbackUrl || config.webFallbackUrl || defaultUrl,
          method: 'fallback',
          platform: 'android',
        };
      default: // SMART
        return {
          targetUrl: android.fallbackUrl || config.webFallbackUrl || defaultUrl,
          method: 'fallback',
          platform: 'android',
        };
    }
  }

  // Generate Apple App Site Association (AASA) file
  generateAASA(configs: DeepLinkConfig[]): object {
    const applinks: any[] = [];

    for (const config of configs) {
      if (config.ios?.bundleId && config.ios?.teamId) {
        applinks.push({
          appID: `${config.ios.teamId}.${config.ios.bundleId}`,
          paths: ['*'],
        });
      }
    }

    return {
      applinks: {
        apps: [],
        details: applinks,
      },
    };
  }

  // Generate Android assetlinks.json
  generateAssetLinks(configs: DeepLinkConfig[]): object[] {
    const links: object[] = [];

    for (const config of configs) {
      if (config.android?.packageName && config.android?.sha256CertFingerprints) {
        links.push({
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: config.android.packageName,
            sha256_cert_fingerprints: config.android.sha256CertFingerprints,
          },
        });
      }
    }

    return links;
  }

  // Deferred deep linking
  async createDeferredLink(
    linkId: string,
    context: DeferredDeepLink['context'],
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<DeferredDeepLink> {
    const fingerprint = this.generateFingerprint(deviceInfo, ipAddress);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day window

    const deferred = this.deferredRepository.create({
      linkId,
      fingerprint,
      context,
      deviceInfo,
      ipAddress,
      expiresAt,
    });

    return this.deferredRepository.save(deferred);
  }

  async matchDeferredLink(deviceInfo?: string, ipAddress?: string): Promise<DeferredDeepLink | null> {
    const fingerprint = this.generateFingerprint(deviceInfo, ipAddress);

    const match = await this.deferredRepository.findOne({
      where: {
        fingerprint,
        isConverted: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (match && new Date() < match.expiresAt) {
      // Mark as converted
      match.isConverted = true;
      match.convertedAt = new Date();
      await this.deferredRepository.save(match);
      return match;
    }

    return null;
  }

  private generateFingerprint(deviceInfo?: string, ipAddress?: string): string {
    const data = `${deviceInfo || ''}:${ipAddress || ''}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  // Cleanup expired deferred links
  async cleanupExpired(): Promise<number> {
    const result = await this.deferredRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}
