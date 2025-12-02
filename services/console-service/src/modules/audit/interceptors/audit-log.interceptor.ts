import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { Request } from 'express';
import { AuditService } from '../audit.service';
import { AUDIT_LOG_KEY, AuditLogOptions } from '../decorators/audit-log.decorator';
import { ActorType, AuditStatus } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // 如果没有 @AuditLog 装饰器，直接执行
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const startTime = Date.now();
    const args = context.getArgs();

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.logAudit(auditOptions, request, user, args, result, AuditStatus.SUCCESS);
        } catch (error: any) {
          this.logger.error(`Failed to create audit log: ${error.message}`);
        }
      }),
      catchError(async (error) => {
        try {
          await this.logAudit(
            auditOptions,
            request,
            user,
            args,
            null,
            AuditStatus.FAILED,
            error.message,
          );
        } catch (logError: any) {
          this.logger.error(`Failed to create audit log: ${logError.message}`);
        }
        throw error;
      }),
    );
  }

  private async logAudit(
    options: AuditLogOptions,
    request: Request,
    user: any,
    args: any[],
    result: any,
    status: AuditStatus,
    errorMessage?: string,
  ): Promise<void> {
    // 获取操作者信息
    // console-service 的所有操作者都是管理员
    const isAdmin = user?.type === 'admin' ||
                    user?.role === 'SUPER_ADMIN' ||
                    user?.role?.startsWith?.('ADMIN') ||
                    (user?.customRoleId && user?.permissions?.some?.((p: string) => p.startsWith('admin:')));
    const actorType = isAdmin ? ActorType.ADMIN : ActorType.USER;
    const actorId = user?.sub || user?.id;
    const actorName = user?.name || user?.email || 'Unknown';

    // 获取目标信息
    let targetId: string | undefined;
    let targetName: string | undefined;

    // 从路由参数获取目标ID
    if (options.targetIdParam) {
      targetId = request.params[options.targetIdParam];
    } else if (request.params.id) {
      targetId = request.params.id;
    }

    // 从结果或函数获取目标信息
    if (options.getTarget && result) {
      const targetInfo = options.getTarget(result, args);
      if (targetInfo) {
        targetId = targetInfo.id || targetId;
        targetName = targetInfo.name;
      }
    }

    // 获取详情
    let details: Record<string, any> = {};

    if (options.getDetails) {
      details = options.getDetails(args, result);
    } else if (options.detailFields && request.body) {
      for (const field of options.detailFields) {
        if (request.body[field] !== undefined) {
          details[field] = request.body[field];
        }
      }
    }

    // 如果需要记录请求体
    if (options.logRequestBody && request.body) {
      const body = { ...request.body };
      // 移除敏感字段
      const excludeFields = options.excludeFields || ['password', 'token', 'secret', 'apiKey', 'accessToken'];
      for (const field of excludeFields) {
        delete body[field];
      }
      details.requestBody = body;
    }

    // 添加请求方法和路径
    details.method = request.method;
    details.path = request.path;

    // 获取IP地址
    const ipAddress = this.getClientIp(request);

    // 创建审计日志
    await this.auditService.log(
      options.action,
      actorType,
      actorId,
      actorName,
      {
        targetType: options.targetType,
        targetId,
        targetName,
        details,
        ipAddress,
        userAgent: request.headers['user-agent'],
        status,
        errorMessage,
      },
    );

    this.logger.debug(
      `Audit: ${options.action} by ${actorName} on ${options.targetType || 'N/A'}:${targetId || 'N/A'} - ${status}`,
    );
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips?.trim() || '';
    }
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] || '' : realIp;
    }
    return request.ip || request.socket.remoteAddress || '';
  }
}
