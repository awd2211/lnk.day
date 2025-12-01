import { Module, DynamicModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions as NestJwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtModuleOptions } from './jwt.types';

// 移除 @Global() 以避免与 ScheduleModule 的 Reflector 依赖冲突
@Module({})
export class AuthModule {
  /**
   * 注册 Auth 模块
   * 使用环境变量中的 JWT_SECRET 和 JWT_EXPIRES_IN
   */
  static register(options?: JwtModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (
            configService: ConfigService,
          ): Promise<NestJwtModuleOptions> => ({
            secret: options?.secret || configService.get('JWT_SECRET'),
            signOptions: {
              expiresIn:
                options?.expiresIn || configService.get('JWT_EXPIRES_IN', '8h'),
            },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [JwtStrategy, JwtAuthGuard],
      exports: [JwtStrategy, JwtAuthGuard, JwtModule, PassportModule],
    };
  }

  /**
   * 仅用于 JWT 验证的轻量级模块
   * 适用于不需要签发 token 的服务
   */
  static forValidation(): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        ConfigModule,
      ],
      providers: [JwtStrategy, JwtAuthGuard],
      exports: [JwtStrategy, JwtAuthGuard, PassportModule],
    };
  }
}
