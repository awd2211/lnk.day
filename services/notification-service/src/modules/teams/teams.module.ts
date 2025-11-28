import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TeamsInstallation } from './entities/teams-installation.entity';
import { TeamsService } from './teams.service';
import { TeamsInstallationService } from './teams-installation.service';
import { TeamsController } from './teams.controller';
import { TeamsProcessor } from './teams.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamsInstallation]),
    BullModule.registerQueue({
      name: 'teams',
    }),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsInstallationService, TeamsProcessor],
  exports: [TeamsService, TeamsInstallationService],
})
export class TeamsModule {}
