import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记路由为公开访问（跳过 JWT 验证）
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // 检查是否标记为公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check for internal API key authentication
    const request = context.switchToHttp().getRequest();
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (internalApiKey) {
      const authHeader = request.headers.authorization;
      const xInternalKey = request.headers['x-internal-api-key'];

      // Check Bearer token matches internal API key
      if (authHeader === `Bearer ${internalApiKey}`) {
        request.user = {
          sub: 'system',
          email: 'system@internal',
          role: 'INTERNAL',
        };
        return true;
      }

      // Check x-internal-api-key header
      if (xInternalKey === internalApiKey) {
        request.user = {
          sub: 'system',
          email: 'system@internal',
          role: 'INTERNAL',
        };
        return true;
      }
    }

    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
