import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CampaignCollaborator,
  CampaignComment,
  CampaignActivityLog,
} from './collaboration.entity';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CampaignCollaborator,
      CampaignComment,
      CampaignActivityLog,
    ]),
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
