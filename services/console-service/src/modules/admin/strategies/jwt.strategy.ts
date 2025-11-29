import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../admin.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
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

  async validate(payload: { sub: string; email: string; role?: string }) {
    // 允许来自 user-service 的用户 token（role 可选）
    // 也允许 console-service 自己的 admin 用户
    if (payload.role) {
      // 来自 user-service 的 token，直接信任
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    }

    // 尝试查找本地 admin 用户
    try {
      const admin = await this.adminService.findOne(payload.sub);
      if (admin && admin.active) {
        return admin;
      }
    } catch {
      // 如果找不到 admin，返回基本用户信息
    }

    // 返回从 token 中提取的用户信息
    return {
      id: payload.sub,
      email: payload.email,
      role: 'user',
    };
  }
}
