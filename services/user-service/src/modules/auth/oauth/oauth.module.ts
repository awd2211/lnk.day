import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OAuthAccount } from './oauth-account.entity';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { UserModule } from '../../user/user.module';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthAccount]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
          },
        };
      },
    }),
    forwardRef(() => UserModule),
    SecurityModule,
  ],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
