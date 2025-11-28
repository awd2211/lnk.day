import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { UserConsent } from './entities/user-consent.entity';
import { DataRequest } from './entities/data-request.entity';
import { User } from '../user/entities/user.entity';
import { TeamMember } from '../team/entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserConsent, DataRequest, User, TeamMember]),
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
