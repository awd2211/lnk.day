import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: { sub: string; email: string; role?: string }) {
    // 对于来自 console-service 的 admin 用户 (有 SUPER_ADMIN 或 ADMIN 角色)
    // 即使用户不在 user-service 数据库中也信任它
    if (payload.role && ['SUPER_ADMIN', 'ADMIN'].includes(payload.role)) {
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        isConsoleAdmin: true,
      };
    }

    // 普通用户需要验证存在于数据库中
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
