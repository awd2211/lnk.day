import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 告警级别
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// 告警状态
export enum AlertStatus {
  FIRING = 'firing',
  RESOLVED = 'resolved',
  ACKNOWLEDGED = 'acknowledged',
}

// 告警定义
export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// 指标类型
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

// 指标定义
export interface Metric {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
}

// 指标值
export interface MetricValue {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

// 健康检查结果
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  latency?: number;
  lastCheck: Date;
}

// 告警规则
export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  duration: number; // 持续时间（秒）
  severity: AlertSeverity;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

// 告警通知渠道
export interface NotificationChannel {
  type: 'webhook' | 'email' | 'slack' | 'pagerduty';
  config: Record<string, any>;
  severities: AlertSeverity[];
}

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly metrics: Map<string, MetricValue[]> = new Map();
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly healthChecks: Map<string, () => Promise<HealthCheck>> = new Map();
  private readonly alertRules: AlertRule[] = [];
  private readonly notificationChannels: NotificationChannel[] = [];

  private checkInterval: NodeJS.Timeout | null = null;
  private readonly serviceName: string;
  private readonly retentionPeriod: number = 3600000; // 1 hour

  constructor(private readonly configService: ConfigService) {
    this.serviceName = configService.get('SERVICE_NAME', 'unknown');
  }

  onModuleInit() {
    // 启动定期检查
    this.checkInterval = setInterval(() => {
      this.evaluateAlertRules();
      this.runHealthChecks();
      this.cleanupOldMetrics();
    }, 30000); // 30 seconds

    this.logger.log('Monitoring service initialized');
  }

  onModuleDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  // ==================== 指标管理 ====================

  /**
   * 注册指标
   */
  registerMetric(metric: Metric): void {
    this.metrics.set(metric.name, []);
    this.logger.debug(`Metric registered: ${metric.name}`);
  }

  /**
   * 记录计数器增量
   */
  incrementCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 记录仪表值
   */
  setGauge(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 记录直方图值
   */
  observeHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric(name, value, labels);
  }

  /**
   * 记录计时器（自动转换为直方图）
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6; // 转换为毫秒
      this.observeHistogram(name, duration, labels);
    };
  }

  private recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const metricValue: MetricValue = {
      name,
      value,
      labels,
      timestamp: new Date(),
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metricValue);
  }

  /**
   * 获取指标值
   */
  getMetricValues(
    name: string,
    duration?: number,
    labels?: Record<string, string>,
  ): MetricValue[] {
    const values = this.metrics.get(name) || [];
    const now = Date.now();
    const cutoff = duration ? now - duration : 0;

    return values.filter(v => {
      if (v.timestamp.getTime() < cutoff) return false;
      if (labels) {
        return Object.entries(labels).every(
          ([key, value]) => v.labels?.[key] === value,
        );
      }
      return true;
    });
  }

  /**
   * 获取指标聚合值
   */
  getMetricAggregation(
    name: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99',
    duration?: number,
    labels?: Record<string, string>,
  ): number {
    const values = this.getMetricValues(name, duration, labels);
    if (values.length === 0) return 0;

    const numbers = values.map(v => v.value);

    switch (aggregation) {
      case 'sum':
        return numbers.reduce((a, b) => a + b, 0);
      case 'avg':
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
      case 'min':
        return Math.min(...numbers);
      case 'max':
        return Math.max(...numbers);
      case 'count':
        return numbers.length;
      case 'p50':
        return this.percentile(numbers, 0.5);
      case 'p95':
        return this.percentile(numbers, 0.95);
      case 'p99':
        return this.percentile(numbers, 0.99);
      default:
        return 0;
    }
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.retentionPeriod;

    this.metrics.forEach((values, name) => {
      const filtered = values.filter(v => v.timestamp.getTime() > cutoff);
      this.metrics.set(name, filtered);
    });
  }

  // ==================== 告警管理 ====================

  /**
   * 注册告警规则
   */
  registerAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.logger.log(`Alert rule registered: ${rule.name}`);
  }

  /**
   * 触发告警
   */
  fireAlert(alert: Omit<Alert, 'id' | 'status' | 'startsAt'>): void {
    const id = `${alert.name}-${Object.values(alert.labels || {}).join('-')}`;

    const existingAlert = this.alerts.get(id);
    if (existingAlert && existingAlert.status === AlertStatus.FIRING) {
      return; // 已经在告警中
    }

    const newAlert: Alert = {
      ...alert,
      id,
      status: AlertStatus.FIRING,
      startsAt: new Date(),
    };

    this.alerts.set(id, newAlert);
    this.logger.warn(`Alert fired: ${alert.name} - ${alert.message}`);
    this.sendAlertNotification(newAlert);
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== AlertStatus.FIRING) return;

    alert.status = AlertStatus.RESOLVED;
    alert.endsAt = new Date();

    this.logger.log(`Alert resolved: ${alert.name}`);
    this.sendAlertNotification(alert);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, userId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    this.logger.log(`Alert acknowledged: ${alert.name} by ${userId}`);
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(
      a => a.status === AlertStatus.FIRING,
    );
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .slice(0, limit);
  }

  private evaluateAlertRules(): void {
    for (const rule of this.alertRules) {
      const value = this.getMetricAggregation(rule.metric, 'avg', rule.duration * 1000);
      const shouldFire = this.evaluateCondition(value, rule.condition, rule.threshold);

      const alertId = `${rule.name}-${this.serviceName}`;

      if (shouldFire) {
        this.fireAlert({
          name: rule.name,
          severity: rule.severity,
          message: `${rule.metric} is ${rule.condition} ${rule.threshold} (current: ${value})`,
          labels: {
            service: this.serviceName,
            ...rule.labels,
          },
          annotations: rule.annotations || {},
        });
      } else {
        const existingAlert = this.alerts.get(alertId);
        if (existingAlert?.status === AlertStatus.FIRING) {
          this.resolveAlert(alertId);
        }
      }
    }
  }

  private evaluateCondition(
    value: number,
    condition: string,
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'ne':
        return value !== threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  // ==================== 通知渠道 ====================

  /**
   * 注册通知渠道
   */
  registerNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.push(channel);
    this.logger.log(`Notification channel registered: ${channel.type}`);
  }

  private async sendAlertNotification(alert: Alert): Promise<void> {
    for (const channel of this.notificationChannels) {
      if (!channel.severities.includes(alert.severity)) continue;

      try {
        switch (channel.type) {
          case 'webhook':
            await this.sendWebhookNotification(channel.config, alert);
            break;
          case 'slack':
            await this.sendSlackNotification(channel.config, alert);
            break;
          // 其他渠道...
        }
      } catch (error: any) {
        this.logger.error(`Failed to send notification: ${error.message}`);
      }
    }
  }

  private async sendWebhookNotification(
    config: Record<string, any>,
    alert: Alert,
  ): Promise<void> {
    await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  private async sendSlackNotification(
    config: Record<string, any>,
    alert: Alert,
  ): Promise<void> {
    const color = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ffc107',
      [AlertSeverity.ERROR]: '#dc3545',
      [AlertSeverity.CRITICAL]: '#6f42c1',
    }[alert.severity];

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `[${alert.status.toUpperCase()}] ${alert.name}`,
            text: alert.message,
            fields: Object.entries(alert.labels).map(([key, value]) => ({
              title: key,
              value,
              short: true,
            })),
            footer: `Service: ${alert.labels.service || 'unknown'}`,
            ts: Math.floor(alert.startsAt.getTime() / 1000),
          },
        ],
      }),
    });
  }

  // ==================== 健康检查 ====================

  /**
   * 注册健康检查
   */
  registerHealthCheck(
    name: string,
    check: () => Promise<HealthCheck>,
  ): void {
    this.healthChecks.set(name, check);
    this.logger.debug(`Health check registered: ${name}`);
  }

  /**
   * 运行单个健康检查
   */
  async runHealthCheck(name: string): Promise<HealthCheck | null> {
    const check = this.healthChecks.get(name);
    if (!check) return null;

    const start = Date.now();
    try {
      const result = await check();
      result.latency = Date.now() - start;
      result.lastCheck = new Date();
      return result;
    } catch (error: any) {
      return {
        name,
        status: 'unhealthy',
        message: error.message,
        latency: Date.now() - start,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * 运行所有健康检查
   */
  async runHealthChecks(): Promise<Map<string, HealthCheck>> {
    const results = new Map<string, HealthCheck>();

    for (const [name] of this.healthChecks) {
      const result = await this.runHealthCheck(name);
      if (result) {
        results.set(name, result);

        // 对于不健康的检查触发告警
        if (result.status === 'unhealthy') {
          this.fireAlert({
            name: `health_check_${name}`,
            severity: AlertSeverity.ERROR,
            message: `Health check failed: ${result.message}`,
            labels: {
              service: this.serviceName,
              check: name,
            },
            annotations: {
              summary: `Health check ${name} is failing`,
            },
          });
        }
      }
    }

    return results;
  }

  /**
   * 获取整体健康状态
   */
  async getOverallHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, HealthCheck>;
  }> {
    const checksMap = await this.runHealthChecks();
    const checks: Record<string, HealthCheck> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    checksMap.forEach((check, name) => {
      checks[name] = check;

      if (check.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (check.status === 'degraded' && overallStatus !== 'unhealthy') {
        overallStatus = 'degraded';
      }
    });

    return { status: overallStatus, checks };
  }

  // ==================== Prometheus 格式导出 ====================

  /**
   * 导出 Prometheus 格式指标
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    this.metrics.forEach((values, name) => {
      if (values.length === 0) return;

      // 获取最新值
      const latestByLabels = new Map<string, MetricValue>();
      for (const value of values) {
        const labelKey = JSON.stringify(value.labels || {});
        const existing = latestByLabels.get(labelKey);
        if (!existing || value.timestamp > existing.timestamp) {
          latestByLabels.set(labelKey, value);
        }
      }

      latestByLabels.forEach(value => {
        const labels = value.labels
          ? Object.entries(value.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${name}${labelStr} ${value.value}`);
      });
    });

    return lines.join('\n');
  }
}
