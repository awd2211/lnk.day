import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Alert, AlertStatus, AlertSeverity } from './entities/alert.entity';
import { AlertRule, RuleType } from './entities/alert-rule.entity';
import {
  QueryAlertsDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertRulesDto,
} from './dto/alerts.dto';

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  bySeverity: Record<string, number>;
  byCategory: Array<{ category: string; count: number }>;
  recentTrend: Array<{ date: string; count: number }>;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(AlertRule)
    private readonly ruleRepository: Repository<AlertRule>,
  ) {}

  // ========== Alerts ==========

  async getAlertStats(): Promise<AlertStats> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalAlerts = await this.alertRepository.count();
    const activeAlerts = await this.alertRepository.count({
      where: { status: AlertStatus.ACTIVE },
    });
    const acknowledgedAlerts = await this.alertRepository.count({
      where: { status: AlertStatus.ACKNOWLEDGED },
    });
    const resolvedAlerts = await this.alertRepository.count({
      where: { status: AlertStatus.RESOLVED },
    });

    // By severity
    const bySeverityResult = await this.alertRepository
      .createQueryBuilder('alert')
      .select('alert.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.severity')
      .getRawMany();

    const bySeverity: Record<string, number> = {};
    for (const s of Object.values(AlertSeverity)) {
      bySeverity[s] = 0;
    }
    for (const r of bySeverityResult) {
      bySeverity[r.severity] = parseInt(r.count, 10);
    }

    // By category
    const byCategoryResult = await this.alertRepository
      .createQueryBuilder('alert')
      .select('alert.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('alert.category IS NOT NULL')
      .groupBy('alert.category')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const byCategory = byCategoryResult.map(r => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));

    // Recent trend (last 7 days)
    const trendResult = await this.alertRepository
      .createQueryBuilder('alert')
      .select("TO_CHAR(alert.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('alert.createdAt >= :last7Days', { last7Days })
      .groupBy("TO_CHAR(alert.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    const recentTrend = trendResult.map(r => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));

    return {
      totalAlerts,
      activeAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      bySeverity,
      byCategory,
      recentTrend,
    };
  }

  async findAllAlerts(query: QueryAlertsDto): Promise<{
    alerts: Alert[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Alert> = {};

    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.category) where.category = query.category;

    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.rule', 'rule')
      .where(where);

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('alert.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(alert.title ILIKE :search OR alert.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [alerts, total] = await queryBuilder
      .orderBy('alert.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneAlert(id: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['rule'],
    });
    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }
    return alert;
  }

  async acknowledgeAlert(
    id: string,
    adminId: string,
    dto: AcknowledgeAlertDto,
  ): Promise<Alert> {
    const alert = await this.findOneAlert(id);

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = adminId;
    alert.acknowledgedAt = new Date();

    if (dto.note) {
      alert.metadata = {
        ...(alert.metadata || {}),
        acknowledgeNote: dto.note,
      };
    }

    return this.alertRepository.save(alert);
  }

  async resolveAlert(id: string, adminId: string, dto: ResolveAlertDto): Promise<Alert> {
    const alert = await this.findOneAlert(id);

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedBy = adminId;
    alert.resolvedAt = new Date();
    alert.resolution = dto.resolution;

    return this.alertRepository.save(alert);
  }

  async createAlert(data: {
    title: string;
    description?: string;
    severity?: AlertSeverity;
    source?: string;
    category?: string;
    metadata?: Record<string, any>;
    ruleId?: string;
  }): Promise<Alert> {
    const alert = this.alertRepository.create({
      ...data,
      status: AlertStatus.ACTIVE,
      severity: data.severity || AlertSeverity.MEDIUM,
    });
    return this.alertRepository.save(alert);
  }

  // ========== Alert Rules ==========

  async findAllRules(query: QueryAlertRulesDto): Promise<{
    rules: AlertRule[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AlertRule> = {};

    if (query.enabled !== undefined) where.enabled = query.enabled;
    if (query.type) where.type = query.type;

    const queryBuilder = this.ruleRepository.createQueryBuilder('rule').where(where);

    if (query.search) {
      queryBuilder.andWhere(
        '(rule.name ILIKE :search OR rule.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [rules, total] = await queryBuilder
      .orderBy('rule.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      rules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneRule(id: string): Promise<AlertRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Alert rule with ID ${id} not found`);
    }
    return rule;
  }

  async createRule(adminId: string, dto: CreateAlertRuleDto): Promise<AlertRule> {
    const rule = this.ruleRepository.create({
      ...dto,
      createdBy: adminId,
    });
    return this.ruleRepository.save(rule);
  }

  async updateRule(id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> {
    const rule = await this.findOneRule(id);
    Object.assign(rule, dto);
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.findOneRule(id);
    await this.ruleRepository.remove(rule);
  }

  async toggleRule(id: string): Promise<AlertRule> {
    const rule = await this.findOneRule(id);
    rule.enabled = !rule.enabled;
    return this.ruleRepository.save(rule);
  }

  async setRuleEnabled(id: string, enabled: boolean): Promise<AlertRule> {
    const rule = await this.findOneRule(id);
    rule.enabled = enabled;
    return this.ruleRepository.save(rule);
  }

  // ========== Helpers ==========

  getSeverityLevels(): AlertSeverity[] {
    return Object.values(AlertSeverity);
  }

  getStatusTypes(): AlertStatus[] {
    return Object.values(AlertStatus);
  }

  getRuleTypes(): RuleType[] {
    return Object.values(RuleType);
  }
}
