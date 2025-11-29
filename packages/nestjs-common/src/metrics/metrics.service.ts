import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';
import { MetricsModuleOptions } from './metrics.module';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: client.Registry;

  // HTTP 请求指标
  public readonly httpRequestsTotal: client.Counter<string>;
  public readonly httpRequestDuration: client.Histogram<string>;
  public readonly httpRequestsInFlight: client.Gauge<string>;

  // 数据库指标
  public readonly dbQueryDuration: client.Histogram<string>;
  public readonly dbQueryTotal: client.Counter<string>;
  public readonly dbConnectionPool: client.Gauge<string>;

  // Redis 指标
  public readonly redisOperationDuration: client.Histogram<string>;
  public readonly redisOperationTotal: client.Counter<string>;

  // RabbitMQ 指标
  public readonly rabbitmqMessagesPublished: client.Counter<string>;
  public readonly rabbitmqMessagesConsumed: client.Counter<string>;
  public readonly rabbitmqMessageDuration: client.Histogram<string>;

  // 业务指标
  public readonly businessOperations: client.Counter<string>;

  constructor(
    @Inject('METRICS_OPTIONS')
    private readonly options: MetricsModuleOptions,
  ) {
    this.registry = new client.Registry();

    // 设置默认标签
    this.registry.setDefaultLabels({
      service: this.options.serviceName,
      ...this.options.defaultLabels,
    });

    // HTTP 请求计数器
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
      registers: [this.registry],
    });

    // HTTP 请求延迟直方图
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // 正在处理的请求数
    this.httpRequestsInFlight = new client.Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'path'],
      registers: [this.registry],
    });

    // 数据库查询延迟
    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    // 数据库查询计数
    this.dbQueryTotal = new client.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [this.registry],
    });

    // 数据库连接池
    this.dbConnectionPool = new client.Gauge({
      name: 'db_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state'],
      registers: [this.registry],
    });

    // Redis 操作延迟
    this.redisOperationDuration = new client.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Redis operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.registry],
    });

    // Redis 操作计数
    this.redisOperationTotal = new client.Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status'],
      registers: [this.registry],
    });

    // RabbitMQ 消息发布
    this.rabbitmqMessagesPublished = new client.Counter({
      name: 'rabbitmq_messages_published_total',
      help: 'Total number of messages published to RabbitMQ',
      labelNames: ['exchange', 'routing_key'],
      registers: [this.registry],
    });

    // RabbitMQ 消息消费
    this.rabbitmqMessagesConsumed = new client.Counter({
      name: 'rabbitmq_messages_consumed_total',
      help: 'Total number of messages consumed from RabbitMQ',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    // RabbitMQ 消息处理延迟
    this.rabbitmqMessageDuration = new client.Histogram({
      name: 'rabbitmq_message_processing_duration_seconds',
      help: 'RabbitMQ message processing duration in seconds',
      labelNames: ['queue'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    // 业务操作计数
    this.businessOperations = new client.Counter({
      name: 'business_operations_total',
      help: 'Total number of business operations',
      labelNames: ['operation', 'status'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // 收集默认 Node.js 指标
    client.collectDefaultMetrics({ register: this.registry });
  }

  getRegistry(): client.Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  // 辅助方法：记录 HTTP 请求
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = { method, path, status_code: statusCode.toString() };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  // 辅助方法：记录数据库查询
  recordDbQuery(
    operation: string,
    table: string,
    status: 'success' | 'error',
    duration: number,
  ): void {
    this.dbQueryTotal.inc({ operation, table, status });
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  // 辅助方法：记录 Redis 操作
  recordRedisOperation(
    operation: string,
    status: 'success' | 'error',
    duration: number,
  ): void {
    this.redisOperationTotal.inc({ operation, status });
    this.redisOperationDuration.observe({ operation }, duration);
  }

  // 辅助方法：记录业务操作
  recordBusinessOperation(
    operation: string,
    status: 'success' | 'error',
  ): void {
    this.businessOperations.inc({ operation, status });
  }
}
