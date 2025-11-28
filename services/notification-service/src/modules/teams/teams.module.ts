import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamsProcessor } from './teams.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'teams',
    }),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsProcessor],
  exports: [TeamsService],
})
export class TeamsModule {}
