import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from './audit.service';
import { AuditAction, AuditSeverity } from './entities/audit-log.entity';

interface AuditableRequest extends Request {
  user?: { id: string; teamId: string };
  teamId?: string;
}

// Map HTTP methods and paths to audit actions
const AUDIT_MAPPING: Array<{
  method: string;
  pattern: RegExp;
  action: AuditAction;
  resourceType: string;
  getResourceId: (req: Request) => string | undefined;
}> = [
  // Links
  {
    method: 'POST',
    pattern: /^\/api\/links\/?$/,
    action: 'link.created',
    resourceType: 'link',
    getResourceId: () => undefined, // Will be extracted from response
  },
  {
    method: 'PUT',
    pattern: /^\/api\/links\/([^/]+)$/,
    action: 'link.updated',
    resourceType: 'link',
    getResourceId: (req) => req.params.id || req.path.split('/').pop(),
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/links\/([^/]+)$/,
    action: 'link.updated',
    resourceType: 'link',
    getResourceId: (req) => req.params.id || req.path.split('/').pop(),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/links\/([^/]+)$/,
    action: 'link.deleted',
    resourceType: 'link',
    getResourceId: (req) => req.params.id || req.path.split('/').pop(),
  },

  // Users
  {
    method: 'POST',
    pattern: /^\/api\/auth\/login$/,
    action: 'user.login',
    resourceType: 'user',
    getResourceId: () => undefined,
  },
  {
    method: 'POST',
    pattern: /^\/api\/auth\/logout$/,
    action: 'user.logout',
    resourceType: 'user',
    getResourceId: () => undefined,
  },
  {
    method: 'PUT',
    pattern: /^\/api\/users\/([^/]+)\/password$/,
    action: 'user.password_changed',
    resourceType: 'user',
    getResourceId: (req) => req.params.id,
  },

  // Teams
  {
    method: 'POST',
    pattern: /^\/api\/teams\/?$/,
    action: 'team.created',
    resourceType: 'team',
    getResourceId: () => undefined,
  },
  {
    method: 'PUT',
    pattern: /^\/api\/teams\/([^/]+)$/,
    action: 'team.updated',
    resourceType: 'team',
    getResourceId: (req) => req.params.id,
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/teams\/([^/]+)$/,
    action: 'team.deleted',
    resourceType: 'team',
    getResourceId: (req) => req.params.id,
  },
  {
    method: 'POST',
    pattern: /^\/api\/teams\/([^/]+)\/members$/,
    action: 'team.member_added',
    resourceType: 'team',
    getResourceId: (req) => req.params.id,
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/teams\/([^/]+)\/members\/([^/]+)$/,
    action: 'team.member_removed',
    resourceType: 'team',
    getResourceId: (req) => req.params.id,
  },

  // API Keys
  {
    method: 'POST',
    pattern: /^\/api\/api-keys\/?$/,
    action: 'api_key.created',
    resourceType: 'api_key',
    getResourceId: () => undefined,
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/api-keys\/([^/]+)$/,
    action: 'api_key.revoked',
    resourceType: 'api_key',
    getResourceId: (req) => req.params.id,
  },

  // Domains
  {
    method: 'POST',
    pattern: /^\/api\/domains\/?$/,
    action: 'domain.added',
    resourceType: 'domain',
    getResourceId: () => undefined,
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/domains\/([^/]+)$/,
    action: 'domain.removed',
    resourceType: 'domain',
    getResourceId: (req) => req.params.id,
  },
  {
    method: 'POST',
    pattern: /^\/api\/domains\/([^/]+)\/verify$/,
    action: 'domain.verified',
    resourceType: 'domain',
    getResourceId: (req) => req.params.id,
  },

  // Webhooks
  {
    method: 'POST',
    pattern: /^\/api\/webhooks\/?$/,
    action: 'webhook.created',
    resourceType: 'webhook',
    getResourceId: () => undefined,
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/webhooks\/([^/]+)$/,
    action: 'webhook.deleted',
    resourceType: 'webhook',
    getResourceId: (req) => req.params.id,
  },

  // Integrations
  {
    method: 'POST',
    pattern: /^\/api\/integrations\/([^/]+)\/connect$/,
    action: 'integration.connected',
    resourceType: 'integration',
    getResourceId: (req) => req.params.id,
  },
  {
    method: 'POST',
    pattern: /^\/api\/integrations\/([^/]+)\/disconnect$/,
    action: 'integration.disconnected',
    resourceType: 'integration',
    getResourceId: (req) => req.params.id,
  },

  // Security
  {
    method: 'POST',
    pattern: /^\/api\/security\/2fa\/enable$/,
    action: 'security.2fa_enabled',
    resourceType: 'user',
    getResourceId: () => undefined,
  },
  {
    method: 'POST',
    pattern: /^\/api\/security\/2fa\/disable$/,
    action: 'security.2fa_disabled',
    resourceType: 'user',
    getResourceId: () => undefined,
  },
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, path, body, user, headers } = request;
    const startTime = Date.now();

    // Find matching audit mapping
    const mapping = AUDIT_MAPPING.find(
      (m) => m.method === method && m.pattern.test(path),
    );

    if (!mapping) {
      return next.handle();
    }

    const teamId = user?.teamId || headers['x-team-id'] as string;
    const userId = user?.id || headers['x-user-id'] as string;

    if (!teamId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const resourceId = mapping.getResourceId(request) || responseBody?.id;
          const duration = Date.now() - startTime;

          await this.auditService.log({
            teamId,
            userId,
            action: mapping.action,
            resourceType: mapping.resourceType,
            resourceId,
            details: {
              method,
              path,
              statusCode: response.statusCode,
              duration,
              body: this.sanitizeBody(body),
              responseId: responseBody?.id,
            },
            ipAddress: this.getClientIp(request),
            userAgent: headers['user-agent'] as string,
          });
        } catch (error) {
          this.logger.error(`Failed to create audit log: ${error.message}`);
        }
      }),
      catchError(async (error) => {
        // Log failed requests too
        try {
          await this.auditService.log({
            teamId,
            userId,
            action: mapping.action,
            severity: 'error',
            resourceType: mapping.resourceType,
            resourceId: mapping.getResourceId(request),
            details: {
              method,
              path,
              error: error.message,
              statusCode: error.status || 500,
              body: this.sanitizeBody(body),
            },
            ipAddress: this.getClientIp(request),
            userAgent: headers['user-agent'] as string,
          });
        } catch (auditError) {
          this.logger.error(`Failed to create error audit log: ${auditError.message}`);
        }

        throw error;
      }),
    );
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || '';
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
      'credentials',
      'privateKey',
    ];

    const sanitized = { ...body };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
