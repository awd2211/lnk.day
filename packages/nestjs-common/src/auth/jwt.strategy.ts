import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from './jwt.types';
import { Permission } from '../permissions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 控制台管理员
    if (
      payload.role &&
      ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'].includes(payload.role)
    ) {
      return {
        id: payload.sub,
        email: payload.email,
        teamRole: payload.role,
        permissions: [],
        isConsoleAdmin: true,
      };
    }

    // 普通用户
    return {
      id: payload.sub,
      email: payload.email,
      teamId: payload.teamId,
      teamRole: payload.teamRole,
      permissions: (payload.permissions || []) as Permission[],
    };
  }
}
