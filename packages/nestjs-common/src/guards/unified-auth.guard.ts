import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { UnifiedJwtPayload, AuthenticatedUser } from '../auth/jwt.types';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * 内部 API 用户对象
 */
const INTERNAL_API_USER: AuthenticatedUser = {
  id: 'system',
  sub: 'system',
  email: 'system@internal',
  type: 'admin',
  scope: { level: 'platform' },
  role: 'INTERNAL' as any,
  permissions: [],
};

/**
 * Redis 服务接口（可选依赖）
 */
export interface IRedisService {
  get(key: string): Promise<string | null>;
}

/**
 * 统一认证守卫配置
 */
export interface UnifiedAuthGuardOptions {
  /** JWT 密钥 */
  jwtSecret: string;
  /** 是否启用权限版本检查 */
  enablePermissionVersion?: boolean;
}

/**
 * 统一认证守卫
 *
 * 功能：
 * 1. 验证 JWT Token
 * 2. 支持普通用户和平台管理员两种类型
 * 3. 可选的权限版本检查（用于实时失效）
 * 4. 支持 @Public() 装饰器跳过认证
 *
 * 使用方式：
 * ```typescript
 * // 在 Controller 或方法上使用
 * @UseGuards(UnifiedAuthGuard)
 * @Controller('links')
 * export class LinkController {}
 * ```
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly reflector = new Reflector();
  private jwtSecret: string;

  constructor(
    @Optional() @Inject('JWT_SECRET') jwtSecret?: string,
    @Optional() @Inject('REDIS_SERVICE') private readonly redisService?: IRedisService,
  ) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || '';
  }

  /**
   * 设置 JWT 密钥（用于动态配置）
   */
  setJwtSecret(secret: string): void {
    this.jwtSecret = secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否标记为公开访问
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 检查内部 API key 认证
    const internalApiKey = process.env.INTERNAL_API_KEY;
    if (internalApiKey) {
      const authHeader = request.headers.authorization;
      const xInternalKey = request.headers['x-internal-api-key'];

      // Check Bearer token matches internal API key
      if (authHeader === `Bearer ${internalApiKey}`) {
        request.user = { ...INTERNAL_API_USER };
        return true;
      }

      // Check x-internal-api-key header
      if (xInternalKey === internalApiKey) {
        request.user = { ...INTERNAL_API_USER };
        return true;
      }
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    try {
      // 验证 JWT
      const payload = this.verifyToken(token) as UnifiedJwtPayload;

      // 检查权限版本（如果启用）
      if (payload.pv && this.redisService) {
        await this.checkPermissionVersion(payload);
      }

      // 构建认证用户对象
      const user: AuthenticatedUser = {
        ...payload,
        id: payload.sub,
      };

      // 附加到请求对象
      request.user = user;

      // 设置下游服务可能需要的 headers
      request.headers['x-user-id'] = user.id;
      request.headers['x-user-email'] = user.email;
      request.headers['x-user-type'] = user.type;
      if (user.scope?.teamId) {
        request.headers['x-team-id'] = user.scope.teamId;
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('认证令牌已过期');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('无效的认证令牌');
      }
      throw new UnauthorizedException('认证失败');
    }
  }

  /**
   * 从请求中提取 Token
   */
  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * 验证 Token
   */
  private verifyToken(token: string): UnifiedJwtPayload {
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
    return jwt.verify(token, this.jwtSecret) as UnifiedJwtPayload;
  }

  /**
   * 检查权限版本
   * 如果用户的权限已被更新，旧 token 将失效
   */
  private async checkPermissionVersion(payload: UnifiedJwtPayload): Promise<void> {
    if (!this.redisService || !payload.pv) {
      return;
    }

    const currentVersion = await this.redisService.get(`pv:${payload.sub}`);
    if (currentVersion && payload.pv < parseInt(currentVersion, 10)) {
      throw new UnauthorizedException('权限已变更，请重新登录');
    }
  }
}

/**
 * 创建工厂函数，用于模块中注册
 */
export function createUnifiedAuthGuard(options: UnifiedAuthGuardOptions) {
  return {
    provide: UnifiedAuthGuard,
    useFactory: (redisService?: IRedisService) => {
      const guard = new UnifiedAuthGuard(options.jwtSecret, redisService);
      return guard;
    },
    inject: [{ token: 'REDIS_SERVICE', optional: true }],
  };
}
