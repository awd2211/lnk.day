import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AuditLog, AuditAction, AuditSeverity } from './entities/audit-log.entity';
import { AuditService } from './audit.service';

// Types for alert configuration
export interface AuditAlertConfig {
  id: string;
  teamId: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertNotification[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'action' | 'severity' | 'threshold' | 'pattern';
  value: string | number;
  operator?: 'eq' | 'gt' | 'lt' | 'contains' | 'regex';
  timeWindow?: number; // minutes
}

export interface AlertNotification {
  type: 'webhook' | 'email' | 'slack';
  destination: string;
  template?: string;
}

export interface AnomalyAlert {
  type: 'high_volume' | 'unusual_time' | 'suspicious_pattern' | 'failed_actions';
  severity: AuditSeverity;
  message: string;
  details: Record<string, any>;
  detectedAt: Date;
}

@Injectable()
export class AuditAlertsService {
  private readonly logger = new Logger(AuditAlertsService.name);

  // In-memory alert configs (use Redis/DB in production)
  private alertConfigs = new Map<string, AuditAlertConfig[]>();

  // Baseline metrics for anomaly detection
  private baselineMetrics = new Map<string, {
    avgActionsPerHour: number;
    normalHours: number[]; // 0-23
    commonActions: string[];
    lastUpdated: Date;
  }>();

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly auditService: AuditService,
  ) {}

  // ========== Alert Configuration ==========

