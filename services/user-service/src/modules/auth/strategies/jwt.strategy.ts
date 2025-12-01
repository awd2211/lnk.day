import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../../user/user.service';

export interface JwtPayload {
  sub: string;
  email: string;
  type?: 'user' | 'admin';
  role?: string;         // 用于 admin 用户
  teamId?: string;       // 顶层 teamId (兼容旧格式)
  teamRole?: string;     // OWNER | ADMIN | MEMBER | VIEWER
  permissions?: string[];
  scope?: {              // 新的 scope 格式
    level: 'personal' | 'team' | 'platform';
    teamId?: string;
  };
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
  scope?: {
    level: 'personal' | 'team' | 'platform';
    teamId?: string;
  };
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

    // 从 scope.teamId 或顶层 teamId 获取 teamId（优先使用 scope）
    const effectiveTeamId = payload.scope?.teamId || payload.teamId || user.teamId;

    // 返回包含权限信息的用户对象
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      teamId: effectiveTeamId,
      teamRole: payload.teamRole || undefined,
      permissions: payload.permissions || [],
      scope: payload.scope || (effectiveTeamId ? { level: 'personal', teamId: effectiveTeamId } : undefined),
    };
  }
}
