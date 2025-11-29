import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Permission } from '@lnk/nestjs-common';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;         // 用于 admin 用户
  teamId?: string;
  teamRole?: string;     // OWNER | ADMIN | MEMBER | VIEWER
  permissions?: Permission[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  teamId?: string;
  teamRole?: string;
  permissions: Permission[];
  isConsoleAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 对于 console-service 的 admin 用户
    if (payload.role && ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'].includes(payload.role)) {
      return {
        id: payload.sub,
        email: payload.email,
        teamRole: payload.role,
        permissions: [], // Admin 用户拥有所有权限
        isConsoleAdmin: true,
      };
    }

    // 普通用户 - 从 JWT 中提取权限
    return {
      id: payload.sub,
      email: payload.email,
      teamId: payload.teamId,
      teamRole: payload.teamRole,
      permissions: (payload.permissions || []) as Permission[],
    };
  }
}
