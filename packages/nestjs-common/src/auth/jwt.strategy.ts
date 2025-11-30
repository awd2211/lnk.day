import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnifiedJwtPayload,
  AuthenticatedUser,
  JwtPayload,
  TeamRole,
  AdminRole,
} from './jwt.types';
import { TEAM_ROLE_PERMISSIONS, ADMIN_ROLE_PERMISSIONS } from '../permissions';

/**
 * JWT 验证策略
 *
 * 支持两种 JWT 格式：
 * 1. 新版统一格式（UnifiedJwtPayload）- type, scope 字段
 * 2. 旧版格式（JwtPayload）- role, teamRole 字段（向后兼容）
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: UnifiedJwtPayload | JwtPayload): Promise<AuthenticatedUser> {
    // 检查是否是新版统一格式
    if ('type' in payload && 'scope' in payload) {
      return this.validateUnifiedPayload(payload as UnifiedJwtPayload);
    }

    // 旧版格式（向后兼容）
    return this.validateLegacyPayload(payload as JwtPayload);
  }

  /**
   * 验证新版统一格式的 JWT
   */
  private validateUnifiedPayload(payload: UnifiedJwtPayload): AuthenticatedUser {
    return {
      ...payload,
      id: payload.sub,
    };
  }

  /**
   * 验证旧版格式的 JWT（向后兼容）
   * @deprecated 将在未来版本移除
   */
  private validateLegacyPayload(payload: JwtPayload): AuthenticatedUser {
    // 检查是否是控制台管理员（旧格式使用 role 字段）
    if (
      payload.role &&
      ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'].includes(payload.role)
    ) {
      // 转换为新格式
      return {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        type: 'admin',
        scope: { level: 'platform' },
        role: payload.role,
        permissions: ADMIN_ROLE_PERMISSIONS[payload.role] || [],
      };
    }

    // 普通用户（旧格式）
    const role = payload.teamRole || TeamRole.MEMBER;
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      type: 'user',
      scope: {
        level: payload.teamId ? 'team' : 'personal',
        teamId: payload.teamId || payload.sub,
      },
      role,
      permissions: payload.permissions || TEAM_ROLE_PERMISSIONS[role] || [],
    };
  }
}
