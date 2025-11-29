import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In, FindOptionsWhere } from 'typeorm';
import { AuditLog, ActorType, AuditStatus, AuditAction } from './entities/audit-log.entity';
import { QueryAuditLogsDto, CreateAuditLogDto, ExportAuditLogsDto } from './dto/query-audit-logs.dto';

export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  successRate: number;
  topActions: Array<{ action: string; count: number }>;
  topActors: Array<{ actorId: string; actorName: string; count: number }>;
  recentActivity: Array<{ hour: string; count: number }>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async getStats(): Promise<AuditStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Total logs
    const totalLogs = await this.auditLogRepository.count();

    // Today's logs
    const todayLogs = await this.auditLogRepository.count({
      where: {
        createdAt: Between(todayStart, now),
      },
    });

    // Success rate
    const successCount = await this.auditLogRepository.count({
      where: { status: AuditStatus.SUCCESS },
    });
    const successRate = totalLogs > 0 ? Math.round((successCount / totalLogs) * 100) : 100;

    // Top actions
    const topActionsResult = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topActions = topActionsResult.map(r => ({
      action: r.action,
      count: parseInt(r.count, 10),
    }));

    // Top actors
    const topActorsResult = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.actorId', 'actorId')
      .addSelect('audit.actorName', 'actorName')
      .addSelect('COUNT(*)', 'count')
      .where('audit.actorId IS NOT NULL')
      .groupBy('audit.actorId')
      .addGroupBy('audit.actorName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topActors = topActorsResult.map(r => ({
      actorId: r.actorId,
      actorName: r.actorName || 'Unknown',
      count: parseInt(r.count, 10),
    }));

    // Recent activity by hour (last 24 hours)
    const recentActivityResult = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select("TO_CHAR(audit.createdAt, 'YYYY-MM-DD HH24:00')", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt >= :last24Hours', { last24Hours })
      .groupBy("TO_CHAR(audit.createdAt, 'YYYY-MM-DD HH24:00')")
      .orderBy('hour', 'ASC')
      .getRawMany();

    const recentActivity = recentActivityResult.map(r => ({
      hour: r.hour,
      count: parseInt(r.count, 10),
    }));

    return {
      totalLogs,
      todayLogs,
      successRate,
      topActions,
      topActors,
      recentActivity,
    };
  }

  async findAll(query: QueryAuditLogsDto): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (query.action) {
      where.action = query.action;
    }
    if (query.actorType) {
      where.actorType = query.actorType;
    }
    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.targetType) {
      where.targetType = query.targetType;
    }
    if (query.targetId) {
      where.targetId = query.targetId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.ipAddress) {
      where.ipAddress = query.ipAddress;
    }

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .where(where);

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    } else if (query.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(audit.actorName ILIKE :search OR audit.targetName ILIKE :search OR audit.action ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [logs, total] = await queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepository.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
    return log;
  }

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      ...dto,
      status: dto.status || AuditStatus.SUCCESS,
    });
    return this.auditLogRepository.save(log);
  }

  async log(
    action: string,
    actorType: ActorType,
    actorId: string,
    actorName: string,
    options?: {
      targetType?: string;
      targetId?: string;
      targetName?: string;
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      status?: AuditStatus;
      errorMessage?: string;
    },
  ): Promise<AuditLog> {
    return this.create({
      action,
      actorType,
      actorId,
      actorName,
      ...options,
    });
  }

  async export(query: ExportAuditLogsDto): Promise<{
    data: string;
    contentType: string;
    filename: string;
  }> {
    // Get all matching logs (no pagination for export)
    const { logs } = await this.findAll({
      ...query,
      page: 1,
      limit: 100000, // Large limit for export
    });

    const format = query.format || 'csv';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'json') {
      return {
        data: JSON.stringify(logs, null, 2),
        contentType: 'application/json',
        filename: `audit-logs-${timestamp}.json`,
      };
    }

    // CSV format
    const headers = [
      'ID',
      'Action',
      'Actor Type',
      'Actor ID',
      'Actor Name',
      'Target Type',
      'Target ID',
      'Target Name',
      'Status',
      'IP Address',
      'Created At',
    ];

    const rows = logs.map(log => [
      log.id,
      log.action,
      log.actorType,
      log.actorId || '',
      log.actorName || '',
      log.targetType || '',
      log.targetId || '',
      log.targetName || '',
      log.status,
      log.ipAddress || '',
      log.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return {
      data: csvContent,
      contentType: 'text/csv',
      filename: `audit-logs-${timestamp}.csv`,
    };
  }

  // Helper method to get action types for filtering
  getActionTypes(): string[] {
    return Object.values(AuditAction);
  }

  // Helper method to get actor types for filtering
  getActorTypes(): ActorType[] {
    return Object.values(ActorType);
  }
}
