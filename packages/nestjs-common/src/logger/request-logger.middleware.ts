import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestLogData {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  contentLength?: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // 添加 requestId 到请求头
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const logData: RequestLogData = {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime,
        contentLength: parseInt(res.get('content-length') || '0', 10),
        userAgent: req.get('user-agent'),
        ip: req.ip || req.socket.remoteAddress,
        userId: (req as any).user?.id,
      };

      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        // 生产环境：JSON 格式
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: res.statusCode >= 400 ? 'warn' : 'info',
            type: 'http_request',
            ...logData,
          }),
        );
      } else {
        // 开发环境：可读格式
        const statusColor = this.getStatusColor(res.statusCode);
        this.logger.log(
          `${req.method} ${logData.path} ${statusColor}${res.statusCode}\x1b[0m ${responseTime}ms`,
        );
      }
    });

    next();
  }

  private getStatusColor(status: number): string {
    if (status >= 500) return '\x1b[31m'; // red
    if (status >= 400) return '\x1b[33m'; // yellow
    if (status >= 300) return '\x1b[36m'; // cyan
    return '\x1b[32m'; // green
  }
}
