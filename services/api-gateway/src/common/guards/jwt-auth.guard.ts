import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const secret = this.configService.get('JWT_SECRET', 'your-secret-key');
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
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
