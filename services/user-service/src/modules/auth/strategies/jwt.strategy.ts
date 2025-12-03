import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnifiedJwtPayload,
  AuthenticatedUser,
  AdminRole,
} from '@lnk/nestjs-common';

import { UserService } from '../../user/user.service';

/**
 * JWT 验证策略 (user-service)
 *
 * 此策略扩展了 @lnk/nestjs-common 的基础策略，增加了：
 * - 普通用户需验证存在于数据库中
 * - 管理员用户直接信任 JWT（来自 console-service）
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.get('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: UnifiedJwtPayload): Promise<AuthenticatedUser> {
    // 管理员用户（来自 console-service）直接信任
    if (this.isAdminUser(payload)) {
      return {
        ...payload,
        id: payload.sub,
      };
    }

    // 普通用户需要验证存在于数据库中
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // 返回认证用户对象
    return {
      ...payload,
      id: user.id,
      name: user.name,
    };
  }

  /**
   * 检查是否为管理员用户
   */
  private isAdminUser(payload: UnifiedJwtPayload): boolean {
    if (payload.type === 'admin') {
      return true;
    }
    if (
      payload.role &&
      [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.OPERATOR].includes(
        payload.role as AdminRole,
      )
    ) {
      return true;
    }
    return false;
  }
}
