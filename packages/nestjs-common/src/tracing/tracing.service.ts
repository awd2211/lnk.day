import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  Span,
  Tracer,
} from '@opentelemetry/api';
import { TracingModuleOptions } from './tracing.module';

@Injectable()
export class TracingService implements OnModuleInit {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK;
  private tracer: Tracer;

  constructor(
    @Inject('TRACING_OPTIONS')
    private readonly options: TracingModuleOptions,
  ) {}

  async onModuleInit() {
    const jaegerEndpoint =
      this.options.jaegerEndpoint ||
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      'http://localhost:4318/v1/traces';

    const exporter = new OTLPTraceExporter({
      url: jaegerEndpoint,
    });

    this.sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: this.options.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      spanProcessor: new BatchSpanProcessor(exporter) as any,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) => {
              // 忽略健康检查和指标端点
              const url = req.url || '';
              return url.includes('/health') || url.includes('/metrics');
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });

    try {
      await this.sdk.start();
      this.tracer = trace.getTracer(this.options.serviceName);
      this.logger.log(`OpenTelemetry initialized for ${this.options.serviceName}`);
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry', error);
    }
  }

  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  // 创建一个新的 span
  startSpan(name: string, kind: SpanKind = SpanKind.INTERNAL): Span {
    return this.tracer.startSpan(name, { kind });
  }

  // 在 span 中执行异步操作
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    kind: SpanKind = SpanKind.INTERNAL,
  ): Promise<T> {
    const span = this.startSpan(name, kind);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        async () => fn(span),
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  // 为当前 span 添加事件
  addEvent(name: string, attributes?: Record<string, string | number | boolean>) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  // 为当前 span 添加属性
  setAttributes(attributes: Record<string, string | number | boolean>) {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  // 获取当前活动的 span
  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  // 获取当前的 trace ID
  getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  // 获取当前的 span ID
  getCurrentSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().spanId;
  }
}
