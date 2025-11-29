import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../../user/user.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;         // 用于 admin 用户
  teamId?: string;
  teamRole?: string;     // OWNER | ADMIN | MEMBER | VIEWER
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  teamId?: string;
  teamRole?: string;
  permissions: string[];
  isConsoleAdmin?: boolean;
}

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

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 对于来自 console-service 的 admin 用户 (有 SUPER_ADMIN 或 ADMIN 角色)
    // 即使用户不在 user-service 数据库中也信任它
    if (payload.role && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'].includes(payload.role)) {
      return {
        id: payload.sub,
        email: payload.email,
        teamRole: payload.role,
        permissions: [], // Admin 用户不使用常规权限系统
        isConsoleAdmin: true,
      };
    }

    // 普通用户需要验证存在于数据库中
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // 返回包含权限信息的用户对象
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      teamId: payload.teamId || user.teamId,
      teamRole: payload.teamRole || undefined,
      permissions: payload.permissions || [],
    };
  }
}
