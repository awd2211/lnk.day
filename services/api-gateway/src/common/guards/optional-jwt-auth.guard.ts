import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // No auth header - allow request to continue (route-level auth check will handle it)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.substring(7);

    try {
      const secret = this.configService.get('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      const payload = jwt.verify(token, secret) as any;

      // Attach user info to request
      request.user = {
        id: payload.sub || payload.userId,
        email: payload.email,
        roles: payload.roles || [],
      };

      // Set headers for downstream services
      request.headers['x-user-id'] = request.user.id;
      request.headers['x-user-email'] = request.user.email;

      return true;
    } catch (error: any) {
      // Invalid token - allow request to continue but don't set user
      // Route-level auth check will handle unauthorized access
      return true;
    }
  }
}
