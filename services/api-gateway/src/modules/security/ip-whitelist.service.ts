import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface IpWhitelistEntry {
  id: string;
  teamId: string;
  ip: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface IpWhitelistSettings {
  enabled: boolean;
  enforcementMode: 'block' | 'log_only';
  bypassForAdmins: boolean;
  allowedCidrs: string[];
}

@Injectable()
export class IpWhitelistService {
  private readonly logger = new Logger(IpWhitelistService.name);
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    try {
      this.redis = new Redis(redisUrl);
    } catch (error) {
      this.logger.warn(`Redis not available: ${error.message}`);
    }
  }

  // ========== Settings ==========

  async getSettings(teamId: string): Promise<IpWhitelistSettings> {
    if (!this.redis) {
      return {
        enabled: false,
        enforcementMode: 'block',
        bypassForAdmins: true,
        allowedCidrs: [],
      };
    }

    const settings = await this.redis.hgetall(`ip_whitelist:${teamId}:settings`);

    return {
      enabled: settings.enabled === 'true',
      enforcementMode: (settings.enforcementMode as 'block' | 'log_only') || 'block',
      bypassForAdmins: settings.bypassForAdmins !== 'false',
      allowedCidrs: settings.allowedCidrs ? JSON.parse(settings.allowedCidrs) : [],
    };
  }

  async updateSettings(
    teamId: string,
    settings: Partial<IpWhitelistSettings>,
  ): Promise<IpWhitelistSettings> {
    if (!this.redis) {
      throw new BadRequestException('Redis not available');
    }

    const current = await this.getSettings(teamId);
    const updated = { ...current, ...settings };

    await this.redis.hset(`ip_whitelist:${teamId}:settings`, {
      enabled: String(updated.enabled),
      enforcementMode: updated.enforcementMode,
      bypassForAdmins: String(updated.bypassForAdmins),
      allowedCidrs: JSON.stringify(updated.allowedCidrs),
    });

    // Also set the enabled flag for quick lookup by guard
    await this.redis.set(
      `ip_whitelist:${teamId}:enabled`,
      String(updated.enabled),
    );

    this.logger.log(`Updated IP whitelist settings for team ${teamId}`);
    return updated;
  }

  async enableWhitelist(teamId: string): Promise<void> {
    await this.updateSettings(teamId, { enabled: true });
  }

  async disableWhitelist(teamId: string): Promise<void> {
    await this.updateSettings(teamId, { enabled: false });
  }

  // ========== IP Entries ==========

  async addIp(
    teamId: string,
    ip: string,
    createdBy: string,
    description?: string,
    expiresAt?: Date,
  ): Promise<IpWhitelistEntry> {
    if (!this.redis) {
      throw new BadRequestException('Redis not available');
    }

    // Validate IP format
    if (!this.isValidIpOrCidr(ip)) {
      throw new BadRequestException('Invalid IP address or CIDR notation');
    }

    // Check if already exists
    const existing = await this.getIpEntry(teamId, ip);
    if (existing) {
      throw new BadRequestException('IP address already whitelisted');
    }

    const entry: IpWhitelistEntry = {
      id: uuidv4(),
      teamId,
      ip,
      description,
      createdBy,
      createdAt: new Date(),
      expiresAt,
    };

    await this.redis.sadd(
      `ip_whitelist:${teamId}:ips`,
      JSON.stringify(entry),
    );

    this.logger.log(`Added IP ${ip} to whitelist for team ${teamId}`);
    return entry;
  }

  async removeIp(teamId: string, ip: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    const entries = await this.redis.smembers(`ip_whitelist:${teamId}:ips`);

    for (const entryStr of entries) {
      const entry = JSON.parse(entryStr) as IpWhitelistEntry;
      if (entry.ip === ip) {
        await this.redis.srem(`ip_whitelist:${teamId}:ips`, entryStr);
        this.logger.log(`Removed IP ${ip} from whitelist for team ${teamId}`);
        return true;
      }
    }

    return false;
  }

  async getIpEntry(teamId: string, ip: string): Promise<IpWhitelistEntry | null> {
    if (!this.redis) {
      return null;
    }

    const entries = await this.redis.smembers(`ip_whitelist:${teamId}:ips`);

    for (const entryStr of entries) {
      const entry = JSON.parse(entryStr) as IpWhitelistEntry;
      if (entry.ip === ip) {
        return entry;
      }
    }

    return null;
  }

  async listIps(teamId: string): Promise<IpWhitelistEntry[]> {
    if (!this.redis) {
      return [];
    }

    const entries = await this.redis.smembers(`ip_whitelist:${teamId}:ips`);
    const now = new Date();

    return entries
      .map((entryStr) => JSON.parse(entryStr) as IpWhitelistEntry)
      .filter((entry) => {
        // Filter out expired entries
        if (entry.expiresAt && new Date(entry.expiresAt) < now) {
          // Clean up expired entry
          this.redis?.srem(`ip_whitelist:${teamId}:ips`, JSON.stringify(entry));
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async bulkAddIps(
    teamId: string,
    ips: string[],
    createdBy: string,
  ): Promise<{ added: number; failed: string[] }> {
    const failed: string[] = [];
    let added = 0;

    for (const ip of ips) {
      try {
        await this.addIp(teamId, ip.trim(), createdBy);
        added++;
      } catch (error) {
        failed.push(ip);
      }
    }

    return { added, failed };
  }

  async bulkRemoveIps(teamId: string, ips: string[]): Promise<number> {
    let removed = 0;

    for (const ip of ips) {
      const success = await this.removeIp(teamId, ip.trim());
      if (success) removed++;
    }

    return removed;
  }

  // ========== Validation ==========

  async checkIp(teamId: string, ip: string): Promise<{
    allowed: boolean;
    matchedEntry?: IpWhitelistEntry;
    reason?: string;
  }> {
    const settings = await this.getSettings(teamId);

    if (!settings.enabled) {
      return { allowed: true, reason: 'IP whitelist not enabled' };
    }

    const entries = await this.listIps(teamId);

    for (const entry of entries) {
      if (this.ipMatches(ip, entry.ip)) {
        return { allowed: true, matchedEntry: entry };
      }
    }

    // Check global allowed CIDRs
    for (const cidr of settings.allowedCidrs) {
      if (this.ipMatches(ip, cidr)) {
        return { allowed: true, reason: `Matched global CIDR: ${cidr}` };
      }
    }

    return { allowed: false, reason: 'IP not in whitelist' };
  }

  // ========== Helpers ==========

  private isValidIpOrCidr(value: string): boolean {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv4 CIDR
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    // Wildcard
    const wildcardRegex = /^(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)$/;

    if (ipv4Regex.test(value)) {
      const parts = value.split('.').map(Number);
      return parts.every((p) => p >= 0 && p <= 255);
    }

    if (cidrRegex.test(value)) {
      const [ip, mask] = value.split('/');
      const parts = ip.split('.').map(Number);
      const maskNum = parseInt(mask, 10);
      return parts.every((p) => p >= 0 && p <= 255) && maskNum >= 0 && maskNum <= 32;
    }

    if (wildcardRegex.test(value)) {
      return true;
    }

    return false;
  }

  private ipMatches(clientIp: string, pattern: string): boolean {
    // Exact match
    if (clientIp === pattern) {
      return true;
    }

    // CIDR match
    if (pattern.includes('/')) {
      return this.cidrMatch(clientIp, pattern);
    }

    // Wildcard match
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$',
      );
      return regex.test(clientIp);
    }

    return false;
  }

  private cidrMatch(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);

    const maskNum = ~(2 ** (32 - mask) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  // ========== Cleanup ==========

  async cleanupExpiredEntries(teamId: string): Promise<number> {
    const entries = await this.listIps(teamId);
    // listIps already filters and cleans up expired entries
    return entries.length;
  }
}
