import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LogContext {
  /** 服务名称 */
  service?: string;
  /** 请求 ID */
  requestId?: string;
  /** 用户 ID */
  userId?: string;
  /** 追踪 ID */
  traceId?: string;
  /** 额外数据 */
  [key: string]: any;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements NestLoggerService {
  private context?: string;
  private serviceName: string;
  private logLevel: LogLevel;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'unknown';
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  setContext(context: string) {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): StructuredLog {
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
    };

    if (context || this.context) {
      log.context = {
        ...context,
        module: this.context,
      };
    }

    if (error) {
      log.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return log;
  }

  private output(log: StructuredLog) {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // 生产环境：JSON 格式
      console.log(JSON.stringify(log));
    } else {
      // 开发环境：可读格式
      const color = this.getColor(log.level);
      const reset = '\x1b[0m';
      const prefix = `${color}[${log.level.toUpperCase()}]${reset}`;
      const contextStr = log.context?.module ? ` [${log.context.module}]` : '';

      console.log(
        `${log.timestamp} ${prefix}${contextStr} ${log.message}`,
        log.context ? log.context : '',
      );

      if (log.error?.stack) {
        console.error(log.error.stack);
      }
    }
  }

  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      error: '\x1b[31m', // red
      warn: '\x1b[33m', // yellow
      info: '\x1b[32m', // green
      debug: '\x1b[36m', // cyan
      verbose: '\x1b[35m', // magenta
    };
    return colors[level];
  }

  log(message: string, context?: LogContext | string) {
    if (!this.shouldLog('info')) return;

    const ctx = typeof context === 'string' ? { module: context } : context;
    this.output(this.formatLog('info', message, ctx));
  }

  error(message: string, trace?: string, context?: string) {
    if (!this.shouldLog('error')) return;

    const error = trace ? { name: 'Error', message, stack: trace } : undefined;
    this.output(
      this.formatLog('error', message, context ? { module: context } : undefined, error as any),
    );
  }

  warn(message: string, context?: LogContext | string) {
    if (!this.shouldLog('warn')) return;

    const ctx = typeof context === 'string' ? { module: context } : context;
    this.output(this.formatLog('warn', message, ctx));
  }

  debug(message: string, context?: LogContext | string) {
    if (!this.shouldLog('debug')) return;

    const ctx = typeof context === 'string' ? { module: context } : context;
    this.output(this.formatLog('debug', message, ctx));
  }

  verbose(message: string, context?: LogContext | string) {
    if (!this.shouldLog('verbose')) return;

    const ctx = typeof context === 'string' ? { module: context } : context;
    this.output(this.formatLog('verbose', message, ctx));
  }

  /**
   * 记录带有上下文的日志
   */
  logWithContext(
    level: LogLevel,
    message: string,
    context: LogContext,
    error?: Error,
  ) {
    if (!this.shouldLog(level)) return;
    this.output(this.formatLog(level, message, context, error));
  }

  /**
   * 创建子 logger
   */
  child(context: LogContext): StructuredLoggerService {
    const childLogger = new StructuredLoggerService();
    childLogger.serviceName = this.serviceName;
    childLogger.logLevel = this.logLevel;
    childLogger.context = context.module || this.context;
    return childLogger;
  }
}
