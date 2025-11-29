import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { TimeoutConfig, getTimeout } from './timeout.constants';

export const TIMEOUT_KEY = 'timeout';

/**
 * 设置自定义超时时间的装饰器
 * @param milliseconds 超时毫秒数
 */
export const Timeout = (milliseconds: number) =>
  SetMetadata(TIMEOUT_KEY, milliseconds);

/**
 * 全局超时拦截器
 * 为所有请求添加统一的超时控制
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否有自定义超时设置
    const customTimeout = this.reflector.getAllAndOverride<number>(
      TIMEOUT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const timeoutMs = customTimeout ?? getTimeout('API');

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timeout after ${timeoutMs}ms`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
