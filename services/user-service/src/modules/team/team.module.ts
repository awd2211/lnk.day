import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { TeamController } from './team.controller';
import { InvitationController } from './invitation.controller';
import { RoleController } from './role.controller';
import { TeamService } from './team.service';
import { InvitationService } from './invitation.service';
import { RoleService } from './role.service';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { CustomRole } from './entities/custom-role.entity';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { InvitationCleanupTask } from './tasks/invitation-cleanup.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, TeamInvitation, CustomRole, User]),
    forwardRef(() => UserModule),
    HttpModule,
  ],
  controllers: [TeamController, InvitationController, RoleController],
  providers: [TeamService, InvitationService, RoleService, InvitationCleanupTask],
  exports: [TeamService, InvitationService, RoleService],
})
export class TeamModule {}
