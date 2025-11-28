import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Decorator to require IP whitelist check
export const RequireIpWhitelist = () => (target: any, key?: string, descriptor?: any) => {
  Reflect.defineMetadata('requireIpWhitelist', true, descriptor?.value || target);
  return descriptor || target;
};

// Decorator to skip IP whitelist check
export const SkipIpWhitelist = () => (target: any, key?: string, descriptor?: any) => {
  Reflect.defineMetadata('skipIpWhitelist', true, descriptor?.value || target);
  return descriptor || target;
};

export interface IpWhitelistEntry {
  id: string;
  teamId: string;
  ip: string; // Can be single IP or CIDR notation
  description?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
}

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);
  private redis: Redis | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    try {
      this.redis = new Redis(redisUrl);
    } catch (error) {
      this.logger.warn(`Redis not available for IP whitelist: ${error.message}`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if IP whitelist should be skipped
    const skipWhitelist = this.reflector.get<boolean>(
      'skipIpWhitelist',
      context.getHandler(),
    );
    if (skipWhitelist) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const teamId = request.headers['x-team-id'] as string;

    // If no team ID, skip whitelist check (unauthenticated request)
    if (!teamId) {
      return true;
    }

    // Check if team has IP whitelist enabled
    const isEnabled = await this.isWhitelistEnabled(teamId);
    if (!isEnabled) {
      return true;
    }

    // Get client IP
    const clientIp = this.getClientIp(request);

    // Check if IP is whitelisted
    const isWhitelisted = await this.isIpWhitelisted(teamId, clientIp);

    if (!isWhitelisted) {
      this.logger.warn(`Blocked request from non-whitelisted IP: ${clientIp} for team: ${teamId}`);
      throw new ForbiddenException({
        message: 'Access denied: IP address not whitelisted',
        ip: clientIp,
      });
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || '';
  }

  async isWhitelistEnabled(teamId: string): Promise<boolean> {
    if (!this.redis) return false;

    const enabled = await this.redis.get(`ip_whitelist:${teamId}:enabled`);
    return enabled === 'true';
  }

  async isIpWhitelisted(teamId: string, clientIp: string): Promise<boolean> {
    if (!this.redis) return true;

    // Get all whitelist entries for the team
    const entries = await this.redis.smembers(`ip_whitelist:${teamId}:ips`);

    for (const entry of entries) {
      const entryData = JSON.parse(entry) as IpWhitelistEntry;

      // Check expiration
      if (entryData.expiresAt && new Date(entryData.expiresAt) < new Date()) {
        continue;
      }

      // Check if IP matches
      if (this.ipMatches(clientIp, entryData.ip)) {
        return true;
      }
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

    // Wildcard match (e.g., 192.168.1.*)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
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
}