  async createAlertConfig(config: Omit<AuditAlertConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditAlertConfig> {
    const alertConfig: AuditAlertConfig = {
      ...config,
      id: `alert_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const teamAlerts = this.alertConfigs.get(config.teamId) || [];
    teamAlerts.push(alertConfig);
    this.alertConfigs.set(config.teamId, teamAlerts);

    return alertConfig;
  }

  async getAlertConfigs(teamId: string): Promise<AuditAlertConfig[]> {
    return this.alertConfigs.get(teamId) || [];
  }

  async updateAlertConfig(alertId: string, updates: Partial<AuditAlertConfig>): Promise<AuditAlertConfig | null> {
    for (const [teamId, configs] of this.alertConfigs.entries()) {
      const index = configs.findIndex(c => c.id === alertId);
      if (index !== -1) {
        configs[index] = { ...configs[index], ...updates, updatedAt: new Date() };
        return configs[index];
      }
    }
    return null;
  }

  async deleteAlertConfig(alertId: string): Promise<boolean> {
    for (const [teamId, configs] of this.alertConfigs.entries()) {
      const index = configs.findIndex(c => c.id === alertId);
      if (index !== -1) {
        configs.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // ========== Alert Processing ==========

  async processNewLog(log: AuditLog): Promise<void> {
    const configs = this.alertConfigs.get(log.teamId) || [];

    for (const config of configs) {
      if (!config.enabled) continue;

      if (await this.matchesConditions(log, config.conditions)) {
        await this.triggerAlertActions(log, config);
      }
    }

    // Also check for anomalies
    await this.checkForAnomalies(log);
  }

  private async matchesConditions(log: AuditLog, conditions: AlertCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.matchesCondition(log, condition)) {
        return false;
      }
    }
    return true;
  }

  private async matchesCondition(log: AuditLog, condition: AlertCondition): Promise<boolean> {
    switch (condition.type) {
      case 'action':
        return this.compareValue(log.action, condition.value, condition.operator || 'eq');

      case 'severity':
        return this.compareValue(log.severity, condition.value, condition.operator || 'eq');

      case 'threshold':
        if (!condition.timeWindow) return false;
        const count = await this.getRecentActionCount(
          log.teamId,
          log.action,
          condition.timeWindow,
        );
        return this.compareValue(count, condition.value as number, condition.operator || 'gt');

      case 'pattern':
        return this.matchesPattern(log, condition.value as string);

      default:
        return false;
    }
  }

  private compareValue(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'regex':
        return new RegExp(expected).test(String(actual));
      default:
        return false;
    }
  }

  private matchesPattern(log: AuditLog, pattern: string): boolean {
    const logString = JSON.stringify(log);
    try {
      return new RegExp(pattern).test(logString);
    } catch {
      return false;
    }
  }

  private async getRecentActionCount(
    teamId: string,
    action: AuditAction,
    minutesAgo: number,
  ): Promise<number> {
    const since = new Date();
    since.setMinutes(since.getMinutes() - minutesAgo);

    return this.auditLogRepository.count({
      where: {
        teamId,
        action,
        createdAt: MoreThan(since),
      },
    });
  }

  // ========== Alert Actions ==========

  private async triggerAlertActions(log: AuditLog, config: AuditAlertConfig): Promise<void> {
    for (const action of config.actions) {
      try {
        switch (action.type) {
          case 'webhook':
            await this.sendWebhookAlert(log, config, action.destination);
            break;

          case 'email':
            await this.sendEmailAlert(log, config, action.destination);
            break;

          case 'slack':
            await this.sendSlackAlert(log, config, action.destination);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send ${action.type} alert: ${error.message}`);
      }
    }
  }

  private async sendWebhookAlert(log: AuditLog, config: AuditAlertConfig, webhookUrl: string): Promise<void> {
    const payload = {
      alert: {
        id: config.id,
        name: config.name,
      },
      event: {
        id: log.id,
        action: log.action,
        severity: log.severity,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userId: log.userId,
        timestamp: log.createdAt.toISOString(),
        details: log.details,
      },
      team_id: log.teamId,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    this.logger.debug(`Sent webhook alert to ${webhookUrl}`);
  }

  private async sendEmailAlert(log: AuditLog, config: AuditAlertConfig, email: string): Promise<void> {
    // In production, call notification service
    this.logger.log(`Would send email alert to ${email} for ${log.action}`);
  }

  private async sendSlackAlert(log: AuditLog, config: AuditAlertConfig, slackWebhook: string): Promise<void> {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      critical: '🔥',
    };

    const payload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmoji[log.severity]} Audit Alert: ${config.name}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Action:*\n${log.action}` },
            { type: 'mrkdwn', text: `*Severity:*\n${log.severity}` },
            { type: 'mrkdwn', text: `*Resource:*\n${log.resourceType}/${log.resourceId || 'N/A'}` },
            { type: 'mrkdwn', text: `*Time:*\n${log.createdAt.toISOString()}` },
          ],
        },
      ],
    };

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // ========== Anomaly Detection ==========

  @Cron(CronExpression.EVERY_HOUR)
  async updateBaselineMetrics(): Promise<void> {
    // Get all teams with audit logs
    const teams = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.teamId', 'teamId')
      .getRawMany();

    for (const { teamId } of teams) {
      await this.calculateTeamBaseline(teamId);
    }
  }

  private async calculateTeamBaseline(teamId: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get hourly action counts
    const hourlyStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('EXTRACT(HOUR FROM log.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.createdAt >= :since', { since: thirtyDaysAgo })
      .groupBy('hour')
      .getRawMany();

    // Calculate average actions per hour
    const totalActions = hourlyStats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const avgActionsPerHour = totalActions / (30 * 24); // 30 days * 24 hours

    // Find normal operating hours (hours with above-average activity)
    const avgCount = totalActions / 24;
    const normalHours = hourlyStats
      .filter(s => parseInt(s.count) > avgCount * 0.5)
      .map(s => parseInt(s.hour));

    // Get most common actions
    const actionStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.teamId = :teamId', { teamId })
      .andWhere('log.createdAt >= :since', { since: thirtyDaysAgo })
      .groupBy('log.action')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const commonActions = actionStats.map(s => s.action);

    this.baselineMetrics.set(teamId, {
      avgActionsPerHour,
      normalHours,
      commonActions,
      lastUpdated: new Date(),
    });
  }

  private async checkForAnomalies(log: AuditLog): Promise<void> {
    const baseline = this.baselineMetrics.get(log.teamId);
    if (!baseline) return;

    const anomalies: AnomalyAlert[] = [];
    const currentHour = new Date().getHours();

    // Check for unusual time
    if (!baseline.normalHours.includes(currentHour)) {
      // Check if there's significant activity at unusual time
      const recentCount = await this.getRecentActionCount(log.teamId, log.action, 60);
      if (recentCount > baseline.avgActionsPerHour * 2) {
        anomalies.push({
          type: 'unusual_time',
          severity: 'warning',
          message: `Unusual activity detected at hour ${currentHour}`,
          details: {
            hour: currentHour,
            actionCount: recentCount,
            expectedAvg: baseline.avgActionsPerHour,
          },
          detectedAt: new Date(),
        });
      }
    }

    // Check for high volume
    const lastHourCount = await this.getRecentActionCount(log.teamId, log.action, 60);
    if (lastHourCount > baseline.avgActionsPerHour * 5) {
      anomalies.push({
        type: 'high_volume',
        severity: 'warning',
        message: `High volume of ${log.action} actions detected`,
        details: {
          action: log.action,
          count: lastHourCount,
          threshold: baseline.avgActionsPerHour * 5,
        },
        detectedAt: new Date(),
      });
    }

    // Check for suspicious patterns
    if (log.action === 'security.failed_login') {
      const failedLoginCount = await this.getRecentActionCount(
        log.teamId,
        'security.failed_login',
        15,
      );
      if (failedLoginCount >= 5) {
        anomalies.push({
          type: 'suspicious_pattern',
          severity: 'critical',
          message: `Possible brute force attack: ${failedLoginCount} failed logins in 15 minutes`,
          details: {
            failedAttempts: failedLoginCount,
            ipAddress: log.ipAddress,
          },
          detectedAt: new Date(),
        });
      }
    }

    // Check for unusual action type
    if (!baseline.commonActions.includes(log.action) && log.severity !== 'info') {
      anomalies.push({
        type: 'suspicious_pattern',
        severity: 'info',
        message: `Uncommon action type: ${log.action}`,
        details: {
          action: log.action,
          commonActions: baseline.commonActions,
        },
        detectedAt: new Date(),
      });
    }

    // Log anomalies as audit events
    for (const anomaly of anomalies) {
      await this.auditService.log({
        teamId: log.teamId,
        action: 'security.suspicious_activity',
        severity: anomaly.severity,
        resourceType: 'anomaly',
        details: {
          anomalyType: anomaly.type,
          message: anomaly.message,
          ...anomaly.details,
          triggeredBy: log.id,
        },
      });
    }
  }

  // ========== Failed Actions Monitoring ==========

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorFailedActions(): Promise<void> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    // Find teams with high error rates
    const errorStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.teamId', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('log.severity IN (:...severities)', { severities: ['error', 'critical'] })
      .andWhere('log.createdAt >= :since', { since: fiveMinutesAgo })
      .groupBy('log.teamId')
      .having('COUNT(*) > 10')
      .getRawMany();

    for (const { teamId, count } of errorStats) {
      this.logger.warn(`Team ${teamId} has ${count} errors in last 5 minutes`);

      // Create alert log
      await this.auditService.log({
        teamId,
        action: 'security.suspicious_activity',
        severity: 'warning',
        resourceType: 'system',
        details: {
          type: 'high_error_rate',
          errorCount: parseInt(count),
          timeWindow: '5 minutes',
        },
      });
    }
  }

  // ========== Retention Management ==========

  async getRetentionPolicy(teamId: string): Promise<{ retentionDays: number }> {
    // Default 90 days, enterprise could have longer
    return { retentionDays: 90 };
  }

  async setRetentionPolicy(teamId: string, retentionDays: number): Promise<void> {
    // Store in database in production
    this.logger.log(`Set retention policy for ${teamId}: ${retentionDays} days`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async applyRetentionPolicies(): Promise<void> {
    // Get all unique team IDs
    const teams = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('DISTINCT log.teamId', 'teamId')
      .getRawMany();

    for (const { teamId } of teams) {
      const policy = await this.getRetentionPolicy(teamId);
      await this.auditService.cleanupOldLogs(teamId, policy.retentionDays);
    }
  }
}
