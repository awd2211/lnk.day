import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { AuditLog, AuditAction, AuditSeverity } from './entities/audit-log.entity';

export interface AuditLogEntry {
  teamId: string;
  userId?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  apiKeyId?: string;
}

export interface AuditQueryOptions {
  teamId: string;
  userId?: string;
  actions?: AuditAction[];
  resourceType?: string;
  resourceId?: string;
  severity?: AuditSeverity[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byUser: Array<{ userId: string; count: number }>;
  recentActivity: AuditLog[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      ...entry,
      severity: entry.severity || this.determineSeverity(entry.action),
    });

    const saved = await this.auditLogRepository.save(log);
    this.logger.debug(`Audit log: ${entry.action} by ${entry.userId || 'system'}`);
    return saved;
  }

  async query(options: AuditQueryOptions): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      teamId,
      userId,
      actions,
      resourceType,
      resourceId,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortOrder = 'DESC',
    } = options;

    const qb = this.auditLogRepository.createQueryBuilder('log').where('log.teamId = :teamId', { teamId });

    if (userId) {
      qb.andWhere('log.userId = :userId', { userId });
    }

    if (actions && actions.length > 0) {
      qb.andWhere('log.action IN (:...actions)', { actions });
    }

    if (resourceType) {
      qb.andWhere('log.resourceType = :resourceType', { resourceType });
    }

    if (resourceId) {
      qb.andWhere('log.resourceId = :resourceId', { resourceId });
    }

    if (severity && severity.length > 0) {
      qb.andWhere('log.severity IN (:...severity)', { severity });
    }

    if (startDate && endDate) {
      qb.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / limit);

    const logs = await qb
      .orderBy('log.createdAt', sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { logs, total, page, totalPages };
  }

  async getById(id: string, teamId: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({
      where: { id, teamId },
    });
  }

  async getResourceHistory(
    teamId: string,
    resourceType: string,
    resourceId: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { teamId, resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUserActivity(teamId: string, userId: string, days: number = 30): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.auditLogRepository.find({
      where: {
        teamId,
        userId,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getStats(teamId: string, days: number = 30): Promise<AuditStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total count
    const totalLogs = await this.auditLogRepository.count({
      where: {
        teamId,
        createdAt: Between(startDate, new Date()),
      },
    });

    // By action
    const byActionRaw = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy('log.action')
      .getRawMany();

    const byAction: Record<string, number> = {};
    byActionRaw.forEach((row) => {
      byAction[row.action] = parseInt(row.count, 10);
    });

    // By severity
    const bySeverityRaw = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy('log.severity')
      .getRawMany();

    const bySeverity: Record<string, number> = {};
    bySeverityRaw.forEach((row) => {
      bySeverity[row.severity] = parseInt(row.count, 10);
    });

    // By user
    const byUserRaw = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .andWhere('log.userId IS NOT NULL')
      .groupBy('log.userId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const byUser = byUserRaw.map((row) => ({
      userId: row.userId,
      count: parseInt(row.count, 10),
    }));

    // Recent activity
    const recentActivity = await this.auditLogRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalLogs,
      byAction,
      bySeverity,
      byUser,
      recentActivity,
    };
  }

  async getSecurityEvents(teamId: string, limit: number = 100): Promise<AuditLog[]> {
    const securityActions: AuditAction[] = [
      'security.failed_login',
      'security.suspicious_activity',
      'security.2fa_enabled',
      'security.2fa_disabled',
      'user.password_changed',
      'api_key.created',
      'api_key.revoked',
    ];

    return this.auditLogRepository.find({
      where: {
        teamId,
        action: In(securityActions),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async exportLogs(
    teamId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const logs = await this.auditLogRepository.find({
      where: {
        teamId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });

    if (format === 'csv') {
      const headers = [
        'id',
        'action',
        'severity',
        'userId',
        'resourceType',
        'resourceId',
        'ipAddress',
        'createdAt',
      ];
      const rows = logs.map((log) =>
        [
          log.id,
          log.action,
          log.severity,
          log.userId || '',
          log.resourceType || '',
          log.resourceId || '',
          log.ipAddress || '',
          log.createdAt.toISOString(),
        ].join(','),
      );

      return [headers.join(','), ...rows].join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  async cleanupOldLogs(teamId: string, retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepository.delete({
      teamId,
      createdAt: LessThan(cutoffDate),
    });

    this.logger.log(`Cleaned up ${result.affected} audit logs older than ${retentionDays} days`);
    return result.affected || 0;
  }

  private determineSeverity(action: AuditAction): AuditSeverity {
    // Critical actions
    if (
      [
        'user.deleted',
        'team.deleted',
        'security.suspicious_activity',
        'api_key.revoked',
        'security.failed_login',
      ].includes(action)
    ) {
      return 'critical';
    }

    // Warning actions
    if (
      [
        'user.password_changed',
        'team.member_removed',
        'link.deleted',
        'domain.removed',
        'webhook.deleted',
      ].includes(action)
    ) {
      return 'warning';
    }

    // Error actions
    if (['security.failed_login'].includes(action)) {
      return 'error';
    }

    return 'info';
  }
}
