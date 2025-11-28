import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeamController } from './team.controller';
import { InvitationController } from './invitation.controller';
import { TeamService } from './team.service';
import { InvitationService } from './invitation.service';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { InvitationCleanupTask } from './tasks/invitation-cleanup.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, TeamInvitation, User]),
    forwardRef(() => UserModule),
  ],
  controllers: [TeamController, InvitationController],
  providers: [TeamService, InvitationService, InvitationCleanupTask],
  exports: [TeamService, InvitationService],
})
export class TeamModule {}
