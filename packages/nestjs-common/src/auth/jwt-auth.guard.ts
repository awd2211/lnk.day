import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY, Public } from '../guards/decorators';

// 重新导出以保持向后兼容
export { IS_PUBLIC_KEY, Public };

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 创建自己的 Reflector 实例，因为 Reflector 在非根模块中可能不可用
  private readonly reflector = new Reflector();

  constructor(private configService: ConfigService) {
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
          id: 'system',
          sub: 'system',
          email: 'system@internal',
          type: 'admin',
          scope: { level: 'platform' },
          role: 'INTERNAL',
          permissions: [],
        };
        return true;
      }

      // Check x-internal-api-key header
      if (xInternalKey === internalApiKey) {
        request.user = {
          id: 'system',
          sub: 'system',
          email: 'system@internal',
          type: 'admin',
          scope: { level: 'platform' },
          role: 'INTERNAL',
          permissions: [],
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
