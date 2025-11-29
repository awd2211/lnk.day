import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const path = this.normalizePath(request.route?.path || request.path);
    const startTime = Date.now();

    // 增加正在处理的请求数
    this.metricsService.httpRequestsInFlight.inc({ method, path });

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = response.statusCode;
        this.metricsService.recordHttpRequest(method, path, statusCode, duration);
        this.metricsService.httpRequestsInFlight.dec({ method, path });
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error.status || 500;
        this.metricsService.recordHttpRequest(method, path, statusCode, duration);
        this.metricsService.httpRequestsInFlight.dec({ method, path });
        throw error;
      }),
    );
  }

  private normalizePath(path: string): string {
    // 将路径中的 ID 参数标准化，避免高基数标签
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9]{6,12}$/g, '/:code'); // 短链接 code
  }
}
