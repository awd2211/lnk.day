import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // No auth header - allow request to continue (route-level auth check will handle it)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.debug(`No auth header for ${request.path}`);
      return true;
    }

    const token = authHeader.substring(7);

    try {
      const secret = this.configService.get('JWT_SECRET');
      if (!secret) {
        this.logger.error('JWT_SECRET not configured');
        throw new Error('JWT_SECRET environment variable is required');
      }
      const payload = jwt.verify(token, secret) as any;

      // Attach user info to request (including team context from JWT scope)
      request.user = {
        id: payload.sub || payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        teamId: payload.scope?.teamId || payload.teamId, // Extract from scope or legacy field
        teamRole: payload.scope?.teamRole || payload.teamRole,
        permissions: payload.permissions || [],
      };

      // Set headers for downstream services (from JWT, not client headers)
      request.headers['x-user-id'] = request.user.id;
      request.headers['x-user-email'] = request.user.email;
      if (request.user.teamId) {
        request.headers['x-team-id'] = request.user.teamId;
      }

      this.logger.debug(`User authenticated: ${request.user.email}`);
      return true;
    } catch (error: any) {
      // Invalid token - allow request to continue but don't set user
      // Route-level auth check will handle unauthorized access
      this.logger.warn(`Token verification failed: ${error.message}`);
      return true;
    }
  }
}
