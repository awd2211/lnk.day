import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicators, HealthCheckResult } from './health-indicators';

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface DependencyHealth {
  name: string;
  status: ServiceStatus;
  responseTime?: number;
  message?: string;
  optional?: boolean;
}

export interface EnhancedHealthResult {
  status: ServiceStatus;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: DependencyHealth[];
  availableFeatures: string[];
  unavailableFeatures: string[];
}

export interface HealthCheckOptions {
  /** 服务名称 */
  serviceName: string;
  /** 服务版本 */
  version?: string;
  /** 检查数据库 */
  checkDatabase?: boolean;
  /** 数据库数据源 */
  dataSource?: any;
  /** 检查 Redis */
  checkRedis?: boolean;
  /** Redis URL */
  redisUrl?: string;
  /** 检查 RabbitMQ */
  checkRabbitMQ?: boolean;
  /** RabbitMQ URL */
  rabbitmqUrl?: string;
  /** 自定义依赖检查 */
  customChecks?: Array<{
    name: string;
    check: () => Promise<HealthCheckResult>;
    optional?: boolean;
    features?: string[];
  }>;
}

@Injectable()
export class EnhancedHealthService {
  private readonly logger = new Logger(EnhancedHealthService.name);
  private readonly startTime = Date.now();
  private readonly healthIndicators = new HealthIndicators();

  /**
   * 执行增强健康检查
   */
  async check(options: HealthCheckOptions): Promise<EnhancedHealthResult> {
    const dependencies: DependencyHealth[] = [];
    const availableFeatures: string[] = [];
    const unavailableFeatures: string[] = [];

    // 检查数据库
    if (options.checkDatabase && options.dataSource) {
      const dbResult = await this.healthIndicators.checkDatabase(
        options.dataSource,
      );
      dependencies.push({
        name: 'database',
        status: dbResult.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: dbResult.responseTime,
        message: dbResult.message,
      });

      if (dbResult.status === 'healthy') {
        availableFeatures.push('database_operations');
      } else {
        unavailableFeatures.push('database_operations');
      }
    }

    // 检查 Redis
    if (options.checkRedis) {
      const redisResult = await this.healthIndicators.checkRedis(
        options.redisUrl,
      );
      dependencies.push({
        name: 'redis',
        status: redisResult.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: redisResult.responseTime,
        message: redisResult.message,
        optional: true,
      });

      if (redisResult.status === 'healthy') {
        availableFeatures.push('caching', 'rate_limiting');
      } else {
        unavailableFeatures.push('caching', 'rate_limiting');
      }
    }

    // 检查 RabbitMQ
    if (options.checkRabbitMQ) {
      const mqResult = await this.healthIndicators.checkRabbitMQ(
        options.rabbitmqUrl,
      );
      dependencies.push({
        name: 'rabbitmq',
        status: mqResult.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: mqResult.responseTime,
        message: mqResult.message,
        optional: true,
      });

      if (mqResult.status === 'healthy') {
        availableFeatures.push('async_messaging', 'event_publishing');
      } else {
        unavailableFeatures.push('async_messaging', 'event_publishing');
      }
    }

    // 自定义检查
    if (options.customChecks) {
      for (const customCheck of options.customChecks) {
        try {
          const result = await customCheck.check();
          dependencies.push({
            name: customCheck.name,
            status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
            responseTime: result.responseTime,
            message: result.message,
            optional: customCheck.optional,
          });

          if (result.status === 'healthy' && customCheck.features) {
            availableFeatures.push(...customCheck.features);
          } else if (customCheck.features) {
            unavailableFeatures.push(...customCheck.features);
          }
        } catch (error) {
          dependencies.push({
            name: customCheck.name,
            status: 'unhealthy',
            message: (error as Error).message,
            optional: customCheck.optional,
          });

          if (customCheck.features) {
            unavailableFeatures.push(...customCheck.features);
          }
        }
      }
    }

    // 计算总体状态
    const status = this.calculateOverallStatus(dependencies);

    return {
      status,
      service: options.serviceName,
      version: options.version || process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      dependencies,
      availableFeatures: [...new Set(availableFeatures)],
      unavailableFeatures: [...new Set(unavailableFeatures)],
    };
  }

  /**
   * 简单的存活检查
   */
  liveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 就绪检查
   */
  async readiness(options: HealthCheckOptions): Promise<{
    status: 'ready' | 'not_ready';
    checks: DependencyHealth[];
  }> {
    const result = await this.check(options);

    // 只有核心依赖（非 optional）都健康时才就绪
    const criticalDeps = result.dependencies.filter((d) => !d.optional);
    const allCriticalHealthy = criticalDeps.every(
      (d) => d.status === 'healthy',
    );

    return {
      status: allCriticalHealthy ? 'ready' : 'not_ready',
      checks: result.dependencies,
    };
  }

  private calculateOverallStatus(dependencies: DependencyHealth[]): ServiceStatus {
    const criticalDeps = dependencies.filter((d) => !d.optional);
    const optionalDeps = dependencies.filter((d) => d.optional);

    // 任何核心依赖不健康 -> unhealthy
    if (criticalDeps.some((d) => d.status === 'unhealthy')) {
      return 'unhealthy';
    }

    // 任何可选依赖不健康 -> degraded
    if (optionalDeps.some((d) => d.status === 'unhealthy')) {
      return 'degraded';
    }

    return 'healthy';
  }
}
