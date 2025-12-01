import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { UserSession } from './entities/user-session.entity';
import { SecurityEvent } from './entities/security-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession, SecurityEvent])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
