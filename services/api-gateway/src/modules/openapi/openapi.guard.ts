import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { OpenApiService } from './openapi.service';

@Injectable()
export class OpenApiGuard implements CanActivate {
  private readonly logger = new Logger(OpenApiGuard.name);

  constructor(private readonly openApiService: OpenApiService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // 获取 API Key
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // 获取客户端 IP
    const clientIp = this.getClientIp(request);

    // 验证 API Key
    const validation = await this.openApiService.validateApiKey(apiKey, clientIp);

    if (!validation.valid) {
      throw new UnauthorizedException(validation.error || 'Invalid API key');
    }

    // 检查速率限制
    const rateLimitStatus = await this.openApiService.checkRateLimit(
      apiKey,
      validation.rateLimit || 1000,
    );

    // 设置速率限制响应头
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitStatus.limit);
    response.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining);
    response.setHeader('X-RateLimit-Reset', rateLimitStatus.reset);

    if (rateLimitStatus.retryAfter) {
      response.setHeader('Retry-After', rateLimitStatus.retryAfter);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: rateLimitStatus.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 将验证结果附加到请求对象
    (request as any).apiKeyContext = {
      apiKeyId: apiKey,
      tenantId: validation.tenantId,
      userId: validation.userId,
      scopes: validation.scopes,
      permissions: validation.permissions,
      rateLimit: validation.rateLimit,
    };

    // 记录 API 使用
    const method = request.method;
    const endpoint = request.path;

    // 设置响应结束时的回调来记录使用情况
    response.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.openApiService.recordUsage({
        apiKeyId: apiKey,
        endpoint,
        method,
        statusCode: response.statusCode,
        responseTime,
        timestamp: new Date(),
        ip: clientIp,
        userAgent: request.headers['user-agent'],
      }).catch(err => this.logger.error(`Failed to record usage: ${err.message}`));
    });

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // 1. 从 Authorization header 获取 (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. 从 X-API-Key header 获取
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }

    // 3. 从查询参数获取 (不推荐，但支持)
    const apiKeyQuery = request.query.api_key;
    if (apiKeyQuery && typeof apiKeyQuery === 'string') {
      return apiKeyQuery;
    }

    return null;
  }

  private getClientIp(request: Request): string {
    // 优先使用代理转发的真实 IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',');
      return ips[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}

// 权限检查装饰器
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPES_KEY = 'required_scopes';
export const RequireScopes = (...scopes: string[]) => SetMetadata(REQUIRED_SCOPES_KEY, scopes);

// 权限 Guard
@Injectable()
export class OpenApiScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKeyContext = request.apiKeyContext;

    if (!apiKeyContext?.scopes) {
      throw new HttpException('Insufficient scopes', HttpStatus.FORBIDDEN);
    }

    const hasAllScopes = requiredScopes.every(scope =>
      apiKeyContext.scopes.includes(scope) || apiKeyContext.scopes.includes('*'),
    );

    if (!hasAllScopes) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Insufficient scopes',
          requiredScopes,
          providedScopes: apiKeyContext.scopes,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
