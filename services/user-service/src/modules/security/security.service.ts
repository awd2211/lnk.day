import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan, LessThanOrEqual, Between } from 'typeorm';
import * as crypto from 'crypto';

import { UserSession } from './entities/user-session.entity';
import {
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from './entities/security-event.entity';
import { BlockedIp } from './entities/blocked-ip.entity';
import { SecuritySettings } from './entities/security-settings.entity';
import { CreateBlockedIpDto } from './dto/create-blocked-ip.dto';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';

export interface CreateSessionDto {
  userId: string;
  token: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  expiresAt?: Date;
}

export interface LogSecurityEventDto {
  userId: string;
  type: SecurityEventType;
  description: string;
  severity?: SecurityEventSeverity;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
  deviceName?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    @InjectRepository(SecurityEvent)
    private readonly eventRepo: Repository<SecurityEvent>,
    @InjectRepository(BlockedIp)
    private readonly blockedIpRepo: Repository<BlockedIp>,
    @InjectRepository(SecuritySettings)
    private readonly settingsRepo: Repository<SecuritySettings>,
  ) {}

  // ========== Session Management ==========

  async createSession(dto: CreateSessionDto): Promise<UserSession> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const session = this.sessionRepo.create({
      userId: dto.userId,
      tokenHash,
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      browser: dto.browser,
      os: dto.os,
      ipAddress: dto.ipAddress,
      location: dto.location,
      expiresAt: dto.expiresAt,
      lastActivityAt: new Date(),
      isActive: true,
    });

    return this.sessionRepo.save(session);
  }

  async getSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  async getSessionByToken(token: string): Promise<UserSession | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return this.sessionRepo.findOne({
      where: { tokenHash, isActive: true },
    });
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      lastActivityAt: new Date(),
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    await this.sessionRepo.update(sessionId, { isActive: false });

    // Log security event
    await this.logEvent({
      userId,
      type: SecurityEventType.SESSION_REVOKED,
      description: `会话已注销: ${session.deviceName || '未知设备'}`,
      deviceName: session.deviceName,
    });
  }

  async revokeAllOtherSessions(
    userId: string,
    currentToken: string,
  ): Promise<{ revoked: number }> {
    const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    const result = await this.sessionRepo.update(
      {
        userId,
        isActive: true,
        tokenHash: Not(currentTokenHash),
      },
      { isActive: false },
    );

    // Log security event
    await this.logEvent({
      userId,
      type: SecurityEventType.SESSION_REVOKED,
      description: `已注销所有其他会话，共 ${result.affected || 0} 个`,
    });

    return { revoked: result.affected || 0 };
  }

  async revokeAllSessions(userId: string): Promise<{ revoked: number }> {
    const result = await this.sessionRepo.update(
      { userId, isActive: true },
      { isActive: false },
    );

    return { revoked: result.affected || 0 };
  }

  // ========== Security Events ==========

  async logEvent(dto: LogSecurityEventDto): Promise<SecurityEvent> {
    const event = this.eventRepo.create({
      userId: dto.userId,
      type: dto.type,
      description: dto.description,
      severity: dto.severity || SecurityEventSeverity.INFO,
      ipAddress: dto.ipAddress,
      location: dto.location,
      userAgent: dto.userAgent,
      deviceName: dto.deviceName,
      metadata: dto.metadata,
    });

    return this.eventRepo.save(event);
  }

  async getSecurityEvents(
    userId: string,
    options: { limit?: number; offset?: number; type?: SecurityEventType } = {},
  ): Promise<{ events: SecurityEvent[]; total: number }> {
    const { limit = 50, offset = 0, type } = options;

    const query = this.eventRepo
      .createQueryBuilder('e')
      .where('e.userId = :userId', { userId })
      .orderBy('e.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (type) {
      query.andWhere('e.type = :type', { type });
    }

    const [events, total] = await query.getManyAndCount();

    return { events, total };
  }

  // ========== Security Settings (User-level overview) ==========

  async getSecurityOverview(userId: string): Promise<{
    twoFactorEnabled: boolean;
    activeSessions: number;
    recentEvents: SecurityEvent[];
  }> {
    const [sessions, { events }] = await Promise.all([
      this.getSessions(userId),
      this.getSecurityEvents(userId, { limit: 5 }),
    ]);

    // 2FA status should be checked from 2FA service, for now return false
    return {
      twoFactorEnabled: false,
      activeSessions: sessions.length,
      recentEvents: events,
    };
  }

  // ========== Platform Security Settings (Admin) ==========

  async getPlatformSecuritySettings(): Promise<SecuritySettings> {
    let settings = await this.settingsRepo.findOne({ where: {} });

    if (!settings) {
      // Create default settings if not exists
      settings = this.settingsRepo.create({
        minPasswordLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        passwordExpiryDays: 0,
        preventPasswordReuse: 0,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        sessionTimeout: 480,
        requireMfa: false,
        ipWhitelistEnabled: false,
        ipBlacklistEnabled: true,
        rateLimit: 100,
        auditLogRetentionDays: 90,
        sensitiveDataMasking: true,
        forceHttps: true,
      });
      settings = await this.settingsRepo.save(settings);
      this.logger.log('Created default security settings');
    }

    return settings;
  }

  async updatePlatformSecuritySettings(
    dto: UpdateSecuritySettingsDto,
    adminId: string,
  ): Promise<SecuritySettings> {
    const settings = await this.getPlatformSecuritySettings();

    // Update only provided fields
    Object.assign(settings, dto);
    settings.updatedById = adminId;

    return this.settingsRepo.save(settings);
  }

  // ========== Blocked IP Management ==========

  async getBlockedIps(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ items: BlockedIp[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search } = options;

    const query = this.blockedIpRepo.createQueryBuilder('ip')
      .orderBy('ip.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.where('ip.ipAddress LIKE :search OR ip.reason LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query.getManyAndCount();

    return { items, total, page, limit };
  }

  async addBlockedIp(
    dto: CreateBlockedIpDto,
    adminId: string,
    adminName: string,
  ): Promise<BlockedIp> {
    // Check if IP is already blocked
    const existing = await this.blockedIpRepo.findOne({
      where: { ipAddress: dto.ip },
    });

    if (existing) {
      throw new ForbiddenException('该 IP 已在封禁列表中');
    }

    const blockedIp = this.blockedIpRepo.create({
      ipAddress: dto.ip,
      reason: dto.reason,
      blockedById: adminId,
      blockedByName: adminName,
      permanent: dto.permanent ?? false,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return this.blockedIpRepo.save(blockedIp);
  }

  async removeBlockedIp(id: string): Promise<void> {
    const blockedIp = await this.blockedIpRepo.findOne({ where: { id } });

    if (!blockedIp) {
      throw new NotFoundException('封禁记录不存在');
    }

    await this.blockedIpRepo.remove(blockedIp);
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const now = new Date();

    // Check for exact match or CIDR match
    const blocked = await this.blockedIpRepo
      .createQueryBuilder('ip')
      .where('ip.ipAddress = :ipAddress', { ipAddress })
      .andWhere('(ip.permanent = true OR ip.expiresAt IS NULL OR ip.expiresAt > :now)', { now })
      .getOne();

    if (blocked) {
      return true;
    }

    // For CIDR ranges, we need to do additional checking
    // This is a simplified version - in production you might want to use a proper IP library
    const allBlocked = await this.blockedIpRepo.find({
      where: [
        { permanent: true },
        { expiresAt: MoreThan(now) },
      ],
    });

    for (const entry of allBlocked) {
      if (entry.ipAddress.includes('/') && this.ipMatchesCidr(ipAddress, entry.ipAddress)) {
        return true;
      }
    }

    return false;
  }

  private ipMatchesCidr(ip: string, cidr: string): boolean {
    try {
      const parts = cidr.split('/');
      if (parts.length !== 2) return false;

      const range = parts[0]!;
      const bits = parts[1]!;
      const mask = parseInt(bits, 10);

      const ipParts = ip.split('.').map(Number);
      const rangeParts = range.split('.').map(Number);

      if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

      const ipNum = ((ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!) >>> 0;
      const rangeNum = ((rangeParts[0]! << 24) | (rangeParts[1]! << 16) | (rangeParts[2]! << 8) | rangeParts[3]!) >>> 0;
      const maskNum = ~(2 ** (32 - mask) - 1) >>> 0;

      return (ipNum & maskNum) === (rangeNum & maskNum);
    } catch {
      return false;
    }
  }

  // ========== Admin Session Management ==========

  async getAllSessions(options: {
    page?: number;
    limit?: number;
    userId?: string;
    search?: string;
  } = {}): Promise<{ items: UserSession[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, userId, search } = options;

    const query = this.sessionRepo
      .createQueryBuilder('session')
      .where('session.isActive = :isActive', { isActive: true })
      .orderBy('session.lastActivityAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) {
      query.andWhere('session.userId = :userId', { userId });
    }

    if (search) {
      query.andWhere(
        '(session.deviceName LIKE :search OR session.ipAddress LIKE :search OR session.browser LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await query.getManyAndCount();

    return { items, total, page, limit };
  }

  async terminateAnySession(sessionId: string, adminId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    await this.sessionRepo.update(sessionId, { isActive: false });

    // Log security event
    await this.logEvent({
      userId: session.userId,
      type: SecurityEventType.SESSION_REVOKED,
      description: `会话被管理员终止: ${session.deviceName || '未知设备'}`,
      deviceName: session.deviceName,
      metadata: { terminatedBy: adminId },
    });
  }

  // ========== Admin Security Events ==========

  async getAllSecurityEvents(options: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: SecurityEventType;
    severity?: SecurityEventSeverity;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ items: SecurityEvent[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, userId, type, severity, startDate, endDate } = options;

    const query = this.eventRepo
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) {
      query.andWhere('event.userId = :userId', { userId });
    }

    if (type) {
      query.andWhere('event.type = :type', { type });
    }

    if (severity) {
      query.andWhere('event.severity = :severity', { severity });
    }

    if (startDate && endDate) {
      query.andWhere('event.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      query.andWhere('event.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('event.createdAt <= :endDate', { endDate });
    }

    const [items, total] = await query.getManyAndCount();

    return { items, total, page, limit };
  }

  // ========== Security Statistics ==========

  async getSecurityStats(): Promise<{
    securityScore: number;
    loginStats: {
      successfulLogins24h: number;
      failedLogins24h: number;
      totalActiveSessions: number;
    };
    mfaStats: {
      mfaEnabled: number;
      mfaDisabled: number;
      mfaRate: number;
    };
    blockedIps: number;
    recentThreats: SecurityEvent[];
  }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Login stats
    const [successfulLogins24h, failedLogins24h, totalActiveSessions] = await Promise.all([
      this.eventRepo.count({
        where: {
          type: SecurityEventType.LOGIN_SUCCESS,
          createdAt: MoreThan(yesterday),
        },
      }),
      this.eventRepo.count({
        where: {
          type: SecurityEventType.LOGIN_FAILED,
          createdAt: MoreThan(yesterday),
        },
      }),
      this.sessionRepo.count({
        where: { isActive: true },
      }),
    ]);

    // MFA stats - TODO: integrate with 2FA module
    // For now, count from security events
    const [mfaEnabled, mfaDisabled] = await Promise.all([
      this.eventRepo.count({
        where: { type: SecurityEventType.TWO_FACTOR_ENABLED },
      }),
      this.eventRepo.count({
        where: { type: SecurityEventType.TWO_FACTOR_DISABLED },
      }),
    ]);
    const mfaRate = mfaEnabled > 0 ? Math.round((mfaEnabled / (mfaEnabled + mfaDisabled)) * 100) : 0;

    // Blocked IPs
    const blockedIps = await this.blockedIpRepo.count({
      where: [
        { permanent: true },
        { expiresAt: MoreThan(now) },
      ],
    });

    // Recent threats
    const recentThreats = await this.eventRepo.find({
      where: [
        { type: SecurityEventType.LOGIN_FAILED },
        { type: SecurityEventType.SUSPICIOUS_ACTIVITY },
        { type: SecurityEventType.ACCOUNT_LOCKED },
      ],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Calculate security score
    const settings = await this.getPlatformSecuritySettings();
    const securityScore = this.calculateSecurityScore(settings, mfaRate, blockedIps);

    return {
      securityScore,
      loginStats: {
        successfulLogins24h,
        failedLogins24h,
        totalActiveSessions,
      },
      mfaStats: {
        mfaEnabled,
        mfaDisabled,
        mfaRate,
      },
      blockedIps,
      recentThreats,
    };
  }

  private calculateSecurityScore(
    settings: SecuritySettings,
    mfaRate: number,
    blockedIps: number,
  ): number {
    let score = 0;

    // 密码策略完整性: 20 分
    if (settings.minPasswordLength >= 8) score += 5;
    if (settings.requireUppercase) score += 5;
    if (settings.requireNumbers) score += 5;
    if (settings.requireSpecialChars) score += 5;

    // MFA 启用率: 30 分
    score += Math.round((mfaRate / 100) * 30);

    // 登录安全: 20 分
    if (settings.maxLoginAttempts <= 5) score += 10;
    if (settings.lockoutDuration >= 15) score += 10;

    // IP 保护: 15 分
    if (settings.ipBlacklistEnabled) score += 10;
    if (blockedIps > 0) score += 5;

    // 其他: 15 分
    if (settings.forceHttps) score += 5;
    if (settings.sensitiveDataMasking) score += 5;
    if (settings.auditLogRetentionDays >= 30) score += 5;

    return Math.min(100, Math.max(0, score));
  }
}
