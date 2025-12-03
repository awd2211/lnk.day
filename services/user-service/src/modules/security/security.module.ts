import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { UserSession } from './entities/user-session.entity';
import { SecurityEvent } from './entities/security-event.entity';
import { BlockedIp } from './entities/blocked-ip.entity';
import { SecuritySettings } from './entities/security-settings.entity';
import { UserSecuritySettings } from './entities/user-security-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSession,
      SecurityEvent,
      BlockedIp,
      SecuritySettings,
      UserSecuritySettings,
    ]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
