import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as crypto from 'crypto';

import { UserSession } from './entities/user-session.entity';
import {
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from './entities/security-event.entity';

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
  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    @InjectRepository(SecurityEvent)
    private readonly eventRepo: Repository<SecurityEvent>,
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

  // ========== Security Settings ==========

  async getSecuritySettings(userId: string): Promise<{
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
}
