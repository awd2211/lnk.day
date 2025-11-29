import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as amqp from 'amqplib';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  responseTime?: number;
}

@Injectable()
export class HealthIndicators {
  private readonly logger = new Logger(HealthIndicators.name);

  /**
   * 检查 Redis 连接
   */
  async checkRedis(
    redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let redis: Redis | null = null;

    try {
      redis = new Redis(redisUrl, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      await redis.connect();
      const pong = await redis.ping();

      return {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        message: 'Redis connection successful',
        responseTime: Date.now() - startTime,
        details: {
          url: this.maskUrl(redisUrl),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis connection failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: {
          url: this.maskUrl(redisUrl),
        },
      };
    } finally {
      if (redis) {
        try {
          await redis.quit();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * 检查 RabbitMQ 连接
   */
  async checkRabbitMQ(
    rabbitmqUrl: string = process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let connection: amqp.ConfirmChannel | null = null;

    try {
      const conn = await amqp.connect(rabbitmqUrl, {
        timeout: 5000,
      });

      // 验证连接后立即关闭
      await conn.close();

      return {
        status: 'healthy',
        message: 'RabbitMQ connection successful',
        responseTime: Date.now() - startTime,
        details: {
          url: this.maskUrl(rabbitmqUrl),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `RabbitMQ connection failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: {
          url: this.maskUrl(rabbitmqUrl),
        },
      };
    }
  }

  /**
   * 检查 HTTP 服务
   */
  async checkHttp(
    url: string,
    timeout: number = 5000,
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        message: response.ok
          ? 'HTTP endpoint is reachable'
          : `HTTP endpoint returned ${response.status}`,
        responseTime: Date.now() - startTime,
        details: {
          url: this.maskUrl(url),
          statusCode: response.status,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `HTTP check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: {
          url: this.maskUrl(url),
        },
      };
    }
  }

  /**
   * 检查 PostgreSQL 连接（通过 DataSource）
   */
  async checkDatabase(dataSource: any): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      if (!dataSource.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Database connection not initialized',
          responseTime: Date.now() - startTime,
        };
      }

      await dataSource.query('SELECT 1');

      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime: Date.now() - startTime,
        details: {
          type: dataSource.options?.type,
          database: dataSource.options?.database,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查磁盘空间（仅限 Linux）
   */
  async checkDiskSpace(path: string = '/'): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const { execSync } = require('child_process');
      const output = execSync(`df -B1 ${path}`).toString();
      const lines = output.trim().split('\n');

      if (lines.length < 2) {
        throw new Error('Unexpected df output');
      }

      const parts = lines[1].split(/\s+/);
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const available = parseInt(parts[3], 10);
      const percentUsed = (used / total) * 100;

      return {
        status: percentUsed < 90 ? 'healthy' : 'unhealthy',
        message:
          percentUsed < 90
            ? 'Disk space is adequate'
            : 'Disk space is running low',
        responseTime: Date.now() - startTime,
        details: {
          path,
          total: this.formatBytes(total),
          used: this.formatBytes(used),
          available: this.formatBytes(available),
          percentUsed: `${percentUsed.toFixed(1)}%`,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Disk check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查内存使用
   */
  async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      return {
        status: heapUsedPercent < 90 ? 'healthy' : 'unhealthy',
        message:
          heapUsedPercent < 90
            ? 'Memory usage is normal'
            : 'Memory usage is high',
        responseTime: Date.now() - startTime,
        details: {
          heapUsed: this.formatBytes(memUsage.heapUsed),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          external: this.formatBytes(memUsage.external),
          rss: this.formatBytes(memUsage.rss),
          heapUsedPercent: `${heapUsedPercent.toFixed(1)}%`,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Memory check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      return parsed.toString();
    } catch {
      return url.replace(/:[^:@]+@/, ':***@');
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
